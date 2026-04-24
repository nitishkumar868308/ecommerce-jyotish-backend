import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCartDto, UpdateCartDto } from './dto';
import type { Cart, Offer, Product, ProductVariation } from '@prisma/client';

type ProductWithRelations = Product & {
  variations: ProductVariation[];
  offers: Offer[];
  primaryOffer: Offer | null;
};

export interface CartLine {
  id: string;
  productId: string;
  variationId: string | null;
  productName: string;
  variationName: string | null;
  image: string | null;
  sku: string | null;
  barCode: string | null;
  attributes: Record<string, string>;
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
  savedAmount: number;
  lineTotal: number;
  currency: string;
  currencySymbol: string;
  groupKey: string;
  purchasePlatform: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartGroup {
  groupKey: string;
  productId: string;
  productName: string;
  totalQty: number;
  freeQty: number;
  savedAmount: number;
  offerApplied: boolean;
  offerId: number | null;
  offerName: string | null;
  offerProgress: {
    start: number;
    end: number;
    currentQty: number;
    reached: boolean;
    freeAvailable: number;
  } | null;
  bulkApplied: boolean;
  bulkMinQty: number | null;
  bulkPrice: number | null;
  itemIds: string[];
}

export interface CartResponse {
  items: CartLine[];
  groups: CartGroup[];
  summary: {
    subtotal: number;
    discount: number;
    total: number;
    currency: string;
    currencySymbol: string;
    itemCount: number;
  };
}

interface LineCtx {
  cart: Cart;
  product: ProductWithRelations | undefined;
  variation: ProductVariation | null;
  originalPrice: number;
  groupKey: string;
}

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns the user's cart with offer/bulk applied, prices converted to
   * the requested country, and free-qty distributed across lines (cheapest
   * unit first; same price → most-recently-added line first). The cart
   * table stores only raw intent (productId/qty/attributes) — every number
   * here is recomputed server-side on every read so the client can never
   * tamper with final pricing.
   */
  async findAll(opts: {
    userId?: number;
    countryCode?: string;
    platform?: string;
  } = {}): Promise<CartResponse> {
    const where: any = { is_buy: false };
    if (opts.userId != null) where.userId = opts.userId;
    if (opts.platform) {
      const p = opts.platform.toLowerCase();
      const norm =
        p === 'quickgo' || p === 'hecate-quickgo' ? 'quickgo' : 'wizard';
      where.purchasePlatform = norm;
    }

    const cartItems = await this.prisma.cart.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    const countryPricing = await this.resolveCountryPricing(opts.countryCode);
    const currency = countryPricing?.currency ?? 'INR';
    const currencySymbol = countryPricing?.currencySymbol ?? '₹';
    const rate =
      (countryPricing?.conversionRate ?? 1) *
      (countryPricing?.multiplier ?? 1);

    if (cartItems.length === 0) {
      return {
        items: [],
        groups: [],
        summary: {
          subtotal: 0,
          discount: 0,
          total: 0,
          currency,
          currencySymbol,
          itemCount: 0,
        },
      };
    }

    const productIds = [...new Set(cartItems.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variations: true, offers: true, primaryOffer: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Step 1: build per-line context (price + groupKey)
    const lines: LineCtx[] = cartItems.map((cart) => {
      const product = productMap.get(cart.productId) as
        | ProductWithRelations
        | undefined;
      const variation =
        cart.variationId && product
          ? product.variations.find((v) => v.id === cart.variationId) ?? null
          : null;
      const rawPrice = variation?.price ?? product?.price ?? '0';
      const originalPrice = parseFloat(rawPrice) * rate;

      // `Color` is the only attribute ignored for offer / bulk grouping.
      // Every other attribute (wax type, pack size, fragrance, …) has to
      // match for two cart lines to share a bucket — that matches the
      // admin's mental model: "same variation, different colour".
      const ignore = new Set(['color']);
      const attrs = (cart.attributes ?? {}) as Record<string, string>;
      const nonIgnored = Object.entries(attrs)
        .filter(([k]) => !ignore.has(k.toLowerCase()))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('|');

      // Include the storefront platform in the group key so the same
      // product added on Wizard vs QuickGo NEVER shares a bucket —
      // otherwise each tab's bulk / offer check would "see" the other
      // tab's qty. (The shopper's cart drawer splits the view by tab
      // already; the grouping has to match.)
      const rawPlatform = (cart.purchasePlatform ?? 'wizard').toLowerCase();
      const platformKey =
        rawPlatform === 'quickgo' || rawPlatform === 'hecate-quickgo'
          ? 'quickgo'
          : 'wizard';
      const groupKey = `${platformKey}::${cart.productId}::${nonIgnored}`;

      return { cart, product, variation, originalPrice, groupKey };
    });

    // Step 2: group lines & compute per-group offer/bulk + free distribution
    const groupMap = new Map<string, LineCtx[]>();
    for (const line of lines) {
      const arr = groupMap.get(line.groupKey);
      if (arr) arr.push(line);
      else groupMap.set(line.groupKey, [line]);
    }

    const freeQtyPerLine = new Map<string, number>();
    interface GroupState {
      offerApplied: boolean;
      offerId: number | null;
      offerName: string | null;
      offerStart: number;
      offerEnd: number;
      offerFreeConfigured: number;
      bulkApplied: boolean;
      bulkPrice: number | null;
      bulkMinQty: number | null;
      totalQty: number;
      product: ProductWithRelations | undefined;
    }
    const groupState = new Map<string, GroupState>();

    for (const [groupKey, groupLines] of groupMap) {
      const product = groupLines[0].product;
      const totalQty = groupLines.reduce((s, l) => s + l.cart.quantity, 0);

      // Bulk pricing can come from one of two shapes:
      //  1. `bulkPricingTiers` JSON: [{qty, unitPrice}, ...] — multi-tier
      //     (admin UI under the hood). Highest-qty tier the shopper has
      //     crossed wins.
      //  2. Flat `bulkPrice` + `minQuantity` columns — legacy single tier.
      // Tiers are preferred when both are set.
      const tiers = Array.isArray(product?.bulkPricingTiers)
        ? (product!.bulkPricingTiers as any[])
            .map((t) => ({
              qty: Number(t?.qty),
              unitPrice: Number(t?.unitPrice),
            }))
            .filter((t) => Number.isFinite(t.qty) && Number.isFinite(t.unitPrice))
            .sort((a, b) => b.qty - a.qty)
        : [];
      const applicableTier = tiers.find((t) => totalQty >= t.qty);

      let bulkPrice: number | null = null;
      let bulkMinQty: number | null = null;
      let bulkApplied = false;

      if (applicableTier) {
        bulkPrice = applicableTier.unitPrice * rate;
        bulkMinQty = applicableTier.qty;
        bulkApplied = true;
      } else if (product?.bulkPrice && product?.minQuantity) {
        const flatPrice = parseFloat(product.bulkPrice) * rate;
        const flatMin = parseInt(product.minQuantity, 10);
        if (flatPrice > 0 && flatMin > 0) {
          bulkPrice = flatPrice;
          bulkMinQty = flatMin;
          bulkApplied = totalQty >= flatMin;
        }
      }

      // Offer: first active rangeBuyXGetY attached to the product.
      // Bulk wins over offer when both thresholds are hit.
      let offerApplied = false;
      let offerId: number | null = null;
      let offerName: string | null = null;
      let offerStart = 0;
      let offerEnd = 0;
      let offerFreeConfigured = 0;

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
        // Match the canonical `RANGE_FREE` discountType (per CreateOfferDto)
        // as well as the legacy `rangeBuyXGetY` string some older admin
        // flows wrote. discountValue supports both {from,to,freeCount}
        // (canonical) and {start,end,free} (legacy).
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
          // `to`/`end` of 0 (or missing) is treated as "no upper bound" —
          // admins often save offers without an explicit ceiling.
          const rawEnd = num('to', 'end', 'maxQty');
          offerEnd = rawEnd && rawEnd > 0 ? rawEnd : Number.MAX_SAFE_INTEGER;
          offerFreeConfigured = num('freeCount', 'free', 'count') ?? 0;
          offerId = rangeOffer.id;
          offerName = rangeOffer.name;

          if (
            totalQty >= offerStart &&
            totalQty <= offerEnd &&
            offerFreeConfigured > 0
          ) {
            offerApplied = true;

            // Distribute free qty across lines: cheapest unit first, same
            // price → most-recently-added line first.
            type Unit = { lineId: string; price: number; createdAt: Date };
            const units: Unit[] = [];
            for (const line of groupLines) {
              for (let i = 0; i < line.cart.quantity; i++) {
                units.push({
                  lineId: line.cart.id,
                  price: line.originalPrice,
                  createdAt: line.cart.createdAt,
                });
              }
            }
            units.sort((a, b) => {
              if (a.price !== b.price) return a.price - b.price;
              return b.createdAt.getTime() - a.createdAt.getTime();
            });
            const freeCount = Math.min(offerFreeConfigured, units.length);
            for (let i = 0; i < freeCount; i++) {
              const id = units[i].lineId;
              freeQtyPerLine.set(id, (freeQtyPerLine.get(id) ?? 0) + 1);
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
        offerFreeConfigured,
        bulkApplied,
        bulkPrice,
        bulkMinQty,
        totalQty,
        product,
      });
    }

    // Step 3: emit computed lines
    const items: CartLine[] = lines.map((line) => {
      const state = groupState.get(line.groupKey)!;
      const freeInThis = freeQtyPerLine.get(line.cart.id) ?? 0;
      const paidQty = Math.max(0, line.cart.quantity - freeInThis);
      const effectivePrice = state.bulkApplied
        ? (state.bulkPrice as number)
        : line.originalPrice;
      const lineTotal = paidQty * effectivePrice;
      const savedFromBulk = state.bulkApplied
        ? (line.originalPrice - (state.bulkPrice as number)) * line.cart.quantity
        : 0;
      const savedFromFree = freeInThis * line.originalPrice;
      const savedAmount = savedFromBulk + savedFromFree;

      const product = line.product;
      const variation = line.variation;

      return {
        id: line.cart.id,
        productId: line.cart.productId,
        variationId: line.cart.variationId,
        productName: product?.name ?? '(missing product)',
        variationName: variation?.name ?? variation?.variationName ?? null,
        image:
          (variation?.image && variation.image[0]) ??
          (product?.image && product.image[0]) ??
          null,
        sku: variation?.sku ?? product?.sku ?? null,
        barCode: variation?.barCode ?? product?.barCode ?? null,
        attributes: (line.cart.attributes ?? {}) as Record<string, string>,
        quantity: line.cart.quantity,
        paidQty,
        freeQty: freeInThis,
        originalPrice: round(line.originalPrice),
        pricePerItem: round(effectivePrice),
        bulkApplied: state.bulkApplied,
        bulkMinQty: state.bulkMinQty,
        bulkPrice: state.bulkPrice !== null ? round(state.bulkPrice) : null,
        offerApplied: state.offerApplied,
        offerId: state.offerId,
        offerName: state.offerName,
        savedAmount: round(savedAmount),
        lineTotal: round(lineTotal),
        currency,
        currencySymbol,
        groupKey: line.groupKey,
        purchasePlatform: line.cart.purchasePlatform ?? 'wizard',
        createdAt: line.cart.createdAt,
        updatedAt: line.cart.updatedAt,
      };
    });

    // Step 4: group summaries
    const groups: CartGroup[] = [...groupMap.entries()].map(
      ([groupKey, groupLines]) => {
        const state = groupState.get(groupKey)!;
        const product = state.product;
        const itemIds = groupLines.map((l) => l.cart.id);
        const idSet = new Set(itemIds);
        const linesInGroup = items.filter((l) => idSet.has(l.id));
        const savedAmount = linesInGroup.reduce(
          (s, l) => s + l.savedAmount,
          0,
        );
        const freeQty = linesInGroup.reduce((s, l) => s + l.freeQty, 0);

        const offerProgress = state.offerName
          ? {
              start: state.offerStart,
              end:
                state.offerEnd === Number.MAX_SAFE_INTEGER
                  ? 0
                  : state.offerEnd,
              currentQty: state.totalQty,
              reached: state.offerApplied,
              freeAvailable: state.offerFreeConfigured,
            }
          : null;

        return {
          groupKey,
          productId: product?.id ?? groupLines[0].cart.productId,
          productName: product?.name ?? '(missing product)',
          totalQty: state.totalQty,
          freeQty,
          savedAmount: round(savedAmount),
          offerApplied: state.offerApplied,
          offerId: state.offerId,
          offerName: state.offerName,
          offerProgress,
          bulkApplied: state.bulkApplied,
          bulkMinQty: state.bulkMinQty,
          bulkPrice:
            state.bulkPrice !== null ? round(state.bulkPrice) : null,
          itemIds,
        };
      },
    );

    const subtotal = items.reduce(
      (s, l) => s + l.originalPrice * l.quantity,
      0,
    );
    const total = items.reduce((s, l) => s + l.lineTotal, 0);
    const discount = subtotal - total;
    const itemCount = items.reduce((s, l) => s + l.quantity, 0);

    return {
      items,
      groups,
      summary: {
        subtotal: round(subtotal),
        discount: round(discount),
        total: round(total),
        currency,
        currencySymbol,
        itemCount,
      },
    };
  }

  async create(dto: CreateCartDto) {
    const attrs = (dto.attributes ?? {}) as Record<string, string>;
    const incomingPlatform = normalisePlatform(dto.purchasePlatform);

    // De-dup: same user + product + variation + attributes + platform →
    // bump qty instead of creating a new row.
    if (dto.userId != null) {
      const existing = await this.prisma.cart.findMany({
        where: {
          productId: dto.productId,
          userId: dto.userId,
          is_buy: false,
        },
      });
      const match = existing.find((item) => {
        if (normalisePlatform(item.purchasePlatform) !== incomingPlatform)
          return false;
        if ((item.variationId ?? null) !== (dto.variationId ?? null))
          return false;
        const itemAttrs = (item.attributes ?? {}) as Record<string, string>;
        const k1 = Object.keys(attrs).sort();
        const k2 = Object.keys(itemAttrs).sort();
        if (k1.length !== k2.length) return false;
        return k1.every((k, i) => k === k2[i] && attrs[k] === itemAttrs[k]);
      });
      if (match) {
        return this.prisma.cart.update({
          where: { id: match.id },
          data: { quantity: match.quantity + dto.quantity },
        });
      }
    }

    return this.prisma.cart.create({
      data: {
        userId: dto.userId ?? null,
        productId: dto.productId,
        variationId: dto.variationId ?? null,
        quantity: dto.quantity,
        attributes: attrs,
        purchasePlatform: incomingPlatform,
      },
    });
  }

  async update(dto: UpdateCartDto) {
    const { id, quantity, attributes, userId, is_buy } = dto;
    const cart = await this.prisma.cart.findUnique({ where: { id } });
    if (!cart) throw new NotFoundException(`Cart item with id ${id} not found`);

    const data: Record<string, unknown> = {};
    if (quantity !== undefined) data.quantity = quantity;
    if (attributes !== undefined) data.attributes = attributes;
    if (userId !== undefined) data.userId = userId;
    if (is_buy !== undefined) data.is_buy = is_buy;

    return this.prisma.cart.update({ where: { id }, data });
  }

  async delete(body: {
    id?: string | string[];
    clearAll?: boolean;
    userId?: number;
    productId?: string;
  }) {
    const { id, clearAll, userId, productId } = body;

    // "Remove entire product from cart" — all variations for a userId+productId
    if (productId && userId != null) {
      return this.prisma.cart.deleteMany({
        where: { userId, productId, is_buy: false },
      });
    }

    if (clearAll && userId != null) {
      return this.prisma.cart.deleteMany({
        where: { userId, is_buy: false },
      });
    }
    if (clearAll) {
      return this.prisma.cart.deleteMany({ where: { is_buy: false } });
    }

    if (Array.isArray(id)) {
      return this.prisma.cart.deleteMany({ where: { id: { in: id } } });
    }
    if (id) {
      return this.prisma.cart.delete({ where: { id } });
    }
    throw new NotFoundException(
      'Provide id, productId+userId, or clearAll flag',
    );
  }

  private async resolveCountryPricing(countryCode?: string) {
    if (!countryCode) return null;
    return this.prisma.countryPricing.findUnique({
      where: { code: countryCode },
    });
  }
}

function normalisePlatform(raw?: string | null): string {
  const lower = String(raw ?? '').toLowerCase();
  if (lower === 'quickgo' || lower === 'hecate-quickgo') return 'quickgo';
  return 'wizard';
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
