import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubcategoryDto, UpdateSubcategoryDto } from './dto';

@Injectable()
export class SubcategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.subcategory.findMany({
      where: { deleted: 0 },
      include: { category: true },
    });
  }

  async findOne(id: number) {
    const subcategory = await this.prisma.subcategory.findFirst({
      where: { id, deleted: 0 },
      include: { category: true },
    });
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    return subcategory;
  }

  async findByCategoryId(categoryId: number) {
    return this.prisma.subcategory.findMany({
      where: { categoryId, deleted: 0 },
      include: { category: true },
    });
  }

  async create(dto: CreateSubcategoryDto) {
    return this.prisma.subcategory.create({
      data: dto,
      include: { category: true },
    });
  }

  async update(id: number, dto: UpdateSubcategoryDto) {
    await this.findOne(id);
    return this.prisma.subcategory.update({
      where: { id },
      data: dto,
      include: { category: true },
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
