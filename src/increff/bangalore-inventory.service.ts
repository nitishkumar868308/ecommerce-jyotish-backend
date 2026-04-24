import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ListArgs {
  page?: number;
  limit?: number;
  search?: string;
}

// Returns the Increff-pushed inventory rows paired with their SKU mapping
// (when present) and the resolved product name so the admin dashboard can
// render "channelSkuCode → internal product" at a glance.
@Injectable()
export class BangaloreInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ page = 1, limit = 20, search }: ListArgs) {
    const skip = Math.max(0, (page - 1) * limit);
    const where = search
      ? {
          OR: [
            { channelSkuCode: { contains: search, mode: 'insensitive' as const } },
            { locationCode: { contains: search, mode: 'insensitive' as const } },
            { clientSkuId: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.bangaloreIncreffInventory.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.bangaloreIncreffInventory.count({ where }),
    ]);

    // Pre-load mappings + product info so the admin table can render the
    // mapped product's name on each row without N+1 queries.
    const channelSkus = Array.from(new Set(rows.map((r) => r.channelSkuCode)));
    const mappings = channelSkus.length
      ? await this.prisma.bangaloreIncreffMappingSKU.findMany({
          where: { channelSku: { in: channelSkus } },
        })
      : [];
    const mappingByKey = new Map<string, (typeof mappings)[number]>();
    for (const m of mappings) {
      // key is `${channelSku}::${locationCode ?? '*'}` so a per-location
      // override beats the global mapping during lookup.
      const loc = (m as any).locationCode ?? '*';
      mappingByKey.set(`${m.channelSku}::${loc}`, m);
      if (loc === '*') {
        mappingByKey.set(`${m.channelSku}::*`, m);
      }
    }
    const ourSkus = Array.from(
      new Set(mappings.map((m) => m.ourSku).filter(Boolean)),
    );
    const [products, variations] = await Promise.all([
      ourSkus.length
        ? this.prisma.product.findMany({
            where: { sku: { in: ourSkus }, deleted: 0 },
            select: { id: true, name: true, sku: true },
          })
        : Promise.resolve([]),
      ourSkus.length
        ? this.prisma.productVariation.findMany({
            where: { sku: { in: ourSkus }, deleted: 0 },
            select: {
              id: true,
              sku: true,
              variationName: true,
              product: { select: { id: true, name: true } },
            },
          })
        : Promise.resolve([]),
    ]);
    const productBySku = new Map(
      products.map((p) => [p.sku, p] as const),
    );
    const variationBySku = new Map(
      variations.map((v) => [v.sku, v] as const),
    );

    const data = rows.map((row) => {
      // Prefer a location-specific mapping; fall back to the global one.
      const specific = mappingByKey.get(
        `${row.channelSkuCode}::${row.locationCode}`,
      );
      const global = mappingByKey.get(`${row.channelSkuCode}::*`);
      const mapping = specific ?? global ?? null;

      const product = mapping ? productBySku.get(mapping.ourSku) : undefined;
      const variation = mapping ? variationBySku.get(mapping.ourSku) : undefined;

      return {
        id: row.id,
        channelSkuCode: row.channelSkuCode,
        locationCode: row.locationCode,
        quantity: row.quantity,
        stock: row.quantity,
        clientSkuId: row.clientSkuId,
        minExpiry: row.minExpiry,
        updatedAt: row.updatedAt,
        lastSynced: row.updatedAt,
        sku: mapping?.ourSku ?? null,
        mapped: !!mapping,
        mappingId: mapping?.id ?? null,
        product: product
          ? { name: product.name, sku: product.sku }
          : variation
            ? {
                name: `${variation.product?.name ?? 'Variation'} \u2014 ${variation.variationName}`,
                sku: variation.sku,
              }
            : null,
      };
    });

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
