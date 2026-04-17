import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHeaderDto } from './dto';

@Injectable()
export class HeadersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.header.findMany({
      where: { deleted: 0 },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateHeaderDto) {
    return this.prisma.header.create({ data: dto });
  }
}
