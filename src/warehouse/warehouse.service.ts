import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateTransferDto,
  CreateDispatchDto,
  CreateSendToWarehouseDto,
} from './dto';

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Warehouse CRUD ───

  findAll() {
    return this.prisma.wareHouse.findMany({
      where: { deleted: false },
      orderBy: { id: 'desc' },
    });
  }

  /**
   * Public lookup used by the QuickGo landing page. Returns active
   * warehouses grouped by their EFFECTIVE FULFILLMENT CITY, not their
   * own city — so a Faridabad warehouse whose `fulfillmentWarehouseId`
   * points to the Delhi warehouse shows up under "Delhi" and contributes
   * its pincodes to the Delhi bucket. This matches what the shopper
   * expects ("I live in a Faridabad pincode but the product ships from
   * Delhi — pick Delhi") and lines up with how
   * ProductsService.resolveQuickGoStockSources hops through
   * fulfillmentWarehouseId on the stock-lookup side.
   */
  async findPublicCities() {
    const warehouses = await this.prisma.wareHouse.findMany({
      where: { deleted: false, active: true },
      select: {
        id: true,
        city: true,
        state: true,
        pincode: true,
        cityRefId: true,
        fulfillmentWarehouseId: true,
      },
    });

    const byId = new Map<number, (typeof warehouses)[number]>();
    for (const w of warehouses) byId.set(w.id, w);

    const grouped = new Map<
      string,
      {
        city: string;
        state: string;
        cityRefId: number | null;
        pincodes: string[];
      }
    >();
    const PINCODE_RE = /^\d{6}$/;
    for (const w of warehouses) {
      // Fold every warehouse under its effective fulfillment parent —
      // that's the one whose city + state label the bucket.
      const fw = w.fulfillmentWarehouseId
        ? byId.get(w.fulfillmentWarehouseId) ?? w
        : w;
      const cityName = fw.city?.trim();
      if (!cityName) continue;
      const key = `${cityName}__${fw.state}`;
      const bucket = grouped.get(key) ?? {
        city: cityName,
        state: fw.state,
        cityRefId: fw.cityRefId ?? null,
        pincodes: [],
      };
      // Pincodes come from the SOURCE warehouse (the one the shopper
      // lives near), not the fulfillment parent — that's what the
      // shopper actually types in. Faridabad's 121003 shows up under
      // Delhi because Faridabad is fulfilled from Delhi.
      const tokens = (w.pincode ?? '')
        .split(/[^0-9]+/)
        .map((t) => t.trim())
        .filter((t) => PINCODE_RE.test(t));
      for (const code of tokens) {
        if (!bucket.pincodes.includes(code)) bucket.pincodes.push(code);
      }
      grouped.set(key, bucket);
    }
    const result = Array.from(grouped.values());
    result.sort((a, b) => a.city.localeCompare(b.city));
    for (const bucket of result) bucket.pincodes.sort();
    return result;
  }

  create(dto: CreateWarehouseDto) {
    return this.prisma.wareHouse.create({ data: dto });
  }

  update(id: number, dto: UpdateWarehouseDto) {
    return this.prisma.wareHouse.update({ where: { id }, data: dto });
  }

  softDelete(id: number) {
    return this.prisma.wareHouse.update({
      where: { id },
      data: { deleted: true, active: false },
    });
  }

  // ─── Transfer ───

  findAllTransfers() {
    return this.prisma.warehouseTransfer.findMany({
      where: { deleted: false },
      orderBy: { id: 'desc' },
    });
  }

  createTransfer(dto: CreateTransferDto) {
    return this.prisma.warehouseTransfer.create({ data: dto });
  }

  // ─── Dispatch ───

  findAllDispatches() {
    return this.prisma.warehouseDispatch.findMany({
      where: { deleted: false },
      orderBy: { id: 'desc' },
    });
  }

  createDispatch(dto: CreateDispatchDto) {
    return this.prisma.warehouseDispatch.create({ data: dto });
  }

  // ─── Delhi Store ───

  async findAllDelhiStock() {
    // DelhiWarehouseStock stores FKs (productId / variationId /
    // warehouseId) but no declared Prisma relations, so findMany alone
    // only returns ids. Join them in-app so the admin table shows
    // product name, variation, SKU, and warehouse + city — otherwise
    // every row renders as "-".
    const rows = await this.prisma.delhiWarehouseStock.findMany({
      where: { deleted: false },
      orderBy: { id: 'desc' },
    });
    if (rows.length === 0) return [];

    const productIds = [...new Set(rows.map((r) => r.productId))];
    const variationIds = [
      ...new Set(rows.map((r) => r.variationId).filter(Boolean)),
    ];
    const warehouseIds = [...new Set(rows.map((r) => r.warehouseId))];

    const [products, variations, warehouses] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true, MRP: true, image: true },
      }),
      variationIds.length
        ? this.prisma.productVariation.findMany({
            where: { id: { in: variationIds } },
            select: {
              id: true,
              variationName: true,
              sku: true,
              attributeCombo: true,
            },
          })
        : Promise.resolve([] as Array<{
            id: string;
            variationName: string;
            sku: string;
            attributeCombo: unknown;
          }>),
      this.prisma.wareHouse.findMany({
        where: { id: { in: warehouseIds } },
        select: { id: true, name: true, city: true, state: true, code: true },
      }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const variationMap = new Map(variations.map((v) => [v.id, v]));
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    return rows.map((r) => {
      const product = productMap.get(r.productId);
      const variation = r.variationId
        ? variationMap.get(r.variationId)
        : undefined;
      const warehouse = warehouseMap.get(r.warehouseId);
      return {
        ...r,
        productName: product?.name ?? null,
        sku: variation?.sku ?? product?.sku ?? null,
        mrp: product?.MRP ?? null,
        variationName: variation?.variationName ?? null,
        attributeCombo: variation?.attributeCombo ?? null,
        image: product?.image?.[0] ?? null,
        warehouseName: warehouse?.name ?? null,
        warehouseCity: warehouse?.city ?? null,
        warehouseState: warehouse?.state ?? null,
        warehouseCode: warehouse?.code ?? null,
        // Legacy nested shape so the older `row.product.name` renderer
        // in the admin page still works during the transition.
        product: product
          ? { id: product.id, name: product.name, sku: product.sku }
          : null,
        warehouse: warehouse
          ? {
              id: warehouse.id,
              name: warehouse.name,
              city: warehouse.city,
              state: warehouse.state,
            }
          : null,
      };
    });
  }

  /**
   * Update a Delhi-warehouse stock row. Only `stock` (+ optional
   * `status`) can be changed from the admin UI — the FKs and the
   * dispatch reference stay immutable. Frontend sends `minStock` too
   * but the schema doesn't have that column (it's a reporting concept
   * only), so we silently drop it here instead of 400'ing the admin.
   */
  async updateDelhiStock(
    id: number,
    payload: { stock?: number; status?: string; minStock?: number },
  ) {
    const existing = await this.prisma.delhiWarehouseStock.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Stock row not found');

    const data: { stock?: number; status?: string } = {};
    if (payload.stock !== undefined && Number.isFinite(Number(payload.stock))) {
      data.stock = Number(payload.stock);
    }
    if (payload.status !== undefined) {
      data.status = String(payload.status);
    }

    if (Object.keys(data).length === 0) {
      // Nothing admitted — return the row unchanged rather than a noop
      // write so callers can still rely on the response shape.
      return existing;
    }
    return this.prisma.delhiWarehouseStock.update({
      where: { id },
      data,
    });
  }

  // ─── Send to Warehouse ───
  // The admin "Send to warehouse" queue sends one row per product/variation
  // with a destination warehouse + quantity. We persist it on the existing
  // `WarehouseTransfer` table (no new model / migration needed) and stash
  // the warehouse + quantity + fulfilment bucket in the `entries` JSON
  // column so the queue listing can read them back.

  async findAllSendToWarehouse() {
    const rows = await this.prisma.warehouseTransfer.findMany({
      where: { deleted: false },
      orderBy: { id: 'desc' },
    });
    const productIds = Array.from(new Set(rows.map((r) => r.productId)));
    const variationIds = Array.from(
      new Set(rows.map((r) => r.variationId).filter((v): v is string => !!v)),
    );
    const warehouseIds = Array.from(
      new Set(
        rows
          .map((r) => ((r.entries as any)?.warehouseId as number | undefined))
          .filter((v): v is number => typeof v === 'number'),
      ),
    );
    const [products, variations, warehouses] = await Promise.all([
      productIds.length
        ? this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: {
              id: true,
              name: true,
              sku: true,
              barCode: true,
              MRP: true,
              price: true,
            },
          })
        : Promise.resolve([]),
      variationIds.length
        ? this.prisma.productVariation.findMany({
            where: { id: { in: variationIds } },
            select: { id: true, variationName: true },
          })
        : Promise.resolve([]),
      warehouseIds.length
        ? this.prisma.wareHouse.findMany({
            where: { id: { in: warehouseIds } },
            select: { id: true, name: true, city: true, state: true, code: true },
          })
        : Promise.resolve([]),
    ]);
    const productById = new Map(products.map((p) => [p.id, p] as const));
    const variationById = new Map(
      variations.map((v) => [v.id, v] as const),
    );
    const warehouseById = new Map(
      warehouses.map((w) => [w.id, w] as const),
    );
    return rows.map((row) => {
      const entries = (row.entries as any) ?? {};
      const whId = entries.warehouseId ?? null;
      return {
        ...row,
        warehouseId: whId,
        quantity: entries.quantity ?? null,
        fulfilmentBucket: entries.fulfilmentBucket ?? null,
        fnsku: row.FNSKU,
        product: productById.get(row.productId) ?? null,
        variation: row.variationId
          ? variationById.get(row.variationId) ?? null
          : null,
        warehouse: whId != null ? warehouseById.get(whId) ?? null : null,
      };
    });
  }

  async createSendToWarehouse(dto: CreateSendToWarehouseDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        name: true,
        sku: true,
        barCode: true,
        MRP: true,
        price: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    const destWarehouse = await this.prisma.wareHouse.findUnique({
      where: { id: dto.warehouseId },
      select: { id: true, name: true, city: true, state: true, code: true },
    });

    let variationName: string | undefined;
    if (dto.variationId) {
      const variation = await this.prisma.productVariation.findUnique({
        where: { id: dto.variationId },
        select: { variationName: true },
      });
      variationName = variation?.variationName ?? undefined;
    }

    const transfer = await this.prisma.warehouseTransfer.create({
      data: {
        productId: dto.productId,
        variationId: dto.variationId,
        productName: product.name,
        variationName,
        price: String(product.price ?? ''),
        MRP: String(product.MRP ?? ''),
        FNSKU: product.barCode ?? '',
        sku: product.sku ?? undefined,
        // The send-to-warehouse action IS the dispatch — the row never
        // sits in a "waiting for approval" state in this flow, so mark
        // it dispatched immediately instead of letting the schema
        // default to "pending". The admin console was otherwise showing
        // every freshly-sent row as pending forever.
        status: 'dispatched',
        entries: {
          warehouseId: dto.warehouseId,
          quantity: dto.quantity,
          fulfilmentBucket: dto.fulfilmentBucket ?? null,
        },
      },
    });

    // The admin "Send to warehouse" console is the Delhi-region
    // replenishment flow (Delhi + Faridabad + neighbouring warehouses
    // all ship out of the same bucket), so every dispatched row also
    // lands on `DelhiWarehouseStock` for the Delhi inventory page to
    // read back. Composite unique `[dispatchId, productId, variationId]`
    // keeps re-dispatches idempotent per transfer.
    try {
      await this.prisma.delhiWarehouseStock.create({
        data: {
          dispatchId: transfer.id,
          shippingId: String(transfer.id),
          productId: dto.productId,
          variationId: dto.variationId ?? dto.productId,
          warehouseId: dto.warehouseId,
          stock: dto.quantity,
          status: 'accepted',
        },
      });
    } catch {
      // A re-dispatch for the same (dispatchId, productId, variationId)
      // hits the composite unique index — that's fine, we already logged
      // the replenishment on the first call.
    }

    return transfer;
  }
}
