import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogDto, UpdateBlogDto } from './dto';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  async findAll(slug?: string) {
    if (slug) {
      const blog = await this.prisma.blog.findUnique({ where: { slug } });
      if (!blog || blog.deleted) throw new NotFoundException('Blog not found');
      // Increment views
      await this.prisma.blog.update({
        where: { id: blog.id },
        data: { views: { increment: 1 } },
      });
      return blog;
    }

    return this.prisma.blog.findMany({
      where: { deleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateBlogDto) {
    return this.prisma.blog.create({ data: dto });
  }

  async update(dto: UpdateBlogDto & { id: number }) {
    const { id, ...data } = dto;
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog || blog.deleted) throw new NotFoundException('Blog not found');
    return this.prisma.blog.update({ where: { id }, data });
  }

  async delete(id: number) {
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog || blog.deleted) throw new NotFoundException('Blog not found');
    return this.prisma.blog.update({ where: { id }, data: { deleted: true } });
  }
}
