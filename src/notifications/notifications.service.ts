import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationRecipientType = 'ADMIN' | 'ASTROLOGER' | 'USER';

interface CreateArgs {
  recipientType: NotificationRecipientType;
  recipientId?: number | null;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Single home for in-app notification fan-out. Callers send high-level
 * events (chat request, free-offer granted, profile approved, etc.) and
 * this service drops a row in the Notification table. If the table isn't
 * migrated yet we log a warning and swallow — never fail the calling flow
 * just because notifications can't be persisted.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(args: CreateArgs) {
    try {
      // Raw insert so a missing migration degrades gracefully.
      return await (this.prisma as any).notification.create({
        data: {
          recipientType: args.recipientType,
          recipientId: args.recipientId ?? null,
          type: args.type,
          title: args.title,
          body: args.body ?? null,
          link: args.link ?? null,
          metadata: (args.metadata ?? {}) as any,
        },
      });
    } catch (err) {
      this.logger.warn(
        `notification.create failed (run prisma migrate?): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  async list(
    recipientType: NotificationRecipientType,
    recipientId?: number | null,
    opts?: { unreadOnly?: boolean; limit?: number },
  ) {
    try {
      return await (this.prisma as any).notification.findMany({
        where: {
          recipientType,
          ...(recipientId == null
            ? {}
            : {
                OR: [{ recipientId }, { recipientId: null }],
              }),
          ...(opts?.unreadOnly ? { read: false } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: opts?.limit ?? 30,
      });
    } catch {
      return [];
    }
  }

  async markRead(id: number) {
    try {
      return await (this.prisma as any).notification.update({
        where: { id },
        data: { read: true, readAt: new Date() },
      });
    } catch {
      return null;
    }
  }

  async markAllRead(
    recipientType: NotificationRecipientType,
    recipientId?: number | null,
  ) {
    try {
      return await (this.prisma as any).notification.updateMany({
        where: {
          recipientType,
          ...(recipientId == null ? {} : { recipientId }),
          read: false,
        },
        data: { read: true, readAt: new Date() },
      });
    } catch {
      return { count: 0 };
    }
  }
}
