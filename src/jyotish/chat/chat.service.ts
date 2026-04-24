import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { MailService } from '../../mail/mail.service';
import {
  RequestChatDto,
  AcceptChatDto,
  RejectChatDto,
  EndChatDto,
  ResumeChatDto,
  SendMessageDto,
} from './dto';

// How long a PENDING request is allowed to sit before we consider it
// missed. Anything older gets auto-moved to REJECTED+timeout so the
// shopper isn't left watching an indefinite spinner when the astrologer
// isn't on their dashboard.
const REQUEST_TIMEOUT_MS = 60 * 1000;
const TIMEOUT_REASON =
  "The astrologer didn't respond in time. Please try another astrologer.";

// Billing ticks on 60s boundaries — each full minute of an ACTIVE
// session costs pricePerMinute. The first tick fires 60 seconds after
// startedAt, not immediately, so a user who sends one hello doesn't
// get charged before they've actually used any time.
const BILLING_TICK_MS = 60 * 1000;

// "Typing…" heartbeats last this long after the last keystroke ping.
// 5s strikes a balance — long enough to feel continuous while the
// user is composing, short enough to clear fast when they stop.
const TYPING_TTL_MS = 5_000;

interface TypingState {
  userTypingAt?: number;
  astroTypingAt?: number;
  /** Shopper has the Add-money modal open — heartbeats keep this
   *  fresh so the astrologer can see "user is topping up" and hold
   *  the session open rather than hitting end. Same 5s TTL as
   *  typing pings. */
  addingMoneyAt?: number;
}

/**
 * Parse a free-offer startDate coming from an <input type="date">
 * ("YYYY-MM-DD") as "start of that day". Browsers leave a bare
 * YYYY-MM-DD string without time info; new Date() then anchors it to
 * 00:00 UTC which is fine for a start boundary, so we just normalise
 * to a real Date and return null for empties.
 */
