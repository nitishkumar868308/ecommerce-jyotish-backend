import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVideoStoryDto } from './dto';

@Injectable()
export class VideoStoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.videoStory.findMany({
      where: { deleted: 0 },
    });
  }

  async create(dto: CreateVideoStoryDto) {
    return this.prisma.videoStory.create({ data: dto });
  }
}
