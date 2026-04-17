import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePenaltyDto } from './dto';

@Injectable()
export class PenaltyService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.astrologerPenalty.findMany({
      include: { astrologer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreatePenaltyDto) {
    const astrologer = await this.prisma.astrologerAccount.findUnique({
      where: { id: dto.astrologerId },
    });
    if (!astrologer) throw new NotFoundException('Astrologer not found');

    return this.prisma.astrologerPenalty.create({
      data: {
        astrologerId: dto.astrologerId,
        amount: dto.amount,
        reason: dto.reason,
        settlement: dto.settlement,
        paid: dto.paid,
      },
      include: { astrologer: true },
    });
  }
}
