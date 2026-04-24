import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PayuService } from '../payu/payu.service';
import type { PayuLaunchPayload } from '../payu/payu.service';
import { PayGlocalService } from '../payglocal/payglocal.service';
import type { PayGlocalLaunchPayload } from '../payglocal/payglocal.service';
import {
  IncreffService,
  normaliseCity,
  shouldFulfilViaIncreff,
} from '../increff/increff.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { buildAdjustmentEmailHtml } from './templates/adjustment-email';
import {
  buildOrderConfirmationEmailHtml,
  buildAdminOrderNotificationHtml,
} from './templates/order-confirmation-email';
import type { Offer, Prisma, Product, ProductVariation } from '@prisma/client';

type ProductWithRelations = Product & {
  variations: ProductVariation[];
  offers: Offer[];
  primaryOffer: Offer | null;
};

interface ComputedOrderLine {
  productId: string;
  variationId: string | null;
  productName: string;
  variationName: string | null;
  sku: string | null;
  fnsku: string | null;
  barCode: string | null;
  image: string | null;
  quantity: number;
  paidQty: number;
  freeQty: number;
  originalPrice: number;
  pricePerItem: number;
  bulkApplied: boolean;
  bulkMinQty: number | null;
  bulkPrice: number | null;
  offerApplied: boolean;
  offerId: number | null;
  offerName: string | null;
  productOfferDiscount: number | null;
  savedAmount: number;
  groupKey: string;
  attributes: Record<string, string>;
  lineTotal: number;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly increff: IncreffService,
    private readonly mail: MailService,
    private readonly payu: PayuService,
    private readonly payglocal: PayGlocalService,
  ) {}

  /** Frontend / backend base URLs used in callback + email links. */
  private get frontendUrl(): string {
    return (
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }
  private get backendUrl(): string {
    // Used for PayU s/f urls — has to be publicly reachable by PayU's
    // servers in production (tunnel in dev).
    return (
      process.env.BACKEND_URL ||
      process.env.API_BASE_URL ||
      'http://localhost:4000/api'
    ).replace(/\/$/, '');
  }

  /** Generate a unique order number: ORD-YYYYMMDD-XXXXX */
  private generateOrderNumber(): string {
    const date = new Date();
    const ymd =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ORD-${ymd}-${rand}`;
  }

  /**
   * Create an order. The client's totals are IGNORED — backend re-prices
   * every line from fresh Product/Offer data, groups them by the product's
   * configured ignore-attributes, applies bulk/offer, and writes one
   * OrderItem row per line so invoices / admin views render without ever
   * joining back to the catalogue (which can change post-order).
   *
   * Invoice number is NOT generated here — it's issued only once the
   * payment callback confirms success (see generateInvoiceNumber).
   */
  async create(dto: CreateOrderDto, countryCode?: string) {
    const orderNumber = this.generateOrderNumber();
    const normalisedShippingCity = normaliseCity(dto.shippingAddress?.city);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // --- 1. Resolve country pricing snapshot --------------------------
    const countryPricing = countryCode
      ? await this.prisma.countryPricing.findUnique({
          where: { code: countryCode },
        })
      : null;
    const currency = countryPricing?.currency ?? 'INR';
    const currencySymbol = countryPricing?.currencySymbol ?? '₹';
    const conversionRate =
      (countryPricing?.conversionRate ?? 1) *
      (countryPricing?.multiplier ?? 1);

    // --- 2. Fetch catalogue for every product in the order -----------
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variations: true, offers: true, primaryOffer: true },
    });
    const productMap = new Map(
      products.map((p) => [p.id, p as ProductWithRelations]),
    );

    // --- 3. Build computed lines with proper grouping ----------------
    const linesCtx = dto.items.map((item, idx) => {
      const product = productMap.get(item.productId);
      const variation = item.variationId && product
        ? product.variations.find((v) => v.id === item.variationId) ?? null
        : null;
      const rawPrice = variation?.price ?? product?.price ?? '0';
      const originalPrice = parseFloat(rawPrice) * conversionRate;
      const attrs = (item.attributes ?? {}) as Record<string, string>;

      // Mirrors cart-service: Color is the single ignored attribute when
      // deciding which cart lines share an offer / bulk bucket.
      const ignore = new Set(['color']);
      const nonIgnored = Object.entries(attrs)
        .filter(([k]) => !ignore.has(k.toLowerCase()))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('|');
      const groupKey = `${item.productId}::${nonIgnored}`;

      return {
        idx,
        dto: item,
        attrs,
        product,
        variation,
        originalPrice,
        groupKey,
      };
    });

    // Per-group totals + free distribution
    const groupMap = new Map<string, typeof linesCtx>();
    for (const line of linesCtx) {
      const arr = groupMap.get(line.groupKey);
      if (arr) arr.push(line);
      else groupMap.set(line.groupKey, [line]);
    }

    const freeQtyPerLineIdx = new Map<number, number>();
    interface GroupState {
      offerApplied: boolean;
      offerId: number | null;
      offerName: string | null;
      offerStart: number;
      offerEnd: number;
      bulkApplied: boolean;
      bulkPrice: number | null;
      bulkMinQty: number | null;
      totalQty: number;
    }
    const groupState = new Map<string, GroupState>();

    for (const [groupKey, groupLines] of groupMap) {
      const product = groupLines[0].product;
      const totalQty = groupLines.reduce((s, l) => s + l.dto.quantity, 0);

      // Prefer multi-tier `bulkPricingTiers` over flat bulkPrice/minQuantity
      // (admin UI under the hood). Highest-qty tier the shopper has crossed
      // wins; fall back to the legacy single-tier columns.
      const tiers = Array.isArray(product?.bulkPricingTiers)
        ? (product!.bulkPricingTiers as any[])
            .map((t) => ({
              qty: Number(t?.qty),
              unitPrice: Number(t?.unitPrice),
            }))
            .filter(
              (t) =>
                Number.isFinite(t.qty) && Number.isFinite(t.unitPrice),
            )
            .sort((a, b) => b.qty - a.qty)
        : [];
      const applicableTier = tiers.find((t) => totalQty >= t.qty);

      let bulkPrice: number | null = null;
      let bulkMinQty: number | null = null;
      let bulkApplied = false;

      if (applicableTier) {
        bulkPrice = applicableTier.unitPrice * conversionRate;
        bulkMinQty = applicableTier.qty;
        bulkApplied = true;
      } else if (product?.bulkPrice && product?.minQuantity) {
        const flatPrice = parseFloat(product.bulkPrice) * conversionRate;
        const flatMin = parseInt(product.minQuantity, 10);
        if (flatPrice > 0 && flatMin > 0) {
          bulkPrice = flatPrice;
          bulkMinQty = flatMin;
          bulkApplied = totalQty >= flatMin;
        }
      }

      let offerApplied = false;
      let offerId: number | null = null;
      let offerName: string | null = null;
      let offerStart = 0;
      let offerEnd = 0;

      if (product && !bulkApplied) {
        const seen = new Set<number>();
        const allOffers: Offer[] = [];
        if (product.primaryOffer) {
          seen.add(product.primaryOffer.id);
          allOffers.push(product.primaryOffer);
        }
        for (const o of product.offers) {
          if (!seen.has(o.id)) {
            seen.add(o.id);
            allOffers.push(o);
          }
        }
        // Accept both canonical RANGE_FREE and legacy rangeBuyXGetY; read
        // either `{from,to,freeCount}` or `{start,end,free}` payload shapes.
        const rangeOffer = allOffers.find((o) => {
          const t = String(o.discountType ?? '').toUpperCase();
          return (
            (t === 'RANGE_FREE' || t === 'RANGEBUYXGETY') &&
            o.active &&
            o.deleted === 0
          );
        });
        if (rangeOffer) {
          const dv = (rangeOffer.discountValue ?? {}) as Record<string, unknown>;
          const num = (...keys: string[]): number | undefined => {
            for (const k of keys) {
              const v = dv[k];
              const n = typeof v === 'string' ? Number(v) : (v as number);
              if (typeof n === 'number' && Number.isFinite(n)) return n;
            }
            return undefined;
          };
          offerStart = num('from', 'start', 'minQty') ?? 0;
          const rawEnd = num('to', 'end', 'maxQty');
          offerEnd = rawEnd && rawEnd > 0 ? rawEnd : Number.MAX_SAFE_INTEGER;
          const freeConf = num('freeCount', 'free', 'count') ?? 0;
          offerId = rangeOffer.id;
          offerName = rangeOffer.name;

          if (
            totalQty >= offerStart &&
            totalQty <= offerEnd &&
            freeConf > 0
          ) {
            offerApplied = true;
            type Unit = { idx: number; price: number; createdAt: number };
            const units: Unit[] = [];
            for (const line of groupLines) {
              for (let i = 0; i < line.dto.quantity; i++) {
                units.push({
                  idx: line.idx,
                  price: line.originalPrice,
                  createdAt: line.idx, // DTO order acts as insertion order
                });
              }
            }
            units.sort((a, b) => {
              if (a.price !== b.price) return a.price - b.price;
              return b.createdAt - a.createdAt;
            });
            const freeCount = Math.min(freeConf, units.length);
            for (let i = 0; i < freeCount; i++) {
              freeQtyPerLineIdx.set(
                units[i].idx,
                (freeQtyPerLineIdx.get(units[i].idx) ?? 0) + 1,
              );
            }
          }
        }
      }

      groupState.set(groupKey, {
        offerApplied,
        offerId,
        offerName,
        offerStart,
        offerEnd,
        bulkApplied,
        bulkPrice,
        bulkMinQty,
        totalQty,
      });
    }

    // --- 4. Emit OrderItem rows with full snapshot -------------------
    const computed: ComputedOrderLine[] = linesCtx.map((line) => {
      const state = groupState.get(line.groupKey)!;
      const freeInThis = freeQtyPerLineIdx.get(line.idx) ?? 0;
      const paidQty = Math.max(0, line.dto.quantity - freeInThis);
      const effectivePrice = state.bulkApplied
        ? (state.bulkPrice as number)
        : line.originalPrice;
      const savedFromBulk = state.bulkApplied
        ? (line.originalPrice - (state.bulkPrice as number)) * line.dto.quantity
        : 0;
      const savedFromFree = freeInThis * line.originalPrice;
      const savedAmount = savedFromBulk + savedFromFree;
      const lineTotal = paidQty * effectivePrice;

      const product = line.product;
      const variation = line.variation;

      return {
        productId: line.dto.productId,
        variationId: line.dto.variationId ?? null,
        productName: product?.name ?? line.dto.name ?? '',
        variationName:
          variation?.name ?? variation?.variationName ?? null,
        sku: variation?.sku ?? product?.sku ?? line.dto.sku ?? null,
        fnsku: null,
        barCode:
          variation?.barCode ??
          product?.barCode ??
          line.dto.barCode ??
          null,
        image:
          (variation?.image && variation.image[0]) ??
          (product?.image && product.image[0]) ??
          line.dto.image ??
          null,
        quantity: line.dto.quantity,
        paidQty,
        freeQty: freeInThis,
        originalPrice: round(line.originalPrice),
        pricePerItem: round(effectivePrice),
        bulkApplied: state.bulkApplied,
        bulkMinQty: state.bulkMinQty,
        bulkPrice:
          state.bulkPrice !== null ? round(state.bulkPrice) : null,
        offerApplied: state.offerApplied,
        offerId: state.offerId,
        offerName: state.offerName,
        productOfferDiscount: state.offerApplied
          ? round(savedFromFree)
          : null,
        savedAmount: round(savedAmount),
        groupKey: line.groupKey,
        attributes: line.attrs,
        lineTotal: round(lineTotal),
      };
    });

    // --- 5. Totals ---------------------------------------------------
    const subtotal = round(
      computed.reduce((s, l) => s + l.originalPrice * l.quantity, 0),
    );
    const itemsTotal = round(computed.reduce((s, l) => s + l.lineTotal, 0));
    const discountAmount = round(subtotal - itemsTotal);
    const shippingCharges = round(dto.shippingCharges ?? 0);
    const promoDiscount = round(dto.discountAmount ?? 0);
    const donationAmount = round(dto.donationAmount ?? 0);
    const totalAmount = round(
      itemsTotal + shippingCharges - promoDiscount + donationAmount,
    );
    const baseTotalAmount =
      conversionRate && conversionRate > 0
        ? round(totalAmount / conversionRate)
        : totalAmount;

    // --- 6. Persist Order + OrderItem rows atomically ----------------
    const order = await this.prisma.orders.create({
      data: {
        userId: dto.userId ?? null,
        userName: dto.userName ?? null,
        userEmail: dto.userEmail ?? null,
        userPhone: dto.userPhone ?? null,
        shippingName: dto.shippingAddress?.name ?? null,
        shippingPhone: dto.shippingAddress?.phone ?? null,
        shippingAddress: dto.shippingAddress?.address ?? null,
        shippingCity:
          normalisedShippingCity || dto.shippingAddress?.city || null,
        shippingState: dto.shippingAddress?.state ?? null,
        shippingPincode: dto.shippingAddress?.pincode ?? null,
        billingName: dto.billingAddress?.name ?? null,
        billingPhone: dto.billingAddress?.phone ?? null,
        billingAddress: dto.billingAddress?.address ?? null,
        billingCity: dto.billingAddress?.city ?? null,
        billingState: dto.billingAddress?.state ?? null,
        billingPincode: dto.billingAddress?.pincode ?? null,
        subtotal,
        shippingCharges,
        taxAmount: dto.taxAmount ?? null,
        discountAmount,
        totalAmount,
        baseTotalAmount,
        paymentCurrency: currency,
        currencySymbol,
        conversionRate,
        paymentMethod: dto.paymentMethod,
        orderNumber,
        promoCode: dto.promoCode ?? null,
        promoDiscount: promoDiscount || null,
        donationAmount: donationAmount || null,
        donationCampaignId: dto.donationCampaignId ?? null,
        note: dto.note ?? null,
        orderBy: dto.orderBy ?? null,
        locationCode: dto.warehouseCode ?? null,
        orderItems: {
          create: computed.map((c) => ({
            productId: c.productId,
            variationId: c.variationId,
            productName: c.productName,
            variationName: c.variationName,
            sku: c.sku,
            fnsku: c.fnsku,
            barCode: c.barCode,
            image: c.image,
            quantity: c.quantity,
            paidQty: c.paidQty,
            freeQty: c.freeQty,
            originalPrice: c.originalPrice,
            pricePerItem: c.pricePerItem,
            bulkApplied: c.bulkApplied,
            bulkMinQty: c.bulkMinQty,
            bulkPrice: c.bulkPrice,
            offerApplied: c.offerApplied,
            offerId: c.offerId,
            offerName: c.offerName,
            productOfferDiscount: c.productOfferDiscount,
            savedAmount: c.savedAmount,
            groupKey: c.groupKey,
            currency,
            currencySymbol,
            attributes: c.attributes,
          })),
        },
      },
      include: { orderItems: true },
    });

    // Fire-and-forget Increff for Bangalore QuickGo orders.
    if (
      shouldFulfilViaIncreff({
        platform: (dto as any).platform,
        shippingCity: dto.shippingAddress?.city,
      })
    ) {
      void this.increff
        .packOrder(order.id)
        .catch((err) =>
          this.logger.error(
            `Increff packorder for ${order.id} failed: ${err instanceof Error ? err.message : err}`,
          ),
        );
    }

    // PayU launch — if the shopper picked PayU we return the form
    // params + action URL so the checkout page can auto-submit a hidden
    // form to PayU. For non-PayU methods (COD etc.) just return the
    // order as-is and the client handles redirect itself.
    if ((dto.paymentMethod as string) === 'PayU') {
      const platform = (dto.orderBy ?? 'wizard').toLowerCase();
      const launch = this.payu.buildLaunchPayload({
        txnid: orderNumber,
        amount: totalAmount,
        productInfo: `Order ${orderNumber}`,
        firstName: (dto.userName ?? dto.shippingAddress?.name ?? 'Customer')
          .split(' ')[0]
          .slice(0, 50),
        email: dto.userEmail ?? 'orders@hecate.in',
        phone: (dto.userPhone ?? dto.shippingAddress?.phone ?? '')
          .toString()
          .replace(/\D/g, '')
          .slice(-10),
        surl: `${this.backendUrl}/payu/success`,
        furl: `${this.backendUrl}/payu/failure`,
        udf1: dto.warehouseCode ?? '',
        udf2: platform, // carried through to webhook so redirect can pick the right theme
      });
      return { ...order, ...launch };
    }

    // PayGlocal launch — international shoppers (non-IND country) pay
    // through PayGlocal. We post to their initiate API with the ALREADY-
    // CONVERTED total in the shopper's currency; PayGlocal does not
    // re-convert. Response gives us a hosted-page URL the frontend
    // redirects to. `paymentCurrency` was stamped onto the order row
    // when we computed the totals above, so it always matches what the
    // shopper saw at checkout time.
    if ((dto.paymentMethod as string) === 'PayGlocal') {
      const platform = (dto.orderBy ?? 'wizard').toLowerCase();
      const nameParts = (dto.userName ?? dto.shippingAddress?.name ?? 'Customer')
        .trim()
        .split(/\s+/);
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || '';
      const currency =
        (order as any).paymentCurrency ??
        (dto as any).paymentCurrency ??
        'INR';
      try {
        const launch: PayGlocalLaunchPayload = await this.payglocal.initiatePayment({
          merchantTxnId: orderNumber,
          amount: totalAmount,
          currency,
          firstName: firstName.slice(0, 50),
          lastName: lastName.slice(0, 50),
          email: dto.userEmail ?? 'orders@hecate.in',
          phone: (dto.userPhone ?? dto.shippingAddress?.phone ?? '').toString(),
          // Shopper returns to the frontend; frontend routes onto
          // /payment-success or /payment-failed based on the status we
          // record from PayGlocal's server-to-server webhook below.
          redirectUrl: `${this.frontendUrl}/payment-success?order_id=${encodeURIComponent(
            orderNumber,
          )}&platform=${platform}`,
          statusUrl: `${this.backendUrl}/payglocal/callback`,
          platform,
        });
        return { ...order, ...launch };
      } catch (err) {
        this.logger.error(
          `PayGlocal launch failed for order ${orderNumber}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        // Don't leak the order as "placed" when we couldn't even start
        // the gateway — bubble the error so the checkout page shows the
        // shopper a retry prompt instead of a misleading success toast.
        throw err;
      }
    }

    return order;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deleted: 0 };
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

    const [orders, total] = await Promise.all([
      this.prisma.orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: { orderItems: true },
      }),
      this.prisma.orders.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id },
      include: { orderItems: true, adjustments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    // Attach a paymentUrl to every adjustment on the way out so the
    // admin + customer dashboards don't have to reconstruct it. We do
    // NOT store the URL in the row because the frontend host is
    // environment-specific — a dev URL baked in at insert time would
    // be wrong on production.
    const frontendBase = (
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
    const adjustments = (order.adjustments ?? []).map((a) => ({
      ...a,
      paymentUrl: `${frontendBase}/pay/adjustment/${a.id}`,
    }));
    return { ...order, adjustments };
  }

  async findForUser(userId: number, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { userId, deleted: 0 };

    const [orders, total] = await Promise.all([
      this.prisma.orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: { orderItems: true },
      }),
      this.prisma.orders.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(dto: UpdateOrderDto) {
    const existing = await this.prisma.orders.findUnique({
      where: { id: dto.id },
    });
    if (!existing) throw new NotFoundException('Order not found');

    const { id, ...updateData } = dto;
    const cleanData: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) cleanData[key] = value;
    }

    return this.prisma.orders.update({
      where: { id },
      data: cleanData,
    });
  }

  async trackOrder(orderNumber: string) {
    if (!orderNumber)
      throw new BadRequestException('orderNumber is required');

    const order = await this.prisma.orders.findUnique({
      where: { orderNumber },
    });
    if (!order) throw new NotFoundException('Order not found');

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      trackingLink: order.trackingLink,
      shippingName: order.shippingName,
      shippingCity: order.shippingCity,
      shippingState: order.shippingState,
    };
  }

  /**
   * Mark an order as paid, generate its invoice number, and flip the
   * shopper's cart lines to `is_buy=true` so they stop appearing in the
   * live cart. Called from the payment gateway callback — the gateway is
   * the source of truth for success, we just finalise our side.
   */
  async markPaid(orderId: number, txnId?: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === 'PAID') return order;

    const invoice = await this.generateInvoiceNumber();

    // Resolve the promo + donation side-effects BEFORE composing the
    // transaction so every row ends up in the same atomic write. We only
    // run these on the *first* transition to PAID — the early-exit above
    // guards against the PayU "double-callback" case (webhook + sync).
    const promoOps = await this.buildPromoUsageOps(order);
    const donationOp = this.buildDonationOp(order);

    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.orders.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          status: 'PROCESSING',
          paymentTxnId: txnId ?? null,
          paymentPaidAt: new Date(),
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          fiscalYear: invoice.fiscalYear,
          invoiceSeq: invoice.seq,
        },
        include: { orderItems: true },
      }),
    ];

    // Flip this user's cart lines to purchased so they disappear from
    // the live cart view. Guard on userId — anonymous orders don't have
    // a cart to flip.
    if (order.userId) {
      ops.push(
        this.prisma.cart.updateMany({
          where: { userId: order.userId, is_buy: false },
          data: { is_buy: true },
        }),
      );
    }

    if (promoOps.length > 0) ops.push(...promoOps);
    if (donationOp) ops.push(donationOp);

    const results = await this.prisma.$transaction(ops);
    return results[0] as Awaited<ReturnType<typeof this.prisma.orders.update>>;
  }

  /**
   * Build the promo-code side-effects for a freshly-paid order: one
   * `PromoUser` row recording the user's usage + amount, plus a bump
   * on the parent `PromoCode.usedCount`. Returns an empty list if the
   * order didn't use a promo, the promo row was deleted, the user
   * already has a row for this (promo, order) pair (re-run safety), or
   * the order is anonymous. Safe to call inside the transaction.
   */
  private async buildPromoUsageOps(
    order: { id: number; userId: number | null; promoCode: string | null; promoDiscount: number | null; subtotal: number | null },
  ): Promise<Prisma.PrismaPromise<unknown>[]> {
    if (!order.promoCode || !order.userId) return [];
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: order.promoCode },
      select: { id: true, deleted: true },
    });
    if (!promo || promo.deleted) return [];

    const existing = await this.prisma.promoUser.findUnique({
      where: {
        promoId_orderId: { promoId: promo.id, orderId: order.id },
      },
      select: { id: true },
    });
    if (existing) return []; // idempotent — never double-count a retry

    return [
      this.prisma.promoUser.create({
        data: {
          promoId: promo.id,
          userId: order.userId,
          orderId: order.id,
          usedCount: 1,
          discountAmount: order.promoDiscount ?? 0,
          subtotal: order.subtotal ?? 0,
        },
      }),
      this.prisma.promoCode.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } },
      }),
    ];
  }

  /**
   * Build the donation-record side-effect for a freshly-paid order:
   * one `UserDonation` row pointing at the campaign the shopper tipped
   * at checkout. Returns null when the order had no donation attached.
   */
  private buildDonationOp(order: {
    id: number;
    userId: number | null;
    userName: string | null;
    shippingName: string | null;
    donationAmount: number | null;
    donationCampaignId: number | null;
  }): Prisma.PrismaPromise<unknown> | null {
    const amount = order.donationAmount ?? 0;
    if (!order.donationCampaignId || amount <= 0) return null;
    return this.prisma.userDonation.create({
      data: {
        userName:
          order.userName ?? order.shippingName ?? 'Anonymous supporter',
        amount,
        donationCampaignId: order.donationCampaignId,
        orderId: order.id,
        userId: order.userId ?? null,
      },
    });
  }

  /**
   * Atomically issue the next invoice number for the current fiscal year.
   * Fiscal year runs April 1 → March 31; the counter resets each April.
   *
   * Format: {MON}-{NNNN}-{FY}  e.g. APR-0001-2026, MAY-0021-2026.
   */
  async generateInvoiceNumber(): Promise<{
    invoiceNumber: string;
    invoiceDate: Date;
    fiscalYear: number;
    seq: number;
  }> {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
    // Indian fiscal year: Apr..Dec share the calendar year; Jan..Mar
    // belong to the previous fiscal year.
    const fiscalYear = month >= 3 ? year : year - 1;

    const seq = await this.prisma.$transaction(async (tx) => {
      const row = await tx.invoiceSequence.upsert({
        where: { fiscalYear },
        update: { lastSeq: { increment: 1 } },
        create: { fiscalYear, lastSeq: 1 },
      });
      return row.lastSeq;
    });

    const monthCode = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ][month];
    const padded = String(seq).padStart(4, '0');
    const invoiceNumber = `${monthCode}-${padded}-${fiscalYear}`;

    return { invoiceNumber, invoiceDate: now, fiscalYear, seq };
  }

  /**
   * Handle a PayU callback (success OR failure). Verifies the response
   * hash so forged webhooks can't flip an unpaid order to PAID, then
   * marks the order paid / failed accordingly and returns the URL the
   * shopper's browser should be redirected to (themed by orderBy).
   *
   * On success: invoice is generated atomically, cart lines flip to
   * `is_buy=true`, and two emails go out (shopper + admin).
   */
  async handlePayuCallback(
    body: Record<string, string>,
    outcome: 'success' | 'failure',
  ): Promise<string> {
    const txnid = body.txnid || body.orderNumber || body.order_id;
    const status = (body.status ?? '').toLowerCase();

    if (!txnid) {
      this.logger.warn('PayU callback without txnid — ignoring');
      return `${this.frontendUrl}/payment-failed`;
    }

    // Adjustment flow: txnid prefixed with ADJ- means this is for an
    // admin-raised additional payment request, not a new order. Verify
    // hash, flip the adjustment to PAID on success, and redirect to
    // the /pay/adjustment/:id page (which will show the "payment
    // received" state) rather than the normal checkout success page.
    if (String(txnid).startsWith('ADJ-')) {
      const hashOk = this.payu.verifyResponseHash(body);
      if (!hashOk) {
        this.logger.error(
          `PayU hash verification FAILED for adjustment txn ${txnid}`,
        );
        return `${this.frontendUrl}/payment-failed?order_id=${encodeURIComponent(String(txnid))}`;
      }
      const adjId = Number(body.udf1 || String(txnid).split('-')[1]);
      if (outcome === 'success' && status === 'success') {
        try {
          await this.markAdjustmentPaid(
            String(txnid),
            body.mihpayid || body.payuMoneyId,
          );
        } catch (err) {
          this.logger.error(
            `markAdjustmentPaid failed for ${txnid}: ${err instanceof Error ? err.message : err}`,
          );
        }
      } else if (Number.isFinite(adjId)) {
        // Failed / cancelled adjustment attempt — distinguish the two
        // so the admin sees the right state on the order detail page.
        const isCancelled =
          status === 'usercancelled' ||
          status === 'user_cancelled' ||
          status === 'cancelled';
        await this.prisma.order_adjustments.update({
          where: { id: adjId },
          data: { status: isCancelled ? 'CANCELLED' : 'PENDING' },
        }).catch((err) =>
          this.logger.warn(
            `Failed to mark adjustment ${adjId} cancelled: ${err instanceof Error ? err.message : err}`,
          ),
        );
      }
      if (!Number.isFinite(adjId)) {
        return `${this.frontendUrl}/payment-failed`;
      }
      const reason =
        outcome === 'success' && status === 'success' ? 'success'
        : (status === 'usercancelled' ||
           status === 'user_cancelled' ||
           status === 'cancelled')
          ? 'cancelled'
          : 'failed';
      return `${this.frontendUrl}/pay/adjustment/${adjId}?status=${reason}`;
    }

    const order = await this.prisma.orders.findUnique({
      where: { orderNumber: String(txnid) },
    });
    if (!order) {
      this.logger.warn(`PayU callback for unknown order ${txnid}`);
      return `${this.frontendUrl}/payment-failed?order_id=${encodeURIComponent(String(txnid))}`;
    }

    const platform = (order.orderBy ?? 'wizard').toLowerCase();
    // Both wizard and quickgo share the themed /payment-success and
    // /payment-failed pages; the `?platform=` query drives colour +
    // icon (Zap+amber for QuickGo, CheckCircle+indigo for Wizard).
    // Having one route keeps the redirect target alive everywhere and
    // avoids maintaining two near-identical page trees.
    const successPath = '/payment-success';
    const failedPath = '/payment-failed';

    // Hash verification. Critical on SUCCESS (otherwise forged success
    // POSTs could flip an unpaid order to PAID), but intentionally soft
    // on FAILURE / CANCEL — the worst a forged failure can do is mark
    // an order FAILED that the shopper was probably going to retry
    // anyway. PayU's test environment is known to omit `hash` on some
    // user-cancel redirects, and that was leaving orders stuck in
    // PENDING even after the shopper clicked Cancel.
    const hashOk = this.payu.verifyResponseHash(body);
    if (outcome === 'success' && !hashOk) {
      this.logger.error(
        `PayU SUCCESS hash verification FAILED for ${txnid} — refusing to mark paid`,
      );
      return `${this.frontendUrl}${failedPath}?order_id=${encodeURIComponent(String(txnid))}&platform=${platform}&reason=failed`;
    }
    if (!hashOk) {
      this.logger.warn(
        `PayU failure callback for ${txnid} arrived without a valid hash — status=${status}. Updating anyway since financial risk is bounded.`,
      );
    }

    if (outcome === 'success' && status === 'success') {
      await this.markPaid(order.id, body.mihpayid || body.payuMoneyId);
      await this.sendOrderConfirmationEmails(order.id).catch((err) =>
        this.logger.error(
          `Order confirmation emails for ${order.id} failed: ${err instanceof Error ? err.message : err}`,
        ),
      );
      return `${this.frontendUrl}${successPath}?order_id=${encodeURIComponent(String(txnid))}&platform=${platform}`;
    }

    // Differentiate the non-success outcomes so admin reporting can
    // separate "user walked away from PayU's page" (CANCELLED) from
    // "bank declined / gateway error" (FAILED). PayU sends slightly
    // different casings/variants for user-cancels — normalise all of
    // them to a single CANCELLED state.
    const normalisedStatus = status
      .replace(/[\s_-]/g, '')
      .toLowerCase();
    const isCancelled =
      normalisedStatus === 'usercancelled' ||
      normalisedStatus === 'cancelled' ||
      normalisedStatus === 'cancel' ||
      body.unmappedstatus === 'userCancelled' ||
      body.unmappedstatus === 'cancelled';
    // When the `outcome` is explicitly "failure" (hit the /payu/failure
    // webhook) but PayU didn't bother sending a `status` field, treat
    // it as FAILED so the order leaves PENDING. Only outcome="success"
    // + status="success" writes PAID (guarded above by hash check).
    const paymentStatus = isCancelled ? 'CANCELLED' : 'FAILED';
    const orderStatusNext = isCancelled ? 'CANCELLED' : 'FAILED';
    const errorMessage =
      body.error_Message ||
      body.error ||
      body.unmappedstatus ||
      status ||
      'Unknown';
    // Rich log so future debugging doesn't have to guess WHY we picked
    // CANCELLED vs FAILED — PayU maps user-cancellations to
    // `status=failure` + `unmappedstatus=userCancelled`, which can look
    // wrong at first glance.
    this.logger.log(
      `PayU ${outcome} for ${txnid}: status="${status}" unmappedstatus="${body.unmappedstatus ?? ''}" → paymentStatus=${paymentStatus}`,
    );

    await this.prisma.orders.update({
      where: { id: order.id },
      data: {
        paymentStatus: paymentStatus as any,
        status: orderStatusNext as any,
        paymentError: errorMessage ? String(errorMessage).slice(0, 500) : null,
      },
    });
    return `${this.frontendUrl}${failedPath}?order_id=${encodeURIComponent(String(txnid))}&platform=${platform}&reason=${encodeURIComponent(isCancelled ? 'cancelled' : 'failed')}`;
  }

  /**
   * Send the post-payment confirmation email to the shopper AND an
   * internal notification to ADMIN_EMAIL. Re-reads the order so it
   * has the fresh invoiceNumber set by `markPaid`.
   */
  async sendOrderConfirmationEmails(orderId: number): Promise<void> {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) return;
    const symbol = order.currencySymbol ?? '₹';
    const platform = (order.orderBy ?? 'wizard').toLowerCase();
    const orderUrl = `${this.frontendUrl}/dashboard/orders`;
    const adminOrderUrl = `${this.frontendUrl}/admin/orders/${order.id}`;

    const tasks: Promise<unknown>[] = [];
    if (order.userEmail) {
      tasks.push(
        this.mail.send({
          to: order.userEmail,
          subject: `Order confirmed — ${order.orderNumber}`,
          html: buildOrderConfirmationEmailHtml({
            shippingName: order.shippingName ?? order.userName,
            orderNumber: order.orderNumber,
            invoiceNumber: order.invoiceNumber,
            totalAmount: Number(order.totalAmount ?? 0),
            currencySymbol: symbol,
            orderUrl,
            supportEmail: this.mail.adminEmail || undefined,
            platform,
          }),
        }),
      );
    }
    const adminEmail = process.env.ADMIN_EMAIL || this.mail.adminEmail;
    if (adminEmail) {
      tasks.push(
        this.mail.send({
          to: adminEmail,
          subject: `New paid order — ${order.orderNumber}`,
          html: buildAdminOrderNotificationHtml({
            orderNumber: order.orderNumber,
            invoiceNumber: order.invoiceNumber,
            totalAmount: Number(order.totalAmount ?? 0),
            currencySymbol: symbol,
            userName: order.userName ?? order.shippingName,
            platform,
            adminOrderUrl,
          }),
        }),
      );
    }
    await Promise.allSettled(tasks);
  }

  /**
   * Ask PayU the source-of-truth status for a pending order and flip
   * our row accordingly. The browser-side webhook isn't 100% reliable
   * — a shopper who clicks Cancel on secure.payu.in and then closes
   * the tab never POSTs back to us, so the order stays PENDING in
   * our DB. The frontend calls this from the payment-failed / order
   * detail pages so the DB catches up the moment the shopper
   * reappears.
   */
  async syncOrderWithPayu(txnid: string) {
    const order = await this.prisma.orders.findUnique({
      where: { orderNumber: txnid },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === 'PAID') {
      return { paymentStatus: 'PAID', message: 'Already paid' };
    }

    const details = await this.payu.verifyTransaction(txnid);
    if (!details) {
      return {
        paymentStatus: order.paymentStatus,
        message: 'Could not reach PayU — state unchanged',
      };
    }

    const rawStatus = String(details.status ?? '').toLowerCase();
    const normalised = rawStatus.replace(/[\s_-]/g, '');
    const isSuccess = normalised === 'success';
    const isCancelled =
      normalised === 'usercancelled' ||
      normalised === 'cancelled' ||
      normalised === 'cancel';

    if (isSuccess) {
      await this.markPaid(
        order.id,
        (details.mihpayid as string) || undefined,
      );
      await this.sendOrderConfirmationEmails(order.id).catch((err) =>
        this.logger.error(
          `Order emails for ${order.id} failed: ${err instanceof Error ? err.message : err}`,
        ),
      );
      return { paymentStatus: 'PAID', message: 'Payment reconciled — paid' };
    }

    const nextPaymentStatus = isCancelled ? 'CANCELLED' : 'FAILED';
    const nextOrderStatus = isCancelled ? 'CANCELLED' : 'FAILED';
    const errorMessage =
      (details.error_Message as string) ||
      (details.error as string) ||
      rawStatus ||
      'Payment not completed';

    await this.prisma.orders.update({
      where: { id: order.id },
      data: {
        paymentStatus: nextPaymentStatus as any,
        status: nextOrderStatus as any,
        paymentError: errorMessage.slice(0, 500),
      },
    });
    return {
      paymentStatus: nextPaymentStatus,
      message: `Payment reconciled — ${nextPaymentStatus.toLowerCase()}`,
    };
  }

  async verifyPayment(payload: any) {
    const orderNumber =
      payload.orderNumber ??
      payload.order_id ??
      payload.txnid ??
      payload.orderId;

    if (!orderNumber)
      throw new BadRequestException('Could not resolve order from payload');

    const order = await this.prisma.orders.findUnique({
      where: { orderNumber: String(orderNumber) },
    });
    if (!order) throw new NotFoundException('Order not found');

    return this.markPaid(order.id, payload.txnid ?? payload.paymentTxnId);
  }

  async verifyPaymentStatus(body: { orderNumber?: string; orderId?: number }) {
    const where: any = {};
    if (body.orderNumber) where.orderNumber = body.orderNumber;
    else if (body.orderId) where.id = body.orderId;
    else throw new BadRequestException('orderNumber or orderId is required');

    const order = await this.prisma.orders.findFirst({ where });
    if (!order) throw new NotFoundException('Order not found');

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      invoiceNumber: order.invoiceNumber,
    };
  }

  async getInvoice(orderId: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ── Order Adjustments ──

  async createAdjustment(dto: {
    orderId: number;
    adjustmentType: string;
    impact: string;
    amount: number;
    reason?: string;
    isManual?: boolean;
    manualType?: string;
  }) {
    const order = await this.prisma.orders.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Generate a unique transaction id up front so the row and the
    // payment URL can both reference it. PayU (and every other gateway
    // we might wire later) wants its own txnid, so this one is stored
    // as our side's reference — the gateway will get handed the same
    // value when the /pay/adjustment/:id page launches the checkout.
    const paymentTxnId = `ADJ-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const adjustment = await this.prisma.order_adjustments.create({
      data: {
        orderId: dto.orderId,
        adjustmentType: dto.adjustmentType as any,
        impact: dto.impact as any,
        amount: dto.amount,
        reason: dto.reason ?? null,
        isManual: dto.isManual ?? false,
        manualType: dto.manualType ?? null,
        paymentTxnId,
      },
    });

    const frontendBase = (
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
    // The frontend page at /pay/adjustment/[id] will read the adjustment
    // and POST the PayU form (or disconnect cleanly if the adjustment is
    // a CREDIT / already paid). Keeping the URL generic here means we
    // don't have to regenerate links when the gateway integration moves
    // forward — only the landing page changes.
    const paymentUrl = `${frontendBase}/pay/adjustment/${adjustment.id}`;

    // Fire-and-forget email to the customer. Credits (refunds) also get
    // a note so the customer has a record, but they don't get a CTA —
    // no action required. DEBITs get the "Pay now" button + link.
    if (order.userEmail) {
      void this.mail
        .send({
          to: order.userEmail,
          subject:
            dto.impact === 'CREDIT'
              ? `Refund note for order ${order.orderNumber ?? `#${order.id}`}`
              : `Action needed: additional payment for order ${order.orderNumber ?? `#${order.id}`}`,
          html: buildAdjustmentEmailHtml({
            userName: order.userName ?? order.shippingName ?? null,
            orderNumber: order.orderNumber,
            amount: Number(adjustment.amount),
            currencySymbol: order.currencySymbol ?? '₹',
            reason: dto.reason,
            adjustmentType: dto.adjustmentType,
            paymentUrl,
            impact: dto.impact === 'CREDIT' ? 'CREDIT' : 'DEBIT',
            supportEmail: this.mail.adminEmail || undefined,
          }),
        })
        .catch((err) =>
          this.logger.error(
            `Adjustment email for order ${order.id} failed: ${
              err instanceof Error ? err.message : err
            }`,
          ),
        );
    }

    // Return the adjustment row enriched with the paymentUrl so the
    // admin sees it immediately in the UI (ready to copy / verify)
    // and the user modal can read it from the same shape on refetch.
    return { ...adjustment, paymentUrl };
  }

  async getAdjustmentById(id: number) {
    const row = await this.prisma.order_adjustments.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Adjustment not found');
    const frontendBase = (
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
    return { ...row, paymentUrl: `${frontendBase}/pay/adjustment/${row.id}` };
  }

  /**
   * Build a PayU launch payload for an outstanding adjustment (admin
   * "Request additional payment"). Reuses the shopper's contact info
   * from the parent order so we don't need to re-collect it, and uses
   * the adjustment's own `paymentTxnId` as the PayU txnid. On success
   * the webhook recognises ADJ- prefix and flips THIS row to PAID
   * (not the order).
   */
  async initiatePayuForAdjustment(id: number) {
    const adjustment = await this.prisma.order_adjustments.findUnique({
      where: { id },
    });
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    if (adjustment.status === 'PAID') {
      throw new BadRequestException('Adjustment is already paid');
    }
    if (adjustment.status === 'CANCELLED') {
      throw new BadRequestException('Adjustment has been cancelled');
    }
    if (adjustment.impact === 'CREDIT') {
      throw new BadRequestException(
        'Refunds (CREDIT) do not need a payment link',
      );
    }
    const order = await this.prisma.orders.findUnique({
      where: { id: adjustment.orderId },
    });
    if (!order) throw new NotFoundException('Parent order not found');

    // Persist a fresh txnid on every attempt so retries don't collide.
    const paymentTxnId = `ADJ-${adjustment.id}-${Date.now()}`;
    await this.prisma.order_adjustments.update({
      where: { id: adjustment.id },
      data: { paymentTxnId },
    });

    const platform = (order.orderBy ?? 'wizard').toLowerCase();
    return this.payu.buildLaunchPayload({
      txnid: paymentTxnId,
      amount: Number(adjustment.amount),
      productInfo: `Order ${order.orderNumber} — adjustment`,
      firstName: (order.userName ?? order.shippingName ?? 'Customer')
        .split(' ')[0]
        .slice(0, 50),
      email: order.userEmail ?? 'orders@hecate.in',
      phone: (order.userPhone ?? order.shippingPhone ?? '')
        .toString()
        .replace(/\D/g, '')
        .slice(-10),
      surl: `${this.backendUrl}/payu/success`,
      furl: `${this.backendUrl}/payu/failure`,
      udf1: String(adjustment.id),
      udf2: platform,
      udf3: 'adjustment',
    });
  }

  /** Called by the PayU webhook when it recognises an ADJ- prefixed txnid. */
  async markAdjustmentPaid(paymentTxnId: string, gatewayTxnId?: string) {
    const adjustment = await this.prisma.order_adjustments.findUnique({
      where: { paymentTxnId },
    });
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    if (adjustment.status === 'PAID') return adjustment;
    return this.prisma.order_adjustments.update({
      where: { id: adjustment.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentTxnId: gatewayTxnId ?? adjustment.paymentTxnId,
      },
    });
  }

  async getAdjustments(orderId: number) {
    return this.prisma.order_adjustments.findMany({
      where: { orderId },
      orderBy: { id: 'desc' },
    });
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
