import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type NotificationRecipient =
  | { type: 'ASTROLOGER'; astrologerId: number }
  | { type: 'ADMIN' };

export interface NotifyArgs {
  recipient: NotificationRecipient;
  kind: string;
  title: string;
  body: string;
  link?: string;
}

/**
 * Central notification writer for the Jyotish surface.
 *
 * Audiences:
 *   - `ASTROLOGER`: a specific astrologer (admin approve/reject an edit
 *     request, admin logs a penalty, admin flips the active toggle,
 *     admin replies in chat).
 *   - `ADMIN`: any admin user (astrologer submits an edit request,
 *     astrologer posts in the support chat).
 *
 * Every write is fire-and-forget from the caller's POV — we log on
 * failure but never propagate so a DB blip on the notification side
 * doesn't roll back the business action that triggered it.
 */
@Injectable()
export class JyotishNotificationsService {
  private readonly logger = new Logger(JyotishNotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async notify(args: NotifyArgs): Promise<void> {
    try {
      await this.prisma.jyotishNotification.create({
        data: {
          recipientType: args.recipient.type,
          recipientId:
            args.recipient.type === 'ASTROLOGER'
              ? args.recipient.astrologerId
              : null,
          kind: args.kind,
          title: args.title,
          body: args.body,
          link: args.link ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `notify(${args.kind}) failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Recent notifications for the bell dropdown (default 10). */
  async listRecent(
    recipient: NotificationRecipient,
    limit = 10,
  ) {
    return this.prisma.jyotishNotification.findMany({
      where: this.recipientWhere(recipient),
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
    });
  }

  /** Full history for the dedicated notifications page. */
  async listAll(recipient: NotificationRecipient) {
    return this.prisma.jyotishNotification.findMany({
      where: this.recipientWhere(recipient),
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async unreadCount(recipient: NotificationRecipient): Promise<number> {
    return this.prisma.jyotishNotification.count({
      where: {
        ...this.recipientWhere(recipient),
        read: false,
      },
    });
  }

  async markRead(id: number, recipient: NotificationRecipient) {
    await this.prisma.jyotishNotification.updateMany({
      where: {
        id,
        ...this.recipientWhere(recipient),
      },
      data: { read: true },
    });
    return { ok: true };
  }

  async markAllRead(recipient: NotificationRecipient) {
    await this.prisma.jyotishNotification.updateMany({
      where: {
        ...this.recipientWhere(recipient),
        read: false,
      },
      data: { read: true },
    });
    return { ok: true };
  }

  private recipientWhere(recipient: NotificationRecipient) {
    if (recipient.type === 'ASTROLOGER') {
      return { recipientType: 'ASTROLOGER', recipientId: recipient.astrologerId };
    }
    return { recipientType: 'ADMIN' };
  }
}
