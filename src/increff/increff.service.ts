import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { IncreffInventoryPushDto } from './dto/increff-inventory-push.dto';

/**
 * Increff integration service (scaffolded).
 *
 * Contract (per item 32 in the brief):
 *   - inventory()    → pull current inventory from Increff for all configured
 *                      warehouses. We match each returned SKU against the
 *                      admin SKU-mapping table (see admin/sku-mapping page)
 *                      and upsert into `WarehouseStock`.
 *   - packorder(id)  → push an order to Increff for fulfilment. Called from
 *                      OrdersService.create when platform=quickgo AND
 *                      shipping city normalises to 'bangalore'.
 *   - getInvoice(id) → fetch the invoice PDF/URL once Increff has processed
 *                      an order, so the customer dashboard can show the
 *                      download link.
 *
 * Credentials (INCREFF_BASE_URL, INCREFF_API_KEY) are read from env at call
 * time — the service skips the network call with a logged warning when
 * either is missing so local dev continues to work.
 */
@Injectable()
export class IncreffService {
  private readonly logger = new Logger(IncreffService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get baseUrl(): string | null {
    return process.env.INCREFF_BASE_URL?.replace(/\/+$/, '') ?? null;
  }

  private get apiKey(): string | null {
    return process.env.INCREFF_API_KEY ?? null;
  }

  private missingCreds(op: string): boolean {
    if (this.baseUrl && this.apiKey) return false;
    this.logger.warn(
      `[increff] Skipping ${op} — INCREFF_BASE_URL / INCREFF_API_KEY not configured.`,
    );
    return true;
  }

  /**
   * Pull inventory from Increff for the provided warehouse codes (defaults
   * to all active Increff-linked warehouses) and upsert the results against
   * the admin SKU mapping.
   */
  async fetchInventory(warehouseCodes?: string[]): Promise<{
    synced: number;
    skipped: number;
  }> {
    if (this.missingCreds('fetchInventory'))
      return { synced: 0, skipped: 0 };

    const url = `${this.baseUrl}/inventory`;
    const codes = warehouseCodes ?? ['bangalore'];

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ warehouseCodes: codes }),
      });
      if (!res.ok) {
        this.logger.error(`Increff inventory ${res.status}: ${await res.text()}`);
        return { synced: 0, skipped: 0 };
      }
      const payload = (await res.json()) as {
        data: Array<{ sku: string; warehouseCode: string; onHand: number }>;
      };
      let synced = 0;
      let skipped = 0;
      for (const row of payload.data ?? []) {
        const mapping = await this.prisma.$queryRawUnsafe<
          Array<{ productId: number; variationId: number | null }>
        >(
          'SELECT "productId", "variationId" FROM "SkuMapping" WHERE "externalSku" = $1 LIMIT 1',
          row.sku,
        );
        const row0 = mapping?.[0];
        if (!row0) {
          skipped++;
          continue;
        }
        // Upsert WarehouseStock — schema model assumed; service degrades
        // gracefully if the table doesn't exist yet.
        try {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO "WarehouseStock" ("productId", "variationId", "warehouseCode", "onHand", "updatedAt")
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT ("productId", "variationId", "warehouseCode")
             DO UPDATE SET "onHand" = EXCLUDED."onHand", "updatedAt" = NOW();`,
            row0.productId,
            row0.variationId,
            row.warehouseCode,
            row.onHand,
          );
          synced++;
        } catch (e) {
          this.logger.warn(
            `WarehouseStock upsert failed — run the matching migration. ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
          skipped++;
        }
      }
      return { synced, skipped };
    } catch (err) {
      this.logger.error(
        `Increff inventory call failed: ${err instanceof Error ? err.message : err}`,
      );
      return { synced: 0, skipped: 0 };
    }
  }

  /**
   * Push an order to Increff for packing/dispatch.
   * Platform + city normalisation is the caller's responsibility — this
   * method only assumes `shouldFulfilViaIncreff` was true.
   */
  async packOrder(orderId: number): Promise<{ pushed: boolean }> {
    if (this.missingCreds('packOrder')) return { pushed: false };

    // Items moved from a JSON column to a proper OrderItem relation —
    // include it so Increff can read sku/qty/price off the snapshot rows.
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });
    if (!order) {
      this.logger.error(`packOrder: order ${orderId} not found`);
      return { pushed: false };
    }

    const orderItems = order.orderItems ?? [];

    try {
      const res = await fetch(`${this.baseUrl}/packorder`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          orderCode: `HECATE-${order.id}`,
          platform: 'quickgo',
          warehouseCode: 'bangalore',
          items: orderItems.map((i) => ({
            sku: i.sku,
            quantity: i.quantity,
            // Increff wants the reseller MRP (use originalPrice as our
            // pre-discount reference) and our actual selling price.
            mrp: Number(i.originalPrice ?? i.pricePerItem ?? 0),
            price: Number(i.pricePerItem ?? 0),
          })),
          shipping: {
            name: (order as any).shippingName,
            phone: (order as any).shippingPhone,
            address: (order as any).shippingAddress,
            city: 'bangalore',
            state: (order as any).shippingState,
            pincode: (order as any).shippingPincode,
            country: (order as any).shippingCountry ?? 'India',
          },
        }),
      });
      if (!res.ok) {
        this.logger.error(
          `Increff packorder ${res.status}: ${await res.text()}`,
        );
        return { pushed: false };
      }
      return { pushed: true };
    } catch (err) {
      this.logger.error(
        `Increff packorder failed: ${err instanceof Error ? err.message : err}`,
      );
      return { pushed: false };
    }
  }

  /**
   * Handle Increff's inventory push webhook (PUT /increff/inventory/sync).
   *
   * Mirrors the legacy Next.js route one-for-one:
   *   1. `locationCode` must match a `WareHouse.code` whose `state` is
   *      "Bengaluru" — any other code is 400'd so stray callers can't pollute
   *      Bangalore inventory.
   *   2. Each line upserts `BangaloreIncreffInventory`. On an existing row
   *      the quantity is **incremented** (not replaced); other metadata is
   *      overwritten and the raw `payload` is stored for audit.
   *   3. Missing `channelSkuCode` / `quantity` lines are reported on
   *      `failureList` instead of aborting the batch.
   */
  async applyInventoryPush(dto: IncreffInventoryPushDto): Promise<{
    successList: Array<{ sku: string; message: string }>;
    failureList: Array<{ sku: string | null; reason?: string; error?: string }>;
  }> {
    // Validate the location code — only Bangalore-state warehouses are
    // allowed to receive pushes via this endpoint. Spelling matches the
    // legacy route ("Bengaluru"), so `findMany` returns whatever the admin
    // saved against that state.
    const warehouses = await this.prisma.wareHouse.findMany({
      where: { city: 'Bengaluru' },
      select: { code: true },
    });
    const isValidLocation = warehouses.some((w) => w.code === dto.locationCode);
    if (!isValidLocation) {
      throw new BadRequestException('Invalid locationCode.');
    }

    const successList: Array<{ sku: string; message: string }> = [];
    const failureList: Array<{
      sku: string | null;
      reason?: string;
      error?: string;
    }> = [];

    for (const item of dto.inventories ?? []) {
      const sku = item.channelSkuCode;
      const quantity = item.quantity;
      const clientSkuId = item.client_sku_id ?? null;

      if (!sku || quantity === undefined || quantity === null) {
        failureList.push({
          sku: sku || null,
          reason: 'channelSkuCode, quantity are required',
        });
        continue;
      }

      try {
        const existing =
          await this.prisma.bangaloreIncreffInventory.findUnique({
            where: {
              locationCode_channelSkuCode: {
                locationCode: dto.locationCode,
                channelSkuCode: sku,
              },
            },
          });

        if (existing) {
          await this.prisma.bangaloreIncreffInventory.update({
            where: {
              locationCode_channelSkuCode: {
                locationCode: dto.locationCode,
                channelSkuCode: sku,
              },
            },
            data: {
              // Match legacy behaviour: push increments the on-hand instead
              // of overwriting. Replacing would be destructive on retries.
              quantity: { increment: quantity },
              minExpiry: item.minExpiry ?? null,
              clientSkuId: clientSkuId ?? undefined,
              channelSerialNo: item.channelSerialNo ?? null,
              payload: item as any,
            },
          });
          successList.push({ sku, message: 'Quantity updated successfully' });
        } else {
          await this.prisma.bangaloreIncreffInventory.create({
            data: {
              locationCode: dto.locationCode,
              channelSkuCode: sku,
              clientSkuId: clientSkuId ?? undefined,
              quantity,
              minExpiry: item.minExpiry ?? null,
              channelSerialNo: item.channelSerialNo ?? null,
              payload: item as any,
            },
          });
          successList.push({ sku, message: 'Inventory created successfully' });
        }
      } catch (err) {
        this.logger.error(
          `Inventory upsert failed for ${sku}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        failureList.push({
          sku,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { successList, failureList };
  }

  /**
   * GET counterpart to the push webhook. Returns whatever Increff has
   * written against this locationCode so they (or ops) can reconcile.
   */
  async readInventoryByLocation(locationCode?: string) {
    if (!locationCode) {
      throw new BadRequestException('locationCode is required');
    }
    return this.prisma.bangaloreIncreffInventory.findMany({
      where: { locationCode },
      select: {
        locationCode: true,
        channelSkuCode: true,
        quantity: true,
        minExpiry: true,
        clientSkuId: true,
      },
    });
  }

  /** Fetch the invoice metadata/URL for an order from Increff. */
  async getInvoice(orderId: number): Promise<{
    invoiceUrl: string | null;
    invoiceNo: string | null;
  }> {
    if (this.missingCreds('getInvoice'))
      return { invoiceUrl: null, invoiceNo: null };
    try {
      const res = await fetch(
        `${this.baseUrl}/invoices/HECATE-${orderId}`,
        {
          headers: { authorization: `Bearer ${this.apiKey}` },
        },
      );
      if (!res.ok) {
        return { invoiceUrl: null, invoiceNo: null };
      }
      const json = (await res.json()) as {
        data?: { url?: string; invoiceNo?: string };
      };
      return {
        invoiceUrl: json.data?.url ?? null,
        invoiceNo: json.data?.invoiceNo ?? null,
      };
    } catch (err) {
      this.logger.error(
        `Increff getInvoice failed: ${err instanceof Error ? err.message : err}`,
      );
      return { invoiceUrl: null, invoiceNo: null };
    }
  }
}

/**
 * Normalise Indian city spelling for cities that Increff treats as a single
 * warehouse. Bengaluru / Bangalore variants all map to 'bangalore'.
 */
export function normaliseCity(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim().toLowerCase();
  if (/^(bengaluru|bangaluru|bangalore|bengalooru)$/.test(s)) return 'bangalore';
  return s;
}

/** True when this order should be pushed to Increff for fulfilment. */
export function shouldFulfilViaIncreff(order: {
  platform?: string | null;
  shippingCity?: string | null;
}): boolean {
  const p = String(order.platform ?? '').toLowerCase();
  const city = normaliseCity(order.shippingCity);
  return (p === 'quickgo' || p === 'hecate-quickgo') && city === 'bangalore';
}
