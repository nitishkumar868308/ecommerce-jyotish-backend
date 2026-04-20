import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { deleted: 0 },
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
