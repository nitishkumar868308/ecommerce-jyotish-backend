import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubcategoryDto, UpdateSubcategoryDto } from './dto';

@Injectable()
export class SubcategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.subcategory.findMany({
      where: { deleted: 0 },
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

  async findByCategoryId(categoryId: number) {
    return this.prisma.subcategory.findMany({
      where: { categoryId, deleted: 0 },
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
