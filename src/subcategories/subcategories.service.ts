import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubcategoryDto, UpdateSubcategoryDto } from './dto';

@Injectable()
export class SubcategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Public subcategory listing with two optional filters used by the
   * QuickGo storefront:
   *   - `platform`: only subcategories opted into this surface
   *     (e.g. "quickgo") AND whose parent Category is ALSO opted in.
   *   - `city`: only subcategories assigned to a state with this city
   *     AND whose parent Category is ALSO assigned to that city.
   *
   * The parent-category check is deliberate: the user's rule is
   * "agar catogry h hi nhi us state me toh subcategory bhi nhi" — an
   * admin typo in the subcategory's state list shouldn't override the
   * category's city allowlist. We run a pre-query to resolve the
   * eligible category ids and then scope the subcategory query to them.
   */
  async findAll(opts?: { platform?: string; city?: string }) {
    const where: any = { deleted: 0 };
    if (opts?.platform) {
      where.platform = { has: opts.platform.toLowerCase() };
    }
    if (opts?.city) {
      where.states = {
        some: {
          deleted: 0,
          city: { equals: opts.city.trim(), mode: 'insensitive' },
        },
      };
    }
    if (opts?.platform || opts?.city) {
      const parentWhere: any = { deleted: 0 };
      if (opts.platform) parentWhere.platform = { has: opts.platform.toLowerCase() };
      if (opts.city) {
        parentWhere.states = {
          some: {
            deleted: 0,
            city: { equals: opts.city.trim(), mode: 'insensitive' },
          },
        };
      }
      const eligibleCategories = await this.prisma.category.findMany({
        where: parentWhere,
        select: { id: true },
      });
      const ids = eligibleCategories.map((c) => c.id);
      if (ids.length === 0) return [];
      where.categoryId = { in: ids };
    }
    return this.prisma.subcategory.findMany({
      where,
      include: {
        category: true,
        states: { where: { deleted: 0 } },
      },
    });
  }

  async findOne(id: number) {
    const subcategory = await this.prisma.subcategory.findFirst({
      where: { id, deleted: 0 },
      include: {
        category: true,
        states: { where: { deleted: 0 } },
      },
    });
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    return subcategory;
  }

  async findByCategoryId(
    categoryId: number,
    opts?: { platform?: string; city?: string },
  ) {
    const where: any = { categoryId, deleted: 0 };
    if (opts?.platform) {
      where.platform = { has: opts.platform.toLowerCase() };
    }
    if (opts?.city) {
      where.states = {
        some: {
          deleted: 0,
          city: { equals: opts.city.trim(), mode: 'insensitive' },
        },
      };
    }
    // Parent guard — if platform/city filters knock the parent category
    // out, the whole list becomes empty (subcategory can't survive
    // without its category being eligible).
    if (opts?.platform || opts?.city) {
      const parentWhere: any = { id: categoryId, deleted: 0 };
      if (opts.platform) parentWhere.platform = { has: opts.platform.toLowerCase() };
      if (opts.city) {
        parentWhere.states = {
          some: {
            deleted: 0,
            city: { equals: opts.city.trim(), mode: 'insensitive' },
          },
        };
      }
      const parent = await this.prisma.category.findFirst({
        where: parentWhere,
        select: { id: true },
      });
      if (!parent) return [];
    }
    return this.prisma.subcategory.findMany({
      where,
      include: {
        category: true,
        states: { where: { deleted: 0 } },
      },
    });
  }

  async create(dto: CreateSubcategoryDto) {
    const { stateIds, ...rest } = dto;
    return this.prisma.subcategory.create({
      data: {
        ...rest,
        states: stateIds?.length
          ? { connect: stateIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        category: true,
        states: { where: { deleted: 0 } },
      },
    });
  }

  async update(id: number, dto: UpdateSubcategoryDto) {
    await this.findOne(id);
    const { stateIds, ...rest } = dto;
    return this.prisma.subcategory.update({
      where: { id },
      data: {
        ...rest,
        states:
          stateIds !== undefined
            ? { set: stateIds.map((sid) => ({ id: sid })) }
            : undefined,
      },
      include: {
        category: true,
        states: { where: { deleted: 0 } },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.subcategory.update({
      where: { id },
      data: { deleted: 1 },
    });
  }
}
