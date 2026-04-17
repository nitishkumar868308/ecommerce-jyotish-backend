import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly fullInclude = {
    variations: true,
    category: true,
    subcategory: true,
    offers: true,
    tags: true,
    marketLinks: true,
    primaryOffer: true,
  };

  async create(dto: CreateProductDto) {
    const { variations, tagIds, offerIds, ...productData } = dto;

    return this.prisma.product.create({
      data: {
        ...productData,
        ...(variations?.length && {
          variations: {
            create: variations,
          },
        }),
        ...(tagIds?.length && {
          tags: {
            connect: tagIds.map((id) => ({ id })),
          },
        }),
        ...(offerIds?.length && {
          offers: {
            connect: offerIds.map((id) => ({ id })),
          },
        }),
      },
      include: this.fullInclude,
    });
  }

  async findAllActive(countryCode?: string) {
    const products = await this.prisma.product.findMany({
      where: { active: true, deleted: 0 },
      include: this.fullInclude,
    });

    if (countryCode) {
      const countryPricing = await this.prisma.countryPricing.findUnique({
        where: { code: countryCode },
      });

      if (countryPricing?.multiplier) {
        return products.map((product) => ({
          ...product,
          price: product.price
            ? String(
                (parseFloat(product.price) * countryPricing.multiplier).toFixed(
                  2,
                ),
              )
            : product.price,
          currency: countryPricing.currency,
          currencySymbol: countryPricing.currencySymbol,
          variations: product.variations.map((v) => ({
            ...v,
            price: v.price
              ? String(
                  (
                    parseFloat(v.price) * countryPricing.multiplier
                  ).toFixed(2),
                )
              : v.price,
          })),
        }));
      }
    }

    return products;
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: { deleted: 0 },
      include: this.fullInclude,
    });
  }

  async findOne(idOrSlug: string, countryCode?: string) {
    // Try by id first, then by slug
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
      throw new NotFoundException(`Product not found`);
    }

    if (countryCode) {
      const countryPricing = await this.prisma.countryPricing.findUnique({
        where: { code: countryCode },
      });
      if (countryPricing?.multiplier) {
        return {
          ...product,
          price: product.price
            ? String((parseFloat(product.price) * countryPricing.multiplier).toFixed(2))
            : product.price,
          currency: countryPricing.currency,
          currencySymbol: countryPricing.currencySymbol,
          variations: product.variations.map((v) => ({
            ...v,
            price: v.price
              ? String((parseFloat(v.price) * countryPricing.multiplier).toFixed(2))
              : v.price,
          })),
        };
      }
    }

    return product;
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
      countryCode?: string;
    },
  ) {
    const skip = (page - 1) * limit;

    const where: any = { active: true, deleted: 0 };

    if (filters?.categoryId) {
      where.categoryId = parseInt(filters.categoryId, 10);
    }
    if (filters?.subcategoryId) {
      where.subcategoryId = parseInt(filters.subcategoryId, 10);
    }
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
      where.price = { ...(where.price || {}), gte: filters.minPrice };
    }
    if (filters?.maxPrice) {
      where.price = { ...(where.price || {}), lte: filters.maxPrice };
    }
    if (filters?.letter) {
      where.name = { startsWith: filters.letter, mode: 'insensitive' };
    }

    let orderBy: any = { createdAt: 'desc' };
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
        include: {
          category: true,
          subcategory: true,
          tags: true,
          primaryOffer: true,
          offers: true,
          variations: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Apply country pricing if needed
    let finalProducts = products;
    if (filters?.countryCode) {
      const countryPricing = await this.prisma.countryPricing.findUnique({
        where: { code: filters.countryCode },
      });
      if (countryPricing?.multiplier) {
        finalProducts = products.map((product) => ({
          ...product,
          price: product.price
            ? String((parseFloat(product.price) * countryPricing.multiplier).toFixed(2))
            : product.price,
          currency: countryPricing.currency,
          currencySymbol: countryPricing.currencySymbol,
          variations: product.variations.map((v) => ({
            ...v,
            price: v.price
              ? String((parseFloat(v.price) * countryPricing.multiplier).toFixed(2))
              : v.price,
          })),
        })) as any;
      }
    }

    return {
      products: finalProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(dto: UpdateProductDto) {
    const { id, variations, tagIds, offerIds, ...productData } = dto;

    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(tagIds && {
          tags: {
            set: tagIds.map((tagId) => ({ id: tagId })),
          },
        }),
        ...(offerIds && {
          offers: {
            set: offerIds.map((offerId) => ({ id: offerId })),
          },
        }),
        ...(variations && {
          variations: {
            deleteMany: {},
            create: variations,
          },
        }),
      },
      include: this.fullInclude,
    });
  }

  async softDelete(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return this.prisma.product.update({
      where: { id },
      data: { deleted: 1 },
    });
  }

  async toggleActive(id: string, active: boolean) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return this.prisma.product.update({
      where: { id },
      data: { active },
    });
  }

  async deleteVariation(variationId: string) {
    const existing = await this.prisma.productVariation.findUnique({
      where: { id: variationId },
    });
    if (!existing) {
      throw new NotFoundException(
        `Variation with id ${variationId} not found`,
      );
    }

    return this.prisma.productVariation.delete({
      where: { id: variationId },
    });
  }
}
