import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkuMappingDto } from './dto';

export interface LocationSummary {
  locationCode: string;
  quantity: number;
  minExpiry: string | null;
  updatedAt: Date;
  ourSku: string | null;
  /** id of the mapping row that applies here (global or per-location). */
  mappingId: number | null;
  /** true when the mapping that resolves for this location is a
   *  per-location override, false when the global mapping is in effect. */
  isOverride: boolean;
}

export interface GroupedInventoryRow {
  channelSkuCode: string;
  totalQuantity: number;
  locations: LocationSummary[];
  /** The single mapping (when the global mapping is the same everywhere). */
  globalMapping: { id: number; ourSku: string } | null;
  /** true when at least one location has a per-location override. */
  hasPerLocationOverride: boolean;
  /** true when every location has either the global mapping or an override. */
  fullyMapped: boolean;
}

@Injectable()
export class SkuMappingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.bangaloreIncreffMappingSKU.findMany({
      orderBy: { id: 'desc' },
    });
  }

  /**
   * Grouped snapshot for the SKU mapping page. Each returned row is a
   * single `channelSkuCode` with the list of locations that carry it, plus
   * whichever mapping applies at each location (per-location override wins
   * over the global mapping). This lets the admin map once and have the
   * choice cascade to every location, or expand the group and override
   * a single warehouse when needed.
   */
  async findInventoryWithMappings(): Promise<GroupedInventoryRow[]> {
    const [inventory, mappings] = await Promise.all([
      this.prisma.bangaloreIncreffInventory.findMany({
        orderBy: [{ channelSkuCode: 'asc' }, { locationCode: 'asc' }],
      }),
      this.prisma.bangaloreIncreffMappingSKU.findMany(),
    ]);

    // Fast lookup keyed by `channelSku::locationCode`, with the global
    // (null-location) mapping stashed under `channelSku::*`.
    type MappingRow = (typeof mappings)[number];
    const globalByChannel = new Map<string, MappingRow>();
    const overrideByKey = new Map<string, MappingRow>();
    for (const m of mappings) {
      if (m.locationCode == null) {
        globalByChannel.set(m.channelSku, m);
      } else {
        overrideByKey.set(`${m.channelSku}::${m.locationCode}`, m);
      }
    }

    const byChannel = new Map<string, GroupedInventoryRow>();
    for (const inv of inventory) {
      const bucket =
        byChannel.get(inv.channelSkuCode) ??
        ({
          channelSkuCode: inv.channelSkuCode,
          totalQuantity: 0,
          locations: [],
          globalMapping: null,
          hasPerLocationOverride: false,
          fullyMapped: false,
        } as GroupedInventoryRow);

      const override = overrideByKey.get(
        `${inv.channelSkuCode}::${inv.locationCode}`,
      );
      const global = globalByChannel.get(inv.channelSkuCode);
      const applied = override ?? global ?? null;

      bucket.totalQuantity += inv.quantity;
      bucket.locations.push({
        locationCode: inv.locationCode,
        quantity: inv.quantity,
        minExpiry: inv.minExpiry,
        updatedAt: inv.updatedAt,
        ourSku: applied?.ourSku ?? null,
        mappingId: applied?.id ?? null,
        isOverride: !!override,
      });
      if (override) bucket.hasPerLocationOverride = true;
      if (global) {
        bucket.globalMapping = { id: global.id, ourSku: global.ourSku };
      }
      byChannel.set(inv.channelSkuCode, bucket);
    }

    return Array.from(byChannel.values()).map((g) => ({
      ...g,
      fullyMapped: g.locations.every((l) => !!l.ourSku),
    }));
  }

  /**
   * List all internal product + variation SKUs so the admin can pick one
   * when mapping an incoming channel SKU. Variations carry their parent
   * product name for easier scanning in long lists.
   */
  async listInternalSkus() {
    const [products, variations] = await Promise.all([
      this.prisma.product.findMany({
        where: { deleted: 0 },
        select: { id: true, name: true, sku: true },
      }),
      this.prisma.productVariation.findMany({
        where: { deleted: 0 },
        select: {
          id: true,
          sku: true,
          variationName: true,
          product: { select: { id: true, name: true } },
        },
      }),
    ]);

    return [
      ...products.map((p) => ({
        sku: p.sku,
        label: p.name,
        kind: 'PRODUCT' as const,
        productId: p.id,
        productName: p.name,
      })),
      ...variations.map((v) => ({
        sku: v.sku,
        label: `${v.product?.name ?? 'Variation'} — ${v.variationName}`,
        kind: 'VARIATION' as const,
        productId: v.product?.id ?? null,
        productName: v.product?.name ?? null,
      })),
    ];
  }

  /**
   * Upsert a SKU mapping.
   *
   * Two modes:
   *   - `locationCode` provided → per-location override for that
   *     specific warehouse. One row keyed on (channelSku, locationCode).
   *   - `locationCode` omitted → "map to every location that carries
   *     this channelSku". We expand the request across every distinct
   *     locationCode that currently holds this channelSku in
   *     BangaloreIncreffInventory, writing one concrete row per
   *     location with the chosen ourSku. No null-location rows are
   *     created anymore — the downstream QuickGo resolver stays simple
   *     and keys stock directly off the warehouse's `code` without
   *     needing a null-fallback lookup.
   *
   * Backward-compat: an old null-locationCode row for this channelSku
   * (from the previous global-mapping era) is cleaned up at the end so
   * the table converges to the new per-location shape.
   */
  async create(dto: CreateSkuMappingDto) {
    if (dto.locationCode) {
      const locationCode = dto.locationCode;
      const existing = await this.prisma.bangaloreIncreffMappingSKU.findFirst({
        where: { channelSku: dto.channelSku, locationCode },
      });
      if (existing) {
        return this.prisma.bangaloreIncreffMappingSKU.update({
          where: { id: existing.id },
          data: { ourSku: dto.ourSku },
        });
      }
      return this.prisma.bangaloreIncreffMappingSKU.create({
        data: {
          channelSku: dto.channelSku,
          ourSku: dto.ourSku,
          locationCode,
        },
      });
    }

    // No explicit location → expand across every locationCode that
    // currently stocks this channelSku. If no inventory row exists yet
    // we still create a single null-location row as a placeholder so
    // the admin can map ahead of the first sync; it'll get replaced by
    // concrete per-location rows the next time this method runs with
    // inventory present.
    const inventoryRows = await this.prisma.bangaloreIncreffInventory.findMany({
      where: { channelSkuCode: dto.channelSku },
      select: { locationCode: true },
    });
    const locationCodes = [
      ...new Set(
        inventoryRows.map((r) => r.locationCode).filter(Boolean) as string[],
      ),
    ];

    if (locationCodes.length === 0) {
      const existing = await this.prisma.bangaloreIncreffMappingSKU.findFirst({
        where: { channelSku: dto.channelSku, locationCode: null },
      });
      if (existing) {
        return this.prisma.bangaloreIncreffMappingSKU.update({
          where: { id: existing.id },
          data: { ourSku: dto.ourSku },
        });
      }
      return this.prisma.bangaloreIncreffMappingSKU.create({
        data: {
          channelSku: dto.channelSku,
          ourSku: dto.ourSku,
          locationCode: null,
        },
      });
    }

    // Upsert one row per locationCode in a transaction so the table
    // never shows a partial view while this runs. The last-written row
    // is returned so the controller still has something to echo back.
    const ops = locationCodes.map((code) =>
      this.prisma.bangaloreIncreffMappingSKU.upsert({
        where: {
          // `(channelSku, locationCode)` composite unique — generated by
          // Prisma from the @@unique in the schema.
          channelSku_locationCode: {
            channelSku: dto.channelSku,
            locationCode: code,
          },
        },
        create: {
          channelSku: dto.channelSku,
          ourSku: dto.ourSku,
          locationCode: code,
        },
        update: { ourSku: dto.ourSku },
      }),
    );
    // Clean up legacy null-location row once per-location rows exist —
    // it can't resolve anything the concrete rows don't already cover
    // and would otherwise shadow a per-location override on read.
    ops.push(
      this.prisma.bangaloreIncreffMappingSKU.deleteMany({
        where: { channelSku: dto.channelSku, locationCode: null },
      }) as any,
    );
    const results = await this.prisma.$transaction(ops);
    // First N results are the upserted rows; the last one is the
    // deleteMany count. Return the first upsert so the frontend has a
    // representative row.
    return results[0];
  }

  async remove(id: number) {
    const existing = await this.prisma.bangaloreIncreffMappingSKU.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Mapping not found');
    return this.prisma.bangaloreIncreffMappingSKU.delete({ where: { id } });
  }
}
