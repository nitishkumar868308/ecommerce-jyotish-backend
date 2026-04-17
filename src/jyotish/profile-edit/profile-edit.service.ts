import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProfileEditRequestDto,
  FulfillProfileEditRequestDto,
} from './dto';

@Injectable()
export class ProfileEditService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.profileEditRequest.findMany({
      include: { astrologer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateProfileEditRequestDto) {
    const astrologer = await this.prisma.astrologerAccount.findUnique({
      where: { id: dto.astrologerId },
    });
    if (!astrologer) throw new NotFoundException('Astrologer not found');

    return this.prisma.profileEditRequest.create({
      data: {
        astrologerId: dto.astrologerId,
        section: dto.section,
        reason: dto.reason,
        fields: dto.fields,
      },
      include: { astrologer: true },
    });
  }

  async fulfill(id: number, dto: FulfillProfileEditRequestDto) {
    const request = await this.prisma.profileEditRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Edit request not found');

    return this.prisma.profileEditRequest.update({
      where: { id },
      data: {
        overallStatus: dto.overallStatus as any,
        adminNote: dto.adminNote,
      },
      include: { astrologer: true },
    });
  }
}
