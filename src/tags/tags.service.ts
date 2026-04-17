import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto, UpdateTagDto } from './dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({
      where: { deleted: false },
    });
  }

  async findOne(id: number) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, deleted: false },
    });
    if (!tag) throw new NotFoundException('Tag not found');
    return tag;
  }

  async create(dto: CreateTagDto) {
    return this.prisma.tag.create({ data: dto });
  }

  async update(id: number, dto: UpdateTagDto) {
    await this.findOne(id);
    return this.prisma.tag.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.tag.update({
      where: { id },
      data: { deleted: true },
    });
  }
}
