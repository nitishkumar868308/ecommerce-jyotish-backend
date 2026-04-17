import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.reviews.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateReviewDto) {
    return this.prisma.reviews.create({ data: dto });
  }

  async update(dto: UpdateReviewDto) {
    const { id, ...data } = dto;
    const review = await this.prisma.reviews.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.reviews.update({ where: { id }, data });
  }

  async delete(id: number) {
    const review = await this.prisma.reviews.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    return this.prisma.reviews.update({ where: { id }, data: { active: false } });
  }
}
