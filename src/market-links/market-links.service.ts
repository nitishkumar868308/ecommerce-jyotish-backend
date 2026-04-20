import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarketLinkDto, UpdateMarketLinkDto } from './dto';

@Injectable()
export class MarketLinksService {
  constructor(private prisma: PrismaService) {}

  async findAll(productId?: string) {
    return this.prisma.marketLink.findMany({
      where: {
        deleted: false,
        ...(productId ? { productId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const hit = await this.prisma.marketLink.findFirst({
      where: { id, deleted: false },
    });
    if (!hit) throw new NotFoundException('Market link not found');
    return hit;
  }

  async create(dto: CreateMarketLinkDto) {
    return this.prisma.marketLink.create({ data: dto });
  }

  async update(id: string, dto: UpdateMarketLinkDto) {
    await this.findOne(id);
    return this.prisma.marketLink.update({ where: { id }, data: dto });
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.marketLink.update({
      where: { id },
      data: { deleted: true },
    });
  }
}
