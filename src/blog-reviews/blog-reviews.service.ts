import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogReviewDto, UpdateBlogReviewDto } from './dto';

@Injectable()
export class BlogReviewsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.blogReviews.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateBlogReviewDto) {
    return this.prisma.blogReviews.create({ data: dto as any });
  }

  async update(dto: UpdateBlogReviewDto) {
    const { id, ...data } = dto;
    const review = await this.prisma.blogReviews.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Blog review not found');
    return this.prisma.blogReviews.update({ where: { id }, data: data as any });
  }
}
