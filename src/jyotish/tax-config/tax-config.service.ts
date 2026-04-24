import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TaxConfigService {
  constructor(private prisma: PrismaService) {}

  async getConfig() {
    let config = await this.prisma.jyotishTaxConfig.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!config) {
      config = await this.prisma.jyotishTaxConfig.create({
        data: { gstPercent: 0 },
      });
    }
    return config;
  }

  async updateConfig(gstPercent: number) {
    const existing = await this.prisma.jyotishTaxConfig.findFirst({
      orderBy: { id: 'asc' },
    });
    if (existing) {
      return this.prisma.jyotishTaxConfig.update({
        where: { id: existing.id },
        data: { gstPercent },
      });
    }
    return this.prisma.jyotishTaxConfig.create({ data: { gstPercent } });
  }
}
