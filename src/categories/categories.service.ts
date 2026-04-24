import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Public category listing. Two optional filters, both used by
   * QuickGo:
   *   - `platform`: only return categories whose `platform` array
   *     contains this key (e.g. "quickgo"). Wizard callers pass
   *     nothing and get the full list.
   *   - `city`: only return categories whose `states` relation
   *     includes at least one State row with a matching city. Filtering
   *     is done via the relation instead of the State.name so admins
   *     who assign a state by city name get the expected behaviour
   *     regardless of state spelling.
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
    return this.prisma.category.findMany({
      where,
      include: {
        subcategories: { where: { deleted: 0 } },
        states: { where: { deleted: 0 } },
      },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findFirst({
      where: { id, deleted: 0 },
      include: {
        subcategories: { where: { deleted: 0 } },
        states: { where: { deleted: 0 } },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const { stateIds, ...rest } = dto;
    return this.prisma.category.create({
      data: {
        ...rest,
        states: stateIds?.length
          ? { connect: stateIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        subcategories: { where: { deleted: 0 } },
        states: { where: { deleted: 0 } },
      },
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);
    const { stateIds, ...rest } = dto;
    return this.prisma.category.update({
      where: { id },
      data: {
        ...rest,
        states:
          stateIds !== undefined
            ? { set: stateIds.map((sid) => ({ id: sid })) }
            : undefined,
      },
      include: {
        subcategories: { where: { deleted: 0 } },
        states: { where: { deleted: 0 } },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: { deleted: 1 },
    });
  }
}
