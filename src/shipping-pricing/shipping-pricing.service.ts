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
    // Match either the display name (e.g. "India") or the ISO code ("IN",
    // "IND") the storefront might pass. Case-insensitive so "india" vs
    // "India" don't trip us. Any admin row whose `country` or `code`
    // matches counts.
    const needle = String(country ?? '').trim();
    if (!needle) return [];
    return this.prisma.shippingPricing.findMany({
      where: {
        deleted: 0,
        OR: [
          { country: { equals: needle, mode: 'insensitive' } },
          { code: { equals: needle, mode: 'insensitive' } },
        ],
      },
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

  async remove(id: string) {
    const existing = await this.prisma.shippingPricing.findFirst({
      where: { id, deleted: 0 },
    });
    if (!existing) throw new NotFoundException('Shipping pricing not found');
    return this.prisma.shippingPricing.update({
      where: { id },
      data: { deleted: 1 },
    });
  }
}
