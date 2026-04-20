import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  CreateProductVariationDto,
  ProductMarketLinkDto,
} from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/**
 * Best-effort SEO auto-fill. Admin UI hides these fields, so we populate them
 * here when missing — slug from name, meta/keywords from description + tags.
 */
function deriveSeo(
  dto: { name: string; short?: string; description?: string },
  tagNames: string[],
) {
  return {
    slug: slugify(dto.name),
    metaTitle: dto.name.slice(0, 60),
    metaDescription: (dto.short || dto.description || dto.name).slice(0, 160),
    keywords: [dto.name, ...tagNames].filter(Boolean).join(', ').slice(0, 200),
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly fullInclude = {
    variations: { include: { tags: true } },
    category: true,
    subcategory: true,
    offers: true,
    tags: true,
    marketLinks: true,
    primaryOffer: true,
  } satisfies Prisma.ProductInclude;

  // --------------------------------------------------
  // Create
  // --------------------------------------------------

  async create(dto: CreateProductDto) {
    const {
      variations,
      tagIds,
      offerIds,
      marketLinks,
      bulkPricingTiers,
      slug,
      metaTitle,
      metaDescription,
      keywords,
      ...productData
    } = dto;

    await this.ensureSkuAvailable(dto.sku, null);

    const tagNames = tagIds?.length
      ? (
          await this.prisma.tag.findMany({
            where: { id: { in: tagIds } },
            select: { name: true },
          })
        ).map((t) => t.name)
      : [];
    const seo = deriveSeo(dto, tagNames);

    return this.prisma.product.create({
      data: {
        ...productData,
        slug: slug ?? (await this.uniqueSlug(seo.slug)),
        metaTitle: metaTitle ?? seo.metaTitle,
        metaDescription: metaDescription ?? seo.metaDescription,
        keywords: keywords ?? seo.keywords,
        bulkPricingTiers:
          bulkPricingTiers === undefined
            ? undefined
            : (bulkPricingTiers as unknown as Prisma.InputJsonValue),
        ...(variations?.length && {
          variations: {
            create: variations.map((v) => this.toVariationCreate(v)),
          },
        }),
        ...(tagIds?.length && {
          tags: { connect: tagIds.map((id) => ({ id })) },
        }),
        ...(offerIds?.length && {
          offers: { connect: offerIds.map((id) => ({ id })) },
        }),
        ...(marketLinks?.length && {
          marketLinks: {
            create: marketLinks.map((m) => this.toMarketLinkCreate(m)),
          },
        }),
      },
      include: this.fullInclude,
    });
  }

  // --------------------------------------------------
  // Read
  // --------------------------------------------------

  async findAllActive(countryCode?: string) {
    const products = await this.prisma.product.findMany({
      where: { active: true, deleted: 0 },
      include: this.fullInclude,
    });
    return this.applyCountryPricing(products, countryCode);
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: { deleted: 0 },
      include: this.fullInclude,
    });
  }

  async findOne(idOrSlug: string, countryCode?: string) {
    let product = await this.prisma.product.findUnique({
      where: { id: idOrSlug },
      include: this.fullInclude,
    });
    if (!product) {
      product = await this.prisma.product.findUnique({
        where: { slug: idOrSlug },
        include: this.fullInclude,
      });
    }
    if (!product || product.deleted === 1) {
      throw new NotFoundException('Product not found');
    }
    const [scoped] = await this.applyCountryPricing([product], countryCode);
    return scoped;
  }

  async findAllPaginated(
    page: number,
    limit: number,
    filters?: {
      categoryId?: string;
      subcategoryId?: string;
      search?: string;
      tags?: string;
      minPrice?: string;
      maxPrice?: string;
      sortBy?: string;
      sortOrder?: string;
      letter?: string;
      platform?: string;
      city?: string;
      countryCode?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.ProductWhereInput = { active: true, deleted: 0 };

    if (filters?.categoryId)
      where.categoryId = parseInt(filters.categoryId, 10);
    if (filters?.subcategoryId)
      where.subcategoryId = parseInt(filters.subcategoryId, 10);
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.tags) {
      const tagNames = filters.tags.split(',').map((t) => t.trim());
      where.tags = { some: { name: { in: tagNames } } };
    }
    if (filters?.minPrice) {
      where.price = { ...(where.price as object), gte: filters.minPrice };
    }
    if (filters?.maxPrice) {
      where.price = { ...(where.price as object), lte: filters.maxPrice };
    }
    if (filters?.letter)
      where.name = { startsWith: filters.letter, mode: 'insensitive' };

    // Platform filter — products have a `platform` string[] column; match
    // any product that lists the requested surface.
    if (filters?.platform) {
      const p = filters.platform.toLowerCase();
      (where as any).platform = { has: p };
    }

    // QuickGo city filter — limit to products with stock in that city's
    // warehouse. We intentionally compute the product-id list separately
    // because WarehouseStock isn't a declared Prisma relation on Product yet
    // (see the Increff integration task). If the table is missing in a
    // deployment the filter short-circuits to "no restriction" instead of
    // crashing. Product.id is a cuid string, so we coerce defensively.
    if (filters?.city) {
      try {
        const normalisedCity = filters.city.toLowerCase().trim();
        const rows = await this.prisma.$queryRawUnsafe<
          Array<{ productId: string | number }>
        >(
          `SELECT DISTINCT "productId"
           FROM "WarehouseStock"
           WHERE LOWER("warehouseCode") = $1
             AND "onHand" > 0`,
          normalisedCity,
        );
        const ids = rows
          .map((r) => (r.productId == null ? null : String(r.productId)))
          .filter((id): id is string => id !== null);
        if (ids.length === 0) {
          // Nothing stocked in this city — return empty deterministically.
          return {
            products: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          };
        }
        where.id = { in: ids };
      } catch {
        // WarehouseStock table not deployed yet — no-op. Once the Prisma
        // model + Increff inventory sync is wired this block will kick in.
      }
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = {
      createdAt: 'desc',
    };
    if (filters?.sortBy) {
      const order = filters.sortOrder === 'asc' ? 'asc' : 'desc';
      if (filters.sortBy === 'price') orderBy = { price: order };
      else if (filters.sortBy === 'name') orderBy = { name: order };
      else if (filters.sortBy === 'createdAt') orderBy = { createdAt: order };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: this.fullInclude,
      }),
      this.prisma.product.count({ where }),
    ]);

    const scoped = await this.applyCountryPricing(products, filters?.countryCode);

    return {
      products: scoped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // --------------------------------------------------
  // Update
  // --------------------------------------------------

  async update(dto: UpdateProductDto) {
    const {
      id,
      variations,
      tagIds,
      offerIds,
      marketLinks,
      bulkPricingTiers,
      sku,
      ...productData
    } = dto;

    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    if (sku && sku !== existing.sku) {
      await this.ensureSkuAvailable(sku, id);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(sku !== undefined && { sku }),
        ...(bulkPricingTiers !== undefined && {
          bulkPricingTiers: bulkPricingTiers as unknown as Prisma.InputJsonValue,
        }),
        ...(tagIds && {
          tags: { set: tagIds.map((tagId) => ({ id: tagId })) },
        }),
        ...(offerIds && {
          offers: { set: offerIds.map((offerId) => ({ id: offerId })) },
        }),
        ...(variations && {
          variations: {
            deleteMany: {},
            create: variations.map((v) => this.toVariationCreate(v)),
          },
        }),
        ...(marketLinks && {
          marketLinks: {
            deleteMany: {},
            create: marketLinks.map((m) => this.toMarketLinkCreate(m)),
          },
        }),
      },
      include: this.fullInclude,
    });
  }

  // --------------------------------------------------
  // Delete / toggle
  // --------------------------------------------------

  async softDelete(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    return this.prisma.product.update({
      where: { id },
      data: { deleted: 1 },
    });
  }

  async toggleActive(id: string, active: boolean) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data: { active } });
  }

  async deleteVariation(variationId: string) {
    const existing = await this.prisma.productVariation.findUnique({
      where: { id: variationId },
    });
    if (!existing) throw new NotFoundException('Variation not found');
    return this.prisma.productVariation.delete({ where: { id: variationId } });
  }

  // --------------------------------------------------
  // Utility (public — used by controller for sku check)
  // --------------------------------------------------

  async isSkuAvailable(sku: string, ignoreId?: string) {
    const hit = await this.prisma.product.findUnique({ where: { sku } });
    if (!hit) {
      const vHit = await this.prisma.productVariation.findUnique({
        where: { sku },
      });
      return !vHit;
    }
    if (ignoreId && hit.id === ignoreId) return true;
    return false;
  }

  // --------------------------------------------------
  // Internal helpers
  // --------------------------------------------------

  private async ensureSkuAvailable(sku: string, ignoreId: string | null) {
    const ok = await this.isSkuAvailable(sku, ignoreId ?? undefined);
    if (!ok) throw new ConflictException(`SKU "${sku}" is already in use`);
  }

  private async uniqueSlug(base: string): Promise<string> {
    if (!base) return `product-${Date.now()}`;
    let candidate = base;
    let n = 1;
    while (true) {
      const taken = await this.prisma.product.findUnique({
        where: { slug: candidate },
      });
      if (!taken) return candidate;
      n += 1;
      candidate = `${base}-${n}`;
      if (n > 50) return `${base}-${Date.now()}`;
    }
  }

  private toVariationCreate(
    v: CreateProductVariationDto,
  ): Prisma.ProductVariationCreateWithoutProductInput {
    const { tagIds, attributeCombo, bulkPricingTiers, ...rest } = v;
    return {
      ...rest,
      bulkPricingTiers: bulkPricingTiers
        ? (bulkPricingTiers as unknown as Prisma.InputJsonValue)
        : undefined,
      attributeCombo: attributeCombo
        ? (attributeCombo as unknown as Prisma.InputJsonValue)
        : undefined,
      ...(tagIds?.length && {
        tags: { connect: tagIds.map((id) => ({ id })) },
      }),
    };
  }

  private toMarketLinkCreate(
    m: ProductMarketLinkDto,
  ): Prisma.MarketLinkCreateWithoutProductInput {
    return {
      name: m.name,
      url: m.url,
      countryName: m.countryName,
      countryCode: m.countryCode,
    };
  }

  private async applyCountryPricing<T extends { price: string | null; variations: Array<{ price: string | null }> }>(
    products: T[],
    countryCode?: string,
  ): Promise<any[]> {
    if (!countryCode) return products as unknown as any[];
    const cp = await this.prisma.countryPricing.findUnique({
      where: { code: countryCode },
    });
    if (!cp?.multiplier) return products as unknown as any[];
    const rate = (cp.conversionRate ?? 1) * cp.multiplier;
    return products.map((p) => ({
      ...p,
      price: p.price ? (parseFloat(p.price) * rate).toFixed(2) : p.price,
      currency: cp.currency,
      currencySymbol: cp.currencySymbol,
      variations: p.variations.map((v) => ({
        ...v,
        price: v.price ? (parseFloat(v.price) * rate).toFixed(2) : v.price,
      })),
    }));
  }
}
