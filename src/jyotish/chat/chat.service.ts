import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  RequestChatDto,
  AcceptChatDto,
  RejectChatDto,
  EndChatDto,
  ResumeChatDto,
} from './dto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

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

    const session = await this.prisma.astrologerChatSession.create({
      data: {
        userId: dto.userId,
        astrologerId: dto.astrologerId,
        serviceId: dto.serviceId,
        pricePerMinute,
        status: 'PENDING',
      },
      include: { user: true, astrologer: true },
    });

    // Fire-and-forget notification to the astrologer: "new chat request".
    const userLabel =
      (session.user as any)?.fullName ??
      (session.user as any)?.name ??
      'a user';
    void this.notifications.create({
      recipientType: 'ASTROLOGER',
      recipientId: dto.astrologerId,
      type: 'CHAT_REQUEST',
      title: `New chat request from ${userLabel}`,
      body: 'Accept or reject from your dashboard.',
      link: '/jyotish/astrologer-dashboard',
      metadata: { sessionId: session.id },
    });

    return session;
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
    const updated = await this.prisma.astrologerChatSession.update({
      where: { id: dto.sessionId },
      data: {
        status: 'ACTIVE',
        acceptedAt: now,
        startedAt: now,
      },
      include: { user: true, astrologer: true },
    });

    // Tell the user the chat is live.
    const astrologerLabel =
      (updated.astrologer as any)?.displayName ??
      (updated.astrologer as any)?.fullName ??
      'Your astrologer';
    void this.notifications.create({
      recipientType: 'USER',
      recipientId: session.userId,
      type: 'CHAT_ACCEPTED',
      title: `${astrologerLabel} accepted the chat`,
      body: 'Your session has started — tap to open the chat.',
      link: `/jyotish/chat/${updated.id}`,
      metadata: { sessionId: updated.id },
    });

    return updated;
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

    const reason = dto.reason?.trim() || null;

    const updated = await this.prisma.astrologerChatSession.update({
      where: { id: dto.sessionId },
      data: {
        status: 'REJECTED',
        // `rejectionReason` column is optional — falls back to note field
        // when the primary column isn't migrated yet.
        ...(reason ? ({ rejectionReason: reason } as any) : {}),
      },
      include: { user: true, astrologer: true },
    });

    void this.notifications.create({
      recipientType: 'USER',
      recipientId: session.userId,
      type: 'CHAT_REJECTED',
      title: 'Your chat request was declined',
      body:
        reason ||
        'The astrologer is busy right now. Please try another astrologer.',
      link: '/jyotish/consult-now',
      metadata: { sessionId: updated.id, reason },
    });

    // Surface rejection to admin so support can follow up if needed.
    void this.notifications.create({
      recipientType: 'ADMIN',
      type: 'CHAT_REJECTED',
      title: `Chat rejected by astrologer #${dto.astrologerId}`,
      body: reason || 'No reason provided.',
      link: '/admin/jyotish/astrologer-detail',
      metadata: { sessionId: updated.id, astrologerId: dto.astrologerId },
    });

    return updated;
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
