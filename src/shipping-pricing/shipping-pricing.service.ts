import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingPricingDto, UpdateShippingPricingDto } from './dto';

@Injectable()
export class ShippingPricingService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.shippingPricing.findMany({
      where: { deleted: 0 },
    });
  }

  async findByCountry(country: string) {
    return this.prisma.shippingPricing.findMany({
      where: { deleted: 0, country },
    });
  }

  async create(dto: CreateShippingPricingDto) {
    return this.prisma.shippingPricing.create({ data: dto });
  }

  async update(id: string, dto: UpdateShippingPricingDto) {
    const existing = await this.prisma.shippingPricing.findFirst({
      where: { id, deleted: 0 },
    });
    if (!existing) throw new NotFoundException('Shipping pricing not found');
    return this.prisma.shippingPricing.update({ where: { id }, data: dto });
  }
}
