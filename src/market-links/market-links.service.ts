import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarketLinkDto } from './dto';

@Injectable()
export class MarketLinksService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.marketLink.findMany({
      where: { deleted: false },
    });
  }

  async create(dto: CreateMarketLinkDto) {
    return this.prisma.marketLink.create({ data: dto });
  }
}
