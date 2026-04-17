import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto, UpdateOfferDto } from './dto';

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.offer.findMany({
      where: { deleted: 0 },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateOfferDto) {
    return this.prisma.offer.create({ data: dto });
  }

  async update(dto: UpdateOfferDto) {
    const { id, ...data } = dto;
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer || offer.deleted !== 0) throw new NotFoundException('Offer not found');
    return this.prisma.offer.update({ where: { id }, data });
  }

  async delete(id: number) {
    const offer = await this.prisma.offer.findUnique({ where: { id } });
    if (!offer || offer.deleted !== 0) throw new NotFoundException('Offer not found');
    return this.prisma.offer.update({ where: { id }, data: { deleted: 1 } });
  }
}
