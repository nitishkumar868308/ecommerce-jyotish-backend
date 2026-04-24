import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFreeOfferDto, UpdateFreeOfferDto } from './dto';

@Injectable()
export class FreeOffersService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.freeConsultationOffer.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateFreeOfferDto) {
    return this.prisma.freeConsultationOffer.create({
      data: {
        title: dto.title,
        description: dto.description,
        astrologerAmount: dto.astrologerAmount ?? 0,
        adminAmount: dto.adminAmount ?? 0,
        sessionsCap: dto.sessionsCap ?? 0,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateFreeOfferDto) {
    const existing = await this.prisma.freeConsultationOffer.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Free offer not found');

    return this.prisma.freeConsultationOffer.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        astrologerAmount: dto.astrologerAmount ?? undefined,
        adminAmount: dto.adminAmount ?? undefined,
        sessionsCap: dto.sessionsCap ?? undefined,
        startDate:
          dto.startDate === undefined
            ? undefined
            : dto.startDate
              ? new Date(dto.startDate)
              : null,
        endDate:
          dto.endDate === undefined
            ? undefined
            : dto.endDate
              ? new Date(dto.endDate)
              : null,
        active: dto.active ?? undefined,
      },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.freeConsultationOffer.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Free offer not found');
    return this.prisma.freeConsultationOffer.delete({ where: { id } });
  }
}
