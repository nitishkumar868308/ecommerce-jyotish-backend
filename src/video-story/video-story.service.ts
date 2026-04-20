import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVideoStoryDto, UpdateVideoStoryDto } from './dto';

@Injectable()
export class VideoStoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.videoStory.findMany({
      where: { deleted: 0 },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateVideoStoryDto) {
    return this.prisma.videoStory.create({ data: dto });
  }

  async update(id: number, dto: UpdateVideoStoryDto) {
    const existing = await this.prisma.videoStory.findFirst({
      where: { id, deleted: 0 },
    });
    if (!existing) throw new NotFoundException('Video story not found');
    return this.prisma.videoStory.update({ where: { id }, data: dto });
  }

  async delete(id: number) {
    const existing = await this.prisma.videoStory.findFirst({
      where: { id, deleted: 0 },
    });
    if (!existing) throw new NotFoundException('Video story not found');
    return this.prisma.videoStory.update({
      where: { id },
      data: { deleted: 1 },
    });
  }
}
