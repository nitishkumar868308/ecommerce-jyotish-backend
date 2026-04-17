import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttributeDto, UpdateAttributeDto } from './dto';

@Injectable()
export class AttributesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.attribute.findMany({
      where: { deleted: 0 },
    });
  }

  async findOne(id: number) {
    const attribute = await this.prisma.attribute.findFirst({
      where: { id, deleted: 0 },
    });
    if (!attribute) throw new NotFoundException('Attribute not found');
    return attribute;
  }

  async create(dto: CreateAttributeDto) {
    return this.prisma.attribute.create({ data: dto });
  }

  async update(id: number, dto: UpdateAttributeDto) {
    await this.findOne(id);
    return this.prisma.attribute.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.attribute.update({
      where: { id },
      data: { deleted: 1 },
    });
  }
}
