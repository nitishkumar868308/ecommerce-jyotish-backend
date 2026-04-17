import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCountryPricingDto, UpdateCountryPricingDto } from './dto';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.countryPricing.findMany({
      where: { deleted: 0 },
    });
  }

  async create(dto: CreateCountryPricingDto) {
    return this.prisma.countryPricing.create({ data: dto });
  }

  async update(id: number, dto: UpdateCountryPricingDto) {
    const existing = await this.prisma.countryPricing.findFirst({
      where: { id, deleted: 0 },
    });
    if (!existing) throw new NotFoundException('Country pricing not found');
    return this.prisma.countryPricing.update({ where: { id }, data: dto });
  }
}
