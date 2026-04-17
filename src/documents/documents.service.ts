import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVerificationDocumentDto,
  CreateExtraDocumentDto,
} from './dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findAllVerification() {
    return this.prisma.astrologerVerificationDocument.findMany({
      include: { astrologer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVerification(dto: CreateVerificationDocumentDto) {
    const astrologer = await this.prisma.astrologerAccount.findUnique({
      where: { id: dto.astrologerId },
    });
    if (!astrologer) throw new NotFoundException('Astrologer not found');

    return this.prisma.astrologerVerificationDocument.create({
      data: {
        astrologerId: dto.astrologerId,
        type: dto.type as any,
        fileUrl: dto.fileUrl,
      },
      include: { astrologer: true },
    });
  }

  async findAllExtra() {
    return this.prisma.astrologerExtraDocument.findMany({
      include: { astrologer: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
