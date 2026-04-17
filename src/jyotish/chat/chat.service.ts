import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RequestChatDto,
  AcceptChatDto,
  RejectChatDto,
  EndChatDto,
  ResumeChatDto,
} from './dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async requestChat(dto: RequestChatDto) {
    let pricePerMinute = 0;

    if (dto.serviceId) {
      const service = await this.prisma.astrologerService.findFirst({
        where: { id: dto.serviceId, astrologerId: dto.astrologerId },
      });
      if (service?.price) {
        pricePerMinute = service.price;
      }
    }

    return this.prisma.astrologerChatSession.create({
      data: {
        userId: dto.userId,
        astrologerId: dto.astrologerId,
        serviceId: dto.serviceId,
        pricePerMinute,
        status: 'PENDING',
      },
      include: { user: true, astrologer: true },
    });
  }

  async acceptChat(dto: AcceptChatDto) {
    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.astrologerId !== dto.astrologerId) {
      throw new ForbiddenException('Not authorized to accept this session');
    }
    if (session.status !== 'PENDING') {
      throw new BadRequestException('Session is not in PENDING status');
    }

    const now = new Date();
    return this.prisma.astrologerChatSession.update({
      where: { id: dto.sessionId },
      data: {
        status: 'ACTIVE',
        acceptedAt: now,
        startedAt: now,
      },
      include: { user: true, astrologer: true },
    });
  }

  async rejectChat(dto: RejectChatDto) {
    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.astrologerId !== dto.astrologerId) {
      throw new ForbiddenException('Not authorized to reject this session');
    }
    if (session.status !== 'PENDING') {
      throw new BadRequestException('Session is not in PENDING status');
    }

    return this.prisma.astrologerChatSession.update({
      where: { id: dto.sessionId },
      data: { status: 'REJECTED' },
      include: { user: true, astrologer: true },
    });
  }

  async endChat(dto: EndChatDto) {
    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.status === 'ENDED') {
      throw new BadRequestException('Session already ended');
    }

    const endedAt = new Date();
    let minutesBilled = 0;
    let totalCharged = 0;

    if (session.startedAt) {
      const durationMs = endedAt.getTime() - session.startedAt.getTime();
      minutesBilled = Math.ceil(durationMs / 60000);
      totalCharged = minutesBilled * session.pricePerMinute;
    }

    return this.prisma.astrologerChatSession.update({
      where: { id: dto.sessionId },
      data: {
        status: 'ENDED',
        endedAt,
        minutesBilled,
        totalCharged,
        endReason: 'manual',
      },
      include: { user: true, astrologer: true },
    });
  }

  async resumeChat(dto: ResumeChatDto) {
    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'PAUSED') {
      throw new BadRequestException('Session is not paused');
    }

    return this.prisma.astrologerChatSession.update({
      where: { id: dto.sessionId },
      data: { status: 'ACTIVE', pausedAt: null, pauseGraceExpiry: null },
      include: { user: true, astrologer: true },
    });
  }

  async getSession(id: number) {
    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id },
      include: { user: true, astrologer: true, messages: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async getMessages(
    sessionId: number,
    query: { limit?: number; before?: number },
  ) {
    const limit = query.limit || 50;
    const where: any = { sessionId };

    if (query.before) {
      where.id = { lt: query.before };
    }

    return this.prisma.astrologerChatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
