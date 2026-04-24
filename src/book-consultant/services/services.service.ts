import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from './dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.service.findMany({
      where: { deleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        title: dto.title,
        shortDesc: dto.shortDesc,
        longDesc: dto.longDesc,
        image: dto.image,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateServiceDto) {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing || existing.deleted) {
      throw new NotFoundException('Service not found');
    }
    return this.prisma.service.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        shortDesc: dto.shortDesc ?? undefined,
        longDesc: dto.longDesc ?? undefined,
        image: dto.image ?? undefined,
        active: dto.active ?? undefined,
      },
    });
  }

  async softDelete(id: number) {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing || existing.deleted) {
      throw new NotFoundException('Service not found');
    }
    return this.prisma.service.update({
      where: { id },
      data: { deleted: true, active: false },
    });
  }
}