export function parseOfferStart(input: unknown): Date | null {
  if (input === null || input === undefined || input === '') return null;
  const d = new Date(String(input));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse a free-offer endDate and push it to end-of-day (23:59:59.999
 * UTC). Picking "2026-04-24" via a date picker has always meant
 * "offer is valid THROUGH April 24" to an ops person — anchoring to
 * 00:00 UTC would silently expire the offer at the start of the day
 * instead. If the caller already included a time component we trust
 * it as-is.
 */
export function parseOfferEnd(input: unknown): Date | null {
  if (input === null || input === undefined || input === '') return null;
  const raw = String(input);
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  // Bare "YYYY-MM-DD" has no 'T' — bump to end-of-day.
  if (!raw.includes('T') && !raw.includes(' ')) {
    d.setUTCHours(23, 59, 59, 999);
  }
  return d;
}

@Injectable()
export class ChatService {
  // In-memory typing heartbeats per sessionId. We don't persist these
  // — they're ephemeral UI state, and the cost of losing them on a
  // server restart is at worst "typing…" vanishes for 5s.
  private typingHeartbeats = new Map<number, TypingState>();

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
  ) {}

  /**
   * Split a gross charge into three independent buckets:
   *   gst         = gross * gstPct                          // tax, goes to govt
   *   netAfterGst = gross - gst
   *   astroShare  = netAfterGst * astroPct                  // astrologer's cut
   *   adminShare  = netAfterGst - astroShare                // platform's cut
   *
   * With this layout `gross === gst + astroShare + adminShare` exactly,
   * so each column on the transactions page is its own line in the
   * ledger — no double-counting, no "admin includes GST" confusion.
   *
   * If an astrologer record is missing the split fields we default to
   * GST 0 + 100% astro so an ops misconfig never silently overcharges.
   */
  private splitEarnings(
    gross: number,
    astro: { gst?: number | null; revenueAstrologer?: number | null },
  ) {
    const gstPct = Math.max(0, astro.gst ?? 0);
    const astroPct = Math.min(100, Math.max(0, astro.revenueAstrologer ?? 100));
    const gst = +(gross * (gstPct / 100)).toFixed(2);
    const netAfterGst = +(gross - gst).toFixed(2);
    const astroShare = +(netAfterGst * (astroPct / 100)).toFixed(2);
    const adminShare = +(netAfterGst - astroShare).toFixed(2);
    return { gst, astroShare, adminShare };
  }

  /**
   * Apply a charge (any size) against a session: debit the shopper's
   * wallet, update the session accounting columns, and credit the
   * astrologer's earnings via an AstrologerTransaction row. `seconds`
   * is the billed duration in real seconds (used to keep secondsBilled
   * accurate for partial-minute endings). If the wallet can't cover
   * `gross` we charge what's available and signal `endedForBalance`
   * so the caller can close the session.
   */
  private async applyCharge(
    sessionId: number,
    opts: {
      gross: number;
      seconds: number;
      label: string;
      advanceTickTo?: Date;
    },
  ) {
    const gross = Math.max(0, opts.gross);
    if (gross <= 0 && opts.seconds <= 0) {
      return { charged: 0, endedForBalance: false };
    }

    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        astrologerId: true,
        astrologer: {
          select: { id: true, gst: true, revenueAstrologer: true },
        },
      },
    });
    if (!session) return { charged: 0, endedForBalance: false };

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { walletBalance: true },
    });
    if (!user) return { charged: 0, endedForBalance: false };

    let actualCharge = gross;
    let endedForBalance = false;
    if (user.walletBalance < gross) {
      actualCharge = Math.max(0, user.walletBalance);
      endedForBalance = true;
    }

    const { gst, astroShare, adminShare } = this.splitEarnings(
      actualCharge,
      session.astrologer ?? {},
    );

    const ops: any[] = [
      this.prisma.astrologerChatSession.update({
        where: { id: sessionId },
        data: {
          secondsBilled: { increment: Math.max(0, Math.floor(opts.seconds)) },
          minutesBilled: { increment: Math.floor(opts.seconds / 60) },
          totalCharged: { increment: actualCharge },
          gstAmount: { increment: gst },
          astrologerEarning: { increment: astroShare },
          adminEarning: { increment: adminShare },
          ...(opts.advanceTickTo ? { lastTickAt: opts.advanceTickTo } : {}),
        },
      }),
    ];
    // Only touch the money rails when money actually moved — a
    // free-offer tick still needs to advance the session clock but
    // shouldn't leave ₹0 rows in the wallet/astrologer ledgers.
    if (actualCharge > 0) {
      ops.unshift(
        this.prisma.user.update({
          where: { id: session.userId },
          data: { walletBalance: { decrement: actualCharge } },
        }),
        this.prisma.walletTransaction.create({
          data: {
            userId: session.userId,
            amount: actualCharge,
            type: 'DEBIT',
            note: `Chat session #${sessionId} — ${opts.label}`,
          },
        }),
      );
    }
    if (astroShare > 0) {
      ops.push(
        this.prisma.astrologerTransaction.create({
          data: {
            astrologerId: session.astrologerId,
            type: 'PAYMENT',
            amount: astroShare,
            paidAt: new Date(),
          },
        }),
      );
    }
    await this.prisma.$transaction(ops);
    return { charged: actualCharge, endedForBalance };
  }

  /**
   * Bill a slice of time that was covered by the astrologer's free-minute
   * offer. The shopper isn't charged, but the platform still earns its
   * cut (GST + admin share) — and the astrologer "pays" that cut out of
   * their own earnings. Semantically: the astrologer is buying the
   * platform's services to run their promo. Mirrors applyCharge's split
   * formula so totals line up perfectly when a session mixes free + paid
   * slices across multiple ticks.
   */
  private async applyFreeOfferFee(
    sessionId: number,
    opts: {
      seconds: number;
      perMinute: number;
      advanceTickTo?: Date;
    },
  ) {
    const seconds = Math.max(0, Math.floor(opts.seconds));
    if (seconds <= 0 || opts.perMinute <= 0) return;

    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        astrologerId: true,
        astrologer: {
          select: { id: true, gst: true, revenueAstrologer: true },
        },
      },
    });
    if (!session) return;

    // Hypothetical gross for the free slice — what the shopper WOULD
    // have paid at the normal rate. Used purely to size the platform's
    // cut; no money actually moves from the shopper.
    const hypotheticalGross = +((seconds / 60) * opts.perMinute).toFixed(2);
    const { gst, adminShare } = this.splitEarnings(
      hypotheticalGross,
      session.astrologer ?? {},
    );
    // Astrologer absorbs BOTH GST and the admin's net cut for the
    // free minute — the platform still collects its full take, the
    // astrologer just foregoes their own slice (and then some) to
    // fund the promo.
    const platformFee = +(gst + adminShare).toFixed(2);

    await this.prisma.$transaction([
      this.prisma.astrologerChatSession.update({
        where: { id: sessionId },
        data: {
          secondsBilled: { increment: seconds },
          minutesBilled: { increment: Math.floor(seconds / 60) },
          gstAmount: { increment: gst },
          adminEarning: { increment: adminShare },
          // Astrologer absorbs the full platform fee (gst + admin cut).
          astrologerEarning: { decrement: platformFee },
          ...(opts.advanceTickTo ? { lastTickAt: opts.advanceTickTo } : {}),
        },
      }),
      this.prisma.astrologerTransaction.create({
        data: {
          astrologerId: session.astrologerId,
          type: 'PENALTY',
          amount: platformFee,
          paidAt: new Date(),
        },
      }),
    ]);
  }

  /**
   * Lazy per-minute billing for live ACTIVE sessions. Flushes any
   * whole-minute ticks since `lastTickAt` via `applyCharge` — which
   * handles the wallet debit, GST split, astrologer credit, and
   * session accounting in one transaction. If the wallet runs dry,
   * flips the session to ENDED with endReason='insufficient_balance'.
   */
  private async tickBilling(sessionId: number) {
    // Self-heal a session whose offer wasn't attached at accept time
    // (e.g. admin approved the offer after the session was created).
    // Safe because attachOfferToLiveSession only touches sessions
    // that haven't been billed yet.
    await this.attachOfferToLiveSession(sessionId);

    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) return { charged: 0 };
    if (session.status !== 'ACTIVE') return { charged: 0 };
    if (!session.startedAt) return { charged: 0 };
    if ((session.pricePerMinute ?? 0) <= 0) return { charged: 0 };

    const now = Date.now();
    const base = (session.lastTickAt ?? session.startedAt).getTime();
    const elapsedMs = now - base;
    if (elapsedMs < BILLING_TICK_MS) return { charged: 0 };

    const ticks = Math.floor(elapsedMs / BILLING_TICK_MS);
    if (ticks <= 0) return { charged: 0 };

    // Split the tick batch into "free" seconds (covered by the
    // astrologer's free-minutes offer) and "paid" seconds. Free seconds
    // still generate platform revenue — the astrologer absorbs GST +
    // admin cut for running the promo. Paid seconds hit the shopper's
    // wallet as usual. Only the final applied slice advances lastTickAt
    // so we don't double-advance the clock within a single batch.
    const perMinute = session.pricePerMinute;
    const freeSecondsTotal = session.freeMinutesGranted * 60;
    const alreadyBilled = session.secondsBilled ?? 0;
    const batchSeconds = ticks * 60;
    const remainingFree = Math.max(0, freeSecondsTotal - alreadyBilled);
    const freeSecondsThisBatch = Math.min(batchSeconds, remainingFree);
    const paidSecondsThisBatch = batchSeconds - freeSecondsThisBatch;
    const nextTickAt = new Date(base + ticks * BILLING_TICK_MS);

    if (freeSecondsThisBatch > 0) {
      await this.applyFreeOfferFee(sessionId, {
        seconds: freeSecondsThisBatch,
        perMinute,
        // Only advance the clock here if there's no paid slice after —
        // otherwise applyCharge below will advance it.
        advanceTickTo: paidSecondsThisBatch > 0 ? undefined : nextTickAt,
      });
    }

    let charged = 0;
    let endedForBalance = false;
    if (paidSecondsThisBatch > 0) {
      const gross = +((paidSecondsThisBatch / 60) * perMinute).toFixed(2);
      const label =
        freeSecondsThisBatch > 0
          ? `${Math.round(paidSecondsThisBatch)}s paid + ${Math.round(freeSecondsThisBatch)}s free`
          : `${ticks} min @ ₹${perMinute}/min`;
      const result = await this.applyCharge(sessionId, {
        gross,
        seconds: paidSecondsThisBatch,
        label,
        advanceTickTo: nextTickAt,
      });
      charged = result.charged;
      endedForBalance = result.endedForBalance;
    }

    if (endedForBalance) {
      await this.prisma.$transaction([
        this.prisma.astrologerChatSession.update({
          where: { id: sessionId },
          data: {
            status: 'ENDED',
            endedAt: new Date(),
            endReason: 'insufficient_balance',
          },
        }),
        this.prisma.astrologerAccount.update({
          where: { id: session.astrologerId },
          data: { isBusy: false },
        }),
      ]);
    }

    return { charged, ticks, endedForBalance };
  }

  /**
   * Final proration on session end — charges for any leftover seconds
   * since `lastTickAt`. Without this, a 3:10 session charged only for
   * the 3 completed minutes and the last 10 seconds were free. Always
   * uses `applyCharge` so the earnings split + astrologer credit land
   * the same way as a tick does.
   */
  /**
   * Self-heal: when a "Free sessions offer" ProfileEditRequest was
   * approved BEFORE the auto-create code shipped, the matching
   * AstrologerFreeOffer row doesn't exist even though the astrologer
   * (and admin) consider the offer live. This helper scans the
   * astrologer's approved/fulfilled requests and creates any missing
   * offer rows so the downstream acceptChat lookup sees them.
   *
   * Idempotent — skips requests that already have a matching offer
   * by title + date window.
   */
  private async backfillFreeOffersForAstrologer(astrologerId: number) {
    // Self-heal: older offer rows were saved with endDate anchored to
    // 00:00 UTC (from a date-only picker), which made them expire at
    // the START of the picked day. Push any such endDate forward to
    // end-of-day so the offer remains valid through the intended day.
    const stale = await this.prisma.astrologerFreeOffer.findMany({
      where: { astrologerId, endDate: { not: null } },
      select: { id: true, endDate: true },
    });
    for (const row of stale) {
      if (!row.endDate) continue;
      const d = new Date(row.endDate);
      if (
        d.getUTCHours() === 0 &&
        d.getUTCMinutes() === 0 &&
        d.getUTCSeconds() === 0
      ) {
        d.setUTCHours(23, 59, 59, 999);
        await this.prisma.astrologerFreeOffer.update({
          where: { id: row.id },
          data: { endDate: d },
        });
      }
    }

    const requests = await this.prisma.profileEditRequest.findMany({
      where: {
        astrologerId,
        section: 'Free sessions offer',
        overallStatus: { in: ['APPROVED', 'FULFILLED'] as any },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    if (requests.length === 0) return;

    const existing = await this.prisma.astrologerFreeOffer.findMany({
      where: { astrologerId },
      select: { title: true, startDate: true, endDate: true },
    });
    const keyOf = (t: string, s?: Date | null, e?: Date | null) =>
      `${t}|${s?.toISOString() ?? ''}|${e?.toISOString() ?? ''}`;
    const existingKeys = new Set(
      existing.map((o) => keyOf(o.title, o.startDate, o.endDate)),
    );

    for (const req of requests) {
      const fields = (req.fields ?? {}) as any;
      const payload = fields?.freeOffer;
      if (!payload || typeof payload !== 'object') continue;
      const title = String(payload.title ?? 'Free sessions offer');
      // Date-only inputs (<input type="date">) land as "YYYY-MM-DD" →
      // new Date() would anchor them to 00:00 UTC. For startDate that's
      // fine (promo starts at midnight), but for endDate it would make
      // the offer expire at the very start of the chosen day, not the
      // end — so a user chatting any time on the picked endDate sees
      // the filter reject the offer. Push endDate to end-of-day so the
      // full picked day counts as "still valid".
      const startDate = parseOfferStart(payload.startDate);
      const endDate = parseOfferEnd(payload.endDate);
      if (existingKeys.has(keyOf(title, startDate, endDate))) continue;
      await this.prisma.astrologerFreeOffer.create({
        data: {
          astrologerId,
          title,
          description: payload.description ? String(payload.description) : null,
          source: String(payload.source ?? 'ASTROLOGER'),
          minutesPerSession: Number(payload.minutesPerSession ?? 0),
          usesPerUser: Number(payload.usesPerUser ?? 1),
          ratePerMinuteAfter: Number(payload.ratePerMinute ?? 0),
          startDate,
          endDate,
          active: true,
        },
      });
      existingKeys.add(keyOf(title, startDate, endDate));
    }
  }

  /**
   * Retroactive offer attachment. If a session is live with
   * freeMinutesGranted=0 but an active offer exists for this
   * astrologer+user, attach it on the fly IF the session hasn't yet
   * been billed (secondsBilled === 0). Bounding to "no charges yet"
   * prevents a late-arriving offer from unfairly converting already-
   * charged time into free time, which would break the ledger.
   */
  private async attachOfferToLiveSession(sessionId: number) {
    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        userId: true,
        astrologerId: true,
        freeMinutesGranted: true,
        secondsBilled: true,
        totalCharged: true,
      },
    });
    if (!session) return;
    if (session.status !== 'ACTIVE') return;
    if (session.freeMinutesGranted > 0) return;
    if ((session.secondsBilled ?? 0) > 0) return;
    if ((session.totalCharged ?? 0) > 0) return;

    await this.backfillFreeOffersForAstrologer(session.astrologerId);

    const now = new Date();
    const offer = await this.prisma.astrologerFreeOffer.findFirst({
      where: {
        astrologerId: session.astrologerId,
        active: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
        minutesPerSession: { gt: 0 },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!offer) return;

    const usage = await this.prisma.astrologerFreeOfferUsage.findUnique({
      where: {
        offerId_userId: { offerId: offer.id, userId: session.userId },
      },
    });
    if ((usage?.usesConsumed ?? 0) >= offer.usesPerUser) return;

    await this.prisma.$transaction([
      this.prisma.astrologerChatSession.update({
        where: { id: sessionId },
        data: {
          freeMinutesGranted: offer.minutesPerSession,
          freeOfferId: offer.id,
        },
      }),
      this.prisma.astrologerFreeOfferUsage.upsert({
        where: {
          offerId_userId: { offerId: offer.id, userId: session.userId },
        },
        create: {
          offerId: offer.id,
          userId: session.userId,
          usesConsumed: 1,
          lastUsedAt: now,
        },
        update: {
          usesConsumed: { increment: 1 },
          lastUsedAt: now,
        },
      }),
    ]);
  }

  /**
   * Closes an ACTIVE session the moment the shopper can no longer
   * afford even the next billing minute. Called from the status poll
   * (not tickBilling) so that between minute-boundary ticks the
   * session doesn't keep running with an empty wallet.
   *
   * Skipped while a free-minute window still covers the session —
   * those minutes aren't charged anyway, so a low wallet balance
   * doesn't interrupt them.
   */
  private async endIfBroke(sessionId: number) {
    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        userId: true,
        astrologerId: true,
        pricePerMinute: true,
        freeMinutesGranted: true,
        secondsBilled: true,
      },
    });
    if (!session) return;
    if (session.status !== 'ACTIVE') return;
    if ((session.pricePerMinute ?? 0) <= 0) return;

    const freeSecondsLeft = Math.max(
      0,
      session.freeMinutesGranted * 60 - (session.secondsBilled ?? 0),
    );
    if (freeSecondsLeft > 0) return;

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { walletBalance: true },
    });
    if (!user) return;
    if (user.walletBalance >= session.pricePerMinute) return;

    await this.prisma.$transaction([
      this.prisma.astrologerChatSession.update({
        where: { id: sessionId },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
          endReason: 'insufficient_balance',
        },
      }),
      this.prisma.astrologerAccount.update({
        where: { id: session.astrologerId },
        data: { isBusy: false },
      }),
    ]);
  }

  private async chargeFinalRemainder(sessionId: number) {
    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) return;
    if (session.status !== 'ACTIVE') return;
    if (!session.startedAt) return;
    if ((session.pricePerMinute ?? 0) <= 0) return;

    const base = (session.lastTickAt ?? session.startedAt).getTime();
    const remainderMs = Date.now() - base;
    if (remainderMs <= 0) return;

    const remainderSec = remainderMs / 1000;
    if (remainderSec <= 0) return;

    // Apply the free-offer window to the leftover seconds too. The free
    // slice still accrues GST + admin cut (charged to the astrologer),
    // the paid slice gets the normal debit/split. Order mirrors
    // tickBilling so only the final applied slice advances lastTickAt.
    const freeSecondsTotal = session.freeMinutesGranted * 60;
    const alreadyBilled = session.secondsBilled ?? 0;
    const remainingFree = Math.max(0, freeSecondsTotal - alreadyBilled);
    const freeSlice = Math.min(remainderSec, remainingFree);
    const paidSlice = remainderSec - freeSlice;
    const now = new Date();

    if (freeSlice > 0) {
      await this.applyFreeOfferFee(sessionId, {
        seconds: freeSlice,
        perMinute: session.pricePerMinute,
        advanceTickTo: paidSlice > 0 ? undefined : now,
      });
    }

    if (paidSlice > 0) {
      const gross = +((paidSlice / 60) * session.pricePerMinute).toFixed(2);
      const label =
        freeSlice > 0
          ? `final ${Math.round(paidSlice)}s paid + ${Math.round(freeSlice)}s free`
          : `final ${Math.round(remainderSec)}s @ ₹${session.pricePerMinute}/min`;
      await this.applyCharge(sessionId, {
        gross,
        seconds: paidSlice,
        label,
        advanceTickTo: now,
      });
    }
  }

  /**
   * Lazily expires any PENDING session older than REQUEST_TIMEOUT_MS.
   * Called on every read (list + getSession) so the UI doesn't need a
   * separate cron job — each poll doubles as a sweep. Uses `endReason:
   * 'timeout'` so the frontend can distinguish auto-expiry from a
   * manual astrologer rejection, and shows the right copy in each case.
   */
  private async expireStalePending(astrologerId?: number) {
    const cutoff = new Date(Date.now() - REQUEST_TIMEOUT_MS);
    await this.prisma.astrologerChatSession.updateMany({
      where: {
        status: 'PENDING',
        requestedAt: { lt: cutoff },
        ...(astrologerId ? { astrologerId } : {}),
      },
      data: {
        status: 'REJECTED',
        endedAt: new Date(),
        endReason: 'timeout',
      },
    });
  }

  async requestChat(dto: RequestChatDto) {
    // Gate: don't queue a fresh PENDING on top of a live conversation.
    // An astrologer flagged busy is already mid-session; a second
    // request would only be misleading to the shopper.
    // NB: the live availability flags (isOnline, isBusy) live on
    // AstrologerAccount — the Astrologer model is the public profile
    // and doesn't track runtime state.
    const astro = await this.prisma.astrologerAccount.findUnique({
      where: { id: dto.astrologerId },
      select: { id: true, isOnline: true, isBusy: true },
    });
    if (!astro) throw new NotFoundException('Astrologer not found');
    if (astro.isBusy) {
      throw new BadRequestException(
        'This astrologer is currently busy with another consultation. Please try again in a few minutes.',
      );
    }
    if (!astro.isOnline) {
      throw new BadRequestException(
        'This astrologer is offline right now. Please pick someone else.',
      );
    }

    let pricePerMinute = 0;

    if (dto.serviceId) {
      const service = await this.prisma.astrologerService.findFirst({
        where: { id: dto.serviceId, astrologerId: dto.astrologerId },
      });
      if (service?.price) {
        pricePerMinute = service.price;
      }
    }

    // Launcher doesn't pass serviceId — the shopper just tapped "Chat".
    // Fall back to the astrologer's configured services so the session
    // doesn't silently become a free-mode conversation. Preference order:
    //   1. Cheapest priced service (≥ 1) so the shopper isn't hit with
    //      the premium tier by default.
    //   2. No services at all → stays 0 → treated as "free offer".
    if (pricePerMinute <= 0) {
      const fallback = await this.prisma.astrologerService.findFirst({
        where: {
          astrologerId: dto.astrologerId,
          price: { gt: 0 },
        },
        orderBy: { price: 'asc' },
        select: { id: true, price: true },
      });
      if (fallback?.price) {
        pricePerMinute = fallback.price;
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

    // Back-fill any offers that were approved BEFORE the auto-create
    // code shipped — without this, an astrologer who set up their
    // offer a few days ago would never see it applied because the
    // DB row doesn't exist yet.
    await this.backfillFreeOffersForAstrologer(session.astrologerId);

    // Free-offer lookup — does this astrologer run an active offer,
    // and does this shopper still have uses left? We only attach it
    // at accept time (not request time) so an offer paused between
    // the shopper hitting "chat" and the astrologer accepting still
    // takes effect in the right direction.
    const now = new Date();
    const offer = await this.prisma.astrologerFreeOffer.findFirst({
      where: {
        astrologerId: session.astrologerId,
        active: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
        minutesPerSession: { gt: 0 },
      },
      orderBy: { createdAt: 'desc' },
    });

    let freeMinutesGranted = 0;
    let freeOfferId: number | null = null;
    if (offer) {
      const usage = await this.prisma.astrologerFreeOfferUsage.findUnique({
        where: {
          offerId_userId: { offerId: offer.id, userId: session.userId },
        },
      });
      const used = usage?.usesConsumed ?? 0;
      if (used < offer.usesPerUser) {
        freeMinutesGranted = offer.minutesPerSession;
        freeOfferId = offer.id;
      }
    }

    const ops: any[] = [
      this.prisma.astrologerChatSession.update({
        where: { id: dto.sessionId },
        data: {
          status: 'ACTIVE',
          acceptedAt: now,
          startedAt: now,
          freeMinutesGranted,
          freeOfferId,
        },
        include: { user: true, astrologer: true },
      }),
      this.prisma.astrologerAccount.update({
        where: { id: dto.astrologerId },
        data: { isBusy: true },
      }),
    ];
    if (freeOfferId) {
      ops.push(
        this.prisma.astrologerFreeOfferUsage.upsert({
          where: {
            offerId_userId: { offerId: freeOfferId, userId: session.userId },
          },
          create: {
            offerId: freeOfferId,
            userId: session.userId,
            usesConsumed: 1,
            lastUsedAt: now,
          },
          update: {
            usesConsumed: { increment: 1 },
            lastUsedAt: now,
          },
        }),
      );
    }
    const [updated] = await this.prisma.$transaction(ops);

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

    // Flush whole-minute ticks first, then charge the leftover
    // seconds at the per-second rate so a 3:10 session ends up
    // billed for the full 3m 10s (not just 3m). Both calls share the
    // same applyCharge helper, so GST + astro + admin splits stay
    // consistent no matter the size of the final slice.
    if (session.status === 'ACTIVE' && session.startedAt) {
      await this.tickBilling(dto.sessionId);
      await this.chargeFinalRemainder(dto.sessionId);
    }

    const endedAt = new Date();
    const [ended] = await this.prisma.$transaction([
      this.prisma.astrologerChatSession.update({
        where: { id: dto.sessionId },
        data: {
          status: 'ENDED',
          endedAt,
          endReason: 'manual',
        },
        include: { user: true, astrologer: true },
      }),
      // Free the astrologer so they can pick up the next request.
      this.prisma.astrologerAccount.update({
        where: { id: session.astrologerId },
        data: { isBusy: false },
      }),
    ]);
    return ended;
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

  // Astrologer dashboard calls this to populate the incoming-requests
  // popup. Returns PENDING + currently-ACTIVE sessions so the UI can
  // show both "someone's knocking" and "you're already in a call".
  // Sorted newest first — the PENDING one that just landed should be
  // at the top of the list the UI polls.
  /**
   * Shopper's currently live session (if any). Surfaces a "Return to
   * chat" banner on jyotish pages so a shopper who accidentally
   * navigated away isn't stranded while the session keeps ticking.
   * Returns `null` (not 404) when the shopper has nothing live — the
   * banner just doesn't render.
   */
  async getUserActiveSession(userId: number) {
    return this.prisma.astrologerChatSession.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'PAUSED', 'PENDING'] },
      },
      orderBy: { requestedAt: 'desc' },
      include: { astrologer: true },
    });
  }

  async listForAstrologer(astrologerId: number) {
    // Sweep stale PENDINGs off the live list first. Cheap updateMany
    // — keyed on the same astrologerId we're about to query.
    await this.expireStalePending(astrologerId);
    return this.prisma.astrologerChatSession.findMany({
      where: {
        astrologerId,
        status: { in: ['PENDING', 'ACTIVE', 'PAUSED'] },
      },
      // The session timestamps are requestedAt / acceptedAt / endedAt.
      // There is no `createdAt` column — requestedAt is the moment the
      // user fired the chat, which is what we want here.
      orderBy: { requestedAt: 'desc' },
      include: { user: true },
    });
  }

  /**
   * Missed requests surface for the astrologer: PENDINGs that auto-
   * expired before they could accept. Used by the sidebar "Missed
   * requests" page so the astrologer sees who tried to reach them
   * while they were away, even days later.
   */
  async listMissedForAstrologer(astrologerId: number) {
    await this.expireStalePending(astrologerId);
    return this.prisma.astrologerChatSession.findMany({
      where: {
        astrologerId,
        status: 'REJECTED',
        endReason: 'timeout',
      },
      orderBy: { requestedAt: 'desc' },
      take: 100,
      include: { user: true },
    });
  }

  /**
   * Full request history — every status the astrologer has ever seen
   * (pending live right now, active, paused, ended, manually rejected,
   * auto-expired). Powers the sidebar "Requests" page which groups by
   * status so the astrologer can scan live ones + history in one
   * place. `expireStalePending` sweeps stragglers first so a stale
   * PENDING doesn't show up as live when it really timed out.
   */
  /**
   * Admin-wide ledger of astrologer-sourced free offers. Powers the
   * admin /free-offers tab — each row carries the astrologer's
   * display info so the admin can scan "who's running what" without
   * clicking through to every profile.
   */
  async listAstrologerFreeOffers() {
    return this.prisma.astrologerFreeOffer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        astrologer: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            email: true,
          },
        },
        _count: { select: { usages: true, sessions: true } },
      },
    });
  }

  /**
   * Flip the `active` flag on an astrologer's free-offer row. An
   * inactive offer is skipped by the acceptChat lookup, so no new
   * sessions get granted free minutes — already-attached live
   * sessions keep whatever they were given (we don't yank minutes
   * mid-conversation). Used by the admin to pull a campaign when
   * things go sideways (abuse, billing issue, astrologer request).
   */
  async setAstrologerFreeOfferActive(id: number, active: boolean) {
    const existing = await this.prisma.astrologerFreeOffer.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Free offer not found');
    return this.prisma.astrologerFreeOffer.update({
      where: { id },
      data: { active },
    });
  }

  /**
   * Dashboard snapshot: is the astrologer running a free-minute
   * campaign right now, and how many free sessions have been redeemed
   * so far? Drives the "Active offer" stat card — which needs both
   * a liveness flag and a running count. Runs a lazy self-heal on
   * stale endDates first so a mis-anchored midnight-UTC offer isn't
   * silently reported as inactive.
   */
  async freeOfferSummary(astrologerId: number) {
    await this.backfillFreeOffersForAstrologer(astrologerId);

    const now = new Date();
    const activeOffer = await this.prisma.astrologerFreeOffer.findFirst({
      where: {
        astrologerId,
        active: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
        minutesPerSession: { gt: 0 },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        minutesPerSession: true,
        usesPerUser: true,
        startDate: true,
        endDate: true,
      },
    });

    // Count of sessions where free minutes were actually granted —
    // gives the astrologer a sense of how many users have redeemed
    // their promo to date.
    const totalFreeSessions = await this.prisma.astrologerChatSession.count({
      where: {
        astrologerId,
        freeMinutesGranted: { gt: 0 },
      },
    });

    return { activeOffer, totalFreeSessions };
  }

  /**
   * Ended-session earnings list for the astrologer's Transactions
   * page. Every row carries the user display name, duration, gross,
   * GST, and astro/admin share so the UI can render a clean ledger
   * without further joins.
   */
  async listEarningsForAstrologer(astrologerId: number) {
    return this.prisma.astrologerChatSession.findMany({
      where: {
        astrologerId,
        status: 'ENDED',
      },
      orderBy: { endedAt: 'desc' },
      take: 200,
      include: {
        user: {
          select: { id: true, name: true, email: true, profileImage: true },
        },
      },
    });
  }

  /**
   * Admin-facing ledger: every completed chat session across every
   * astrologer. Includes astrologer summary so the admin can filter
   * or compare earnings across the panel.
   */
  async listAllTransactionsForAdmin(opts: {
    astrologerId?: number;
    limit?: number;
  }) {
    const limit = opts.limit && opts.limit > 0 ? opts.limit : 200;
    return this.prisma.astrologerChatSession.findMany({
      where: {
        status: 'ENDED',
        ...(opts.astrologerId ? { astrologerId: opts.astrologerId } : {}),
      },
      orderBy: { endedAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true, profileImage: true },
        },
        astrologer: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            email: true,
            gst: true,
            revenueAstrologer: true,
            revenueAdmin: true,
          },
        },
      },
    });
  }

  /**
   * Consultation history for a user. Powers the dashboard's
   * "My consultations" tab and is also the data source for the
   * mandatory review prompt (most recent ENDED session without a
   * review attached).
   */
  async listHistoryForUser(userId: number) {
    return this.prisma.astrologerChatSession.findMany({
      where: {
        userId,
        status: { in: ['ENDED', 'REJECTED'] },
      },
      orderBy: { endedAt: 'desc' },
      take: 100,
      include: {
        astrologer: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            profile: { select: { image: true } },
          },
        },
        review: true,
      },
    });
  }

  async listAllForAstrologer(astrologerId: number) {
    await this.expireStalePending(astrologerId);
    return this.prisma.astrologerChatSession.findMany({
      where: { astrologerId },
      orderBy: { requestedAt: 'desc' },
      take: 200,
      include: { user: true },
    });
  }

  async getSession(id: number) {
    const pre = await this.prisma.astrologerChatSession.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        astrologerId: true,
      },
    });
    if (!pre) throw new NotFoundException('Session not found');
    // If this specific session is PENDING and stale, trip the timeout
    // before returning — the shopper's modal polls this endpoint and
    // needs to see the REJECTED+timeout state the moment it crosses
    // the 60s mark.
    if (
      pre.status === 'PENDING' &&
      Date.now() - pre.requestedAt.getTime() >= REQUEST_TIMEOUT_MS
    ) {
      await this.prisma.astrologerChatSession.update({
        where: { id },
        data: {
          status: 'REJECTED',
          endedAt: new Date(),
          endReason: 'timeout',
        },
      });
    }
    // Deduct any due per-minute ticks on ACTIVE sessions so the
    // user's wallet balance + totalCharged stay current without
    // needing a separate cron. Also handles auto-ending when the
    // wallet runs dry.
    if (pre.status === 'ACTIVE') {
      await this.tickBilling(id);
    }

    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
            walletBalance: true,
          },
        },
        astrologer: true,
        messages: true,
        review: true,
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /**
   * Records a typing heartbeat. Called as the user/astrologer types
   * (debounced client-side); the counterpart polls `getLiveStatus` to
   * surface the "typing…" indicator. In-memory on purpose — persisting
   * a noisy state like this to the DB isn't worth the writes.
   */
  /**
   * Accept a post-session review from the shopper. Enforces:
   *   - session exists and belongs to this user
   *   - session is ENDED (can't rate a live/pending chat)
   *   - one review per session (DB unique constraint backs this up)
   *   - rating in [1, 5]
   * Fires best-effort emails to both astrologer and shopper after the
   * insert; email failures are swallowed so review submission itself
   * never fails on SMTP hiccups.
   */
  async submitReview(
    sessionId: number,
    dto: { userId: number; rating: number; comment?: string },
  ) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5.');
    }

    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: sessionId },
      include: {
        astrologer: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            email: true,
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== dto.userId) {
      throw new ForbiddenException('This session is not yours to review.');
    }
    if (session.status !== 'ENDED') {
      throw new BadRequestException(
        'You can only review a session after it has ended.',
      );
    }

    const existing = await this.prisma.astrologerReview.findUnique({
      where: { sessionId },
    });
    if (existing) {
      throw new BadRequestException(
        'You have already submitted a review for this session.',
      );
    }

    const review = await this.prisma.astrologerReview.create({
      data: {
        sessionId,
        astrologerId: session.astrologerId,
        userId: session.userId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      },
    });

    // Email side-effect — best-effort. Kept fire-and-forget so a slow
    // SMTP server doesn't block the response to the shopper.
    void this.emailReview(session, review).catch(() => {});

    return review;
  }

  /**
   * Single polished HTML email to the astrologer when a review lands.
   * We intentionally skip a confirmation email to the shopper — they
   * see an in-app toast the moment the review submits, so a second
   * email feels like noise. The astrologer, on the other hand, isn't
   * in the app when the review drops, so they need the notification.
   *
   * Layout: 100% fluid (media-query-safe), inline styles for Gmail/
   * Outlook compatibility, dark celestial palette that matches the
   * rest of the Jyotish brand. Tested at viewport widths down to
   * 320px — everything reflows to a single column without breaking.
   */
  private async emailReview(
    session: {
      id: number;
      minutesBilled: number;
      secondsBilled?: number;
      totalCharged: number;
      astrologer: {
        fullName: string;
        displayName: string | null;
        email: string;
      } | null;
      user: { name: string; email: string } | null;
    },
    review: { rating: number; comment: string | null; createdAt: Date },
  ) {
    if (!session.astrologer?.email) return;

    const astroName =
      session.astrologer.displayName ??
      session.astrologer.fullName ??
      'Astrologer';
    const userName = session.user?.name ?? 'A shopper';
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    const seconds = Math.max(
      0,
      (session as any).secondsBilled ?? session.minutesBilled * 60,
    );
    const duration =
      seconds >= 60
        ? `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
        : `${Math.round(seconds)}s`;
    const money = `₹${Number(session.totalCharged).toLocaleString('en-IN')}`;
    const comment = review.comment?.trim()
      ? review.comment.replace(/</g, '&lt;').replace(/\n/g, '<br/>')
      : null;
    const sentiment =
      review.rating === 5
        ? 'Loved it'
        : review.rating === 4
          ? 'Very good'
          : review.rating === 3
            ? 'It was okay'
            : review.rating === 2
              ? 'Could be better'
              : 'Disappointing';
    const dashboardUrl = `${process.env.FRONTEND_URL ?? ''}/jyotish/astrologer-dashboard`;

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>New review</title>
  </head>
  <body style="margin:0;padding:0;background:#07050f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:#07050f;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="max-width:580px;width:100%;background:linear-gradient(160deg,#1a1436 0%,#0f0a24 55%,#0b0719 100%);
                        border:1px solid rgba(245,211,127,0.22);border-radius:20px;
                        box-shadow:0 20px 60px rgba(0,0,0,0.45);overflow:hidden;
                        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

            <!-- Brand strip -->
            <tr>
              <td style="height:3px;background:linear-gradient(90deg,transparent,#f5d37f 30%,#c084fc 70%,transparent);"></td>
            </tr>

            <!-- Header -->
            <tr>
              <td align="center" style="padding:28px 24px 12px;">
                <div style="display:inline-block;padding:4px 12px;border-radius:999px;
                            background:rgba(245,211,127,0.12);border:1px solid rgba(245,211,127,0.3);">
                  <span style="font-size:10px;letter-spacing:0.22em;font-weight:700;color:#f5d37f;
                               text-transform:uppercase;">✦ Hecate Jyotish</span>
                </div>
                <h1 style="margin:14px 0 6px;font-size:22px;line-height:1.25;color:#ffffff;
                           font-weight:700;">
                  You have a new review
                </h1>
                <p style="margin:0;font-size:14px;line-height:1.55;color:#cabfe8;">
                  <strong style="color:#f5d37f;">${userName}</strong>
                  just rated your consultation.
                </p>
              </td>
            </tr>

            <!-- Rating hero -->
            <tr>
              <td align="center" style="padding:20px 24px 0;">
                <div style="font-size:40px;letter-spacing:8px;color:#f5d37f;line-height:1;
                            text-shadow:0 0 18px rgba(245,211,127,0.45);">
                  ${stars}
                </div>
                <div style="margin-top:10px;font-size:13px;color:#ffffff;font-weight:600;">
                  ${review.rating} / 5 &middot;
                  <span style="color:#cabfe8;font-weight:500;">${sentiment}</span>
                </div>
              </td>
            </tr>

            <!-- Comment -->
            ${
              comment
                ? `
            <tr>
              <td style="padding:20px 24px 0;">
                <div style="padding:16px 18px;border-radius:14px;
                            background:rgba(245,211,127,0.06);
                            border:1px solid rgba(245,211,127,0.18);
                            border-left:3px solid #f5d37f;
                            font-size:15px;line-height:1.65;color:#f2edff;">
                  &ldquo;${comment}&rdquo;
                </div>
              </td>
            </tr>`
                : ''
            }

            <!-- Session summary -->
            <tr>
              <td style="padding:22px 24px 0;">
                <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;
                            text-transform:uppercase;color:#9b94b8;margin-bottom:8px;">
                  Session details
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                       style="border-collapse:separate;border-spacing:0;
                              background:rgba(255,255,255,0.03);
                              border:1px solid rgba(255,255,255,0.08);
                              border-radius:14px;overflow:hidden;">
                  <tr>
                    <td style="padding:13px 16px;color:#9b94b8;font-size:12px;">Shopper</td>
                    <td style="padding:13px 16px;text-align:right;color:#ffffff;font-size:13px;font-weight:600;">${userName}</td>
                  </tr>
                  <tr>
                    <td style="padding:13px 16px;color:#9b94b8;font-size:12px;border-top:1px solid rgba(255,255,255,0.06);">Duration</td>
                    <td style="padding:13px 16px;text-align:right;color:#ffffff;font-size:13px;font-weight:600;border-top:1px solid rgba(255,255,255,0.06);">${duration}</td>
                  </tr>
                  <tr>
                    <td style="padding:13px 16px;color:#9b94b8;font-size:12px;border-top:1px solid rgba(255,255,255,0.06);">Amount billed</td>
                    <td style="padding:13px 16px;text-align:right;color:#f5d37f;font-size:14px;font-weight:700;border-top:1px solid rgba(255,255,255,0.06);">${money}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding:24px;">
                <a href="${dashboardUrl}"
                   style="display:inline-block;padding:12px 28px;
                          background:linear-gradient(90deg,#f5d37f,#f59e0b);
                          color:#0b0719;font-weight:700;font-size:14px;
                          text-decoration:none;border-radius:999px;
                          box-shadow:0 6px 18px rgba(245,158,11,0.35);">
                  Open astrologer dashboard
                </a>
                <p style="margin:12px 0 0;font-size:11px;color:#9b94b8;line-height:1.6;">
                  Consistent high ratings boost your placement on the consult list.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:18px 24px;background:rgba(0,0,0,0.28);
                         border-top:1px solid rgba(255,255,255,0.06);">
                <p style="margin:0;text-align:center;font-size:11px;color:#7a7293;line-height:1.5;">
                  Hecate Wizard Mall &middot; Jyotish Consultations<br/>
                  You're receiving this because a shopper reviewed your session.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    void this.mail.send({
      to: session.astrologer.email,
      subject: `${stars} New ${review.rating}-star review from ${userName}`,
      html,
    });
  }

  markTyping(sessionId: number, senderType: 'USER' | 'ASTROLOGER') {
    const state = this.typingHeartbeats.get(sessionId) ?? {};
    if (senderType === 'USER') state.userTypingAt = Date.now();
    else state.astroTypingAt = Date.now();
    this.typingHeartbeats.set(sessionId, state);
  }

  /**
   * Called by the shopper's AddMoneyModal on mount + every few
   * seconds while it's open. Kept in the same in-memory map as the
   * typing heartbeats because it expires the same way. On close the
   * frontend just stops pinging — the TTL takes care of clearing.
   */
  markAddingMoney(sessionId: number) {
    const state = this.typingHeartbeats.get(sessionId) ?? {};
    state.addingMoneyAt = Date.now();
    this.typingHeartbeats.set(sessionId, state);
  }

  /**
   * Lightweight status poll used by the in-session chat header. Runs
   * the billing tick as a side effect (so the header shows fresh
   * minutesBilled/wallet numbers), then returns typing flags and a
   * small slice of the session — enough to drive the timer, typing
   * indicator and "balance low" banner without re-fetching the full
   * session blob every second.
   */
  async getLiveStatus(sessionId: number) {
    // Tick first so the numbers below reflect the freshest state.
    // tickBilling internally calls attachOfferToLiveSession, so even
    // if no billing time has elapsed, a live session still gets its
    // offer attached via the 1.5s status poll.
    await this.tickBilling(sessionId);
    // Proactive auto-end — without this the session would keep running
    // for up to ~60s after the wallet hit zero (the next tick is what
    // catches the bankruptcy). Shopper sees "~0 min remaining" but the
    // astrologer keeps typing; neither side is served. Check each poll
    // and close immediately if the shopper can't cover even the next
    // minute, skipping the grace only when free minutes are still
    // available on the session.
    await this.endIfBroke(sessionId);

    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,
        endReason: true,
        pricePerMinute: true,
        minutesBilled: true,
        secondsBilled: true,
        totalCharged: true,
        gstAmount: true,
        astrologerEarning: true,
        adminEarning: true,
        freeMinutesGranted: true,
        userId: true,
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    const heart = this.typingHeartbeats.get(sessionId) ?? {};
    const now = Date.now();
    const isUserTyping =
      (heart.userTypingAt ?? 0) > now - TYPING_TTL_MS;
    const isAstroTyping =
      (heart.astroTypingAt ?? 0) > now - TYPING_TTL_MS;
    const isUserAddingMoney =
      (heart.addingMoneyAt ?? 0) > now - TYPING_TTL_MS;

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { walletBalance: true },
    });

    const freeSecondsTotal = session.freeMinutesGranted * 60;
    const freeSecondsLeft = Math.max(
      0,
      freeSecondsTotal - (session.secondsBilled ?? 0),
    );

    return {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      endReason: session.endReason,
      pricePerMinute: session.pricePerMinute,
      minutesBilled: session.minutesBilled,
      secondsBilled: session.secondsBilled,
      totalCharged: session.totalCharged,
      gstAmount: session.gstAmount,
      astrologerEarning: session.astrologerEarning,
      adminEarning: session.adminEarning,
      freeMinutesGranted: session.freeMinutesGranted,
      freeSecondsLeft,
      walletBalance: user?.walletBalance ?? 0,
      typing: { user: isUserTyping, astrologer: isAstroTyping },
      userAddingMoney: isUserAddingMoney,
    };
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

    // Page in desc order for the `before` cursor, then flip to asc so
    // the UI can append naturally (oldest first, newest at bottom).
    const rows = await this.prisma.astrologerChatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.reverse();
  }

  /**
   * Create a new message on an ACTIVE session. Guards the obvious
   * failure modes: session missing, session already ENDED/REJECTED
   * (so a stale tab can't silently post into a closed room), and
   * sender mismatch (user trying to post as astrologer and vice
   * versa).
   */
  async sendMessage(sessionId: number, dto: SendMessageDto) {
    const session = await this.prisma.astrologerChatSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true, userId: true, astrologerId: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status === 'ENDED' || session.status === 'REJECTED') {
      throw new BadRequestException('This session is closed.');
    }
    if (session.status === 'PENDING') {
      throw new BadRequestException(
        'Session is still pending — wait for the astrologer to accept.',
      );
    }

    const expectedSenderId =
      dto.senderType === 'USER' ? session.userId : session.astrologerId;
    if (expectedSenderId !== dto.senderId) {
      throw new ForbiddenException(
        'Sender does not belong to this conversation.',
      );
    }

    const text = dto.text.trim();
    if (!text) throw new BadRequestException('Message cannot be empty.');

    return this.prisma.astrologerChatMessage.create({
      data: {
        sessionId,
        senderType: dto.senderType,
        senderId: dto.senderId,
        text,
      },
    });
  }
}
