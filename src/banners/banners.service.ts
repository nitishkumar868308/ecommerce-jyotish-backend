import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto, UpdateBannerDto } from './dto';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.banner.findMany({
      where: { deleted: false },
      include: { countries: true, states: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateBannerDto) {
    const { countries, states, ...bannerData } = dto;
    return this.prisma.banner.create({
      data: {
        ...bannerData,
        countries: countries?.length
          ? { createMany: { data: countries } }
          : undefined,
        states: states?.length
          ? { createMany: { data: states } }
          : undefined,
      },
      include: { countries: true, states: true },
    });
  }

  async update(id: number, dto: UpdateBannerDto) {
    const existing = await this.prisma.banner.findFirst({
      where: { id, deleted: false },
    });
    if (!existing) throw new NotFoundException('Banner not found');

    const { countries, states, ...bannerData } = dto;

    // If countries or states are provided, replace them
    if (countries !== undefined) {
      await this.prisma.bannerCountry.deleteMany({ where: { bannerId: id } });
    }
    if (states !== undefined) {
      await this.prisma.bannerState.deleteMany({ where: { bannerId: id } });
    }

    return this.prisma.banner.update({
      where: { id },
      data: {
        ...bannerData,
        countries: countries?.length
          ? { createMany: { data: countries } }
          : undefined,
        states: states?.length
          ? { createMany: { data: states } }
          : undefined,
      },
      include: { countries: true, states: true },
    });
  }

  async softDelete(id: number) {
    const existing = await this.prisma.banner.findFirst({
      where: { id, deleted: false },
    });
    if (!existing) throw new NotFoundException('Banner not found');
    return this.prisma.banner.update({
      where: { id },
      data: { deleted: true },
    });
  }
}
