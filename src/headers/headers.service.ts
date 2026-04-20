import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHeaderDto, UpdateHeaderDto } from './dto';

@Injectable()
export class HeadersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Earliest-created menu items render first on the storefront — admin
    // expects newly-added items to appear at the END of the menu.
    return this.prisma.header.findMany({
      where: { deleted: 0 },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: number) {
    const header = await this.prisma.header.findFirst({
      where: { id, deleted: 0 },
    });
    if (!header) throw new NotFoundException('Header not found');
    return header;
  }

  async create(dto: CreateHeaderDto) {
    return this.prisma.header.create({ data: dto });
  }

  async update(id: number, dto: UpdateHeaderDto) {
    await this.findOne(id);
    return this.prisma.header.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.header.update({
      where: { id },
      data: { deleted: 1 },
    });
  }
}
