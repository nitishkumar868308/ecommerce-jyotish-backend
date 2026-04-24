import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JyotishNotificationsService } from '../notifications/jyotish-notifications.service';

/**
 * Direct 1-to-many chat channel between the admin team and individual
 * astrologers. One "thread" per astrologer (no thread row needed — we
 * just bucket messages by astrologerId). Messages carry a `senderType`
 * so the same table serves both directions, and two `readBy*` booleans
 * so each side can compute an unread badge without a separate reads
 * table.
 *
 * This is intentionally not the same model as the paid user ↔ astrologer
 * consultation (AstrologerChatSession / AstrologerChatMessage); support
 * chat has different lifecycle (no billing, no accept/reject), so a
 * separate minimal model is cleaner than overloading that schema.
 */
@Injectable()
export class AdminChatService {
  constructor(
    private prisma: PrismaService,
    private notif: JyotishNotificationsService,
  ) {}

  /**
   * Post a new message. The caller (controller) classifies who sent it
   * via `senderType` + `senderId` so the same endpoint handles admin
   * posts and astrologer posts.
   */
  async postMessage(args: {
    astrologerId: number;
    senderType: 'ADMIN' | 'ASTROLOGER';
    senderId: number;
    text: string;
  }) {
    const astro = await this.prisma.astrologerAccount.findUnique({
      where: { id: args.astrologerId },
      select: { id: true },
    });
    if (!astro) throw new NotFoundException('Astrologer not found');

    const row = await this.prisma.adminAstrologerMessage.create({
      data: {
        astrologerId: args.astrologerId,
        senderType: args.senderType,
        senderId: args.senderId,
        text: args.text,
        // Mark the side that just posted as having read it so the unread
        // badge on the posting side resets immediately.
        readByAdmin: args.senderType === 'ADMIN',
        readByAstro: args.senderType === 'ASTROLOGER',
      },
    });

    // Fan-out notification to the other party so the bell lights up
    // without waiting for the next chat-list poll.
    const preview = args.text.length > 140 ? args.text.slice(0, 140) + '…' : args.text;
    if (args.senderType === 'ADMIN') {
      void this.notif.notify({
        recipient: { type: 'ASTROLOGER', astrologerId: args.astrologerId },
        kind: 'ADMIN_CHAT_MESSAGE',
        title: 'New message from admin',
        body: preview,
        link: '/jyotish/astrologer-dashboard/admin-chat',
      });
    } else {
      void this.notif.notify({
        recipient: { type: 'ADMIN' },
        kind: 'ASTROLOGER_CHAT_MESSAGE',
        title: 'New astrologer message',
        body: preview,
        link: '/admin/jyotish/astrologer-chats',
      });
    }

    return row;
  }

  /**
   * Full message history for a thread, oldest first. The UI flips it
   * client-side if it wants newest-at-top — keeping ascending order on
   * the wire makes pagination straightforward to add later.
   */
  async listMessages(astrologerId: number) {
    return this.prisma.adminAstrologerMessage.findMany({
      where: { astrologerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Flip the read flag for whoever's viewing the thread right now. */
  async markThreadRead(
    astrologerId: number,
    viewer: 'ADMIN' | 'ASTROLOGER',
  ) {
    const field = viewer === 'ADMIN' ? 'readByAdmin' : 'readByAstro';
    await this.prisma.adminAstrologerMessage.updateMany({
      where: { astrologerId, [field]: false },
      data: { [field]: true },
    });
    return { ok: true };
  }

  /**
   * Admin inbox: list every astrologer that has any message on their
   * thread, with the latest message and an unread (from astrologer)
   * count. Sorted by last activity so the admin sees the freshest
   * threads first.
   */
  async adminInbox() {
    // Pull the last message per astrologer plus unread count. Doing
    // this in two round trips (latest + counts) because Prisma doesn't
    // give us a distinctOn over ordered relations without raw SQL —
    // the catalogue is small enough that the extra trip is cheap.
    const astrologers = await this.prisma.astrologerAccount.findMany({
      where: {
        adminMessages: { some: {} },
      },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        email: true,
        profile: { select: { image: true } },
      },
    });

    const threads = await Promise.all(
      astrologers.map(async (a) => {
        const [last, unread] = await Promise.all([
          this.prisma.adminAstrologerMessage.findFirst({
            where: { astrologerId: a.id },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.adminAstrologerMessage.count({
            where: {
              astrologerId: a.id,
              senderType: 'ASTROLOGER',
              readByAdmin: false,
            },
          }),
        ]);
        return { astrologer: a, lastMessage: last, unreadForAdmin: unread };
      }),
    );

    // Newest activity first.
    threads.sort((x, y) => {
      const tx = x.lastMessage?.createdAt?.getTime() ?? 0;
      const ty = y.lastMessage?.createdAt?.getTime() ?? 0;
      return ty - tx;
    });

    return threads;
  }

  /** Count messages still unread by the astrologer for their dashboard badge. */
  async unreadForAstrologer(astrologerId: number) {
    return this.prisma.adminAstrologerMessage.count({
      where: {
        astrologerId,
        senderType: 'ADMIN',
        readByAstro: false,
      },
    });
  }
}
