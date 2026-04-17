import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto, MarkReadDto, ReplyContactDto } from './dto';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateContactDto) {
    return this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        message: dto.message,
        platform: dto.platform || 'website',
      },
    });
  }

  async findAll() {
    return this.prisma.contactMessage.findMany({
      where: { isDeleted: false },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(dto: MarkReadDto) {
    const msg = await this.prisma.contactMessage.findUnique({
      where: { id: dto.id },
    });
    if (!msg) throw new NotFoundException('Message not found');

    return this.prisma.contactMessage.update({
      where: { id: dto.id },
      data: { readByAdmin: true },
    });
  }

  async reply(dto: ReplyContactDto) {
    const msg = await this.prisma.contactMessage.findUnique({
      where: { id: dto.contactMessageId },
    });
    if (!msg) throw new NotFoundException('Contact message not found');

    const reply = await this.prisma.messageReply.create({
      data: {
        contactMessageId: dto.contactMessageId,
        sender: dto.sender,
        message: dto.message,
        readByAdmin: dto.sender === 'admin',
      },
    });

    // Mark the contact message as unread for user when admin replies
    if (dto.sender === 'admin') {
      await this.prisma.contactMessage.update({
        where: { id: dto.contactMessageId },
        data: { readByUser: false },
      });
    }

    return reply;
  }
}
