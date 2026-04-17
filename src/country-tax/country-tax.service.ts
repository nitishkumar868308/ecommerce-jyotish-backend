import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCountryTaxDto, UpdateCountryTaxDto } from './dto';

@Injectable()
export class CountryTaxService {
  constructor(private prisma: PrismaService) {}

  async findAll(country?: string, categoryId?: number) {
    return this.prisma.countryTax.findMany({
      where: {
        deleted: 0,
        ...(country && { country }),
        ...(categoryId && { categoryId }),
      },
      include: { category: true },
    });
  }

  async findAllAdmin() {
    return this.prisma.countryTax.findMany({
      where: { deleted: 0 },
      include: { category: true },
    });
  }

  async create(dto: CreateCountryTaxDto) {
    return this.prisma.countryTax.create({
      data: dto,
      include: { category: true },
    });
  }

  async update(id: number, dto: UpdateCountryTaxDto) {
    const existing = await this.prisma.countryTax.findFirst({
      where: { id, deleted: 0 },
    });
    if (!existing) throw new NotFoundException('Country tax not found');
    return this.prisma.countryTax.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }
}
