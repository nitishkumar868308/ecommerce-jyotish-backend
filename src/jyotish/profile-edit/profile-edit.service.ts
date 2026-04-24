import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProfileEditRequestDto,
  FulfillProfileEditRequestDto,
} from './dto';
import { JyotishNotificationsService } from '../notifications/jyotish-notifications.service';
import { parseOfferStart, parseOfferEnd } from '../chat/chat.service';

/** Field name → which astrologer table owns it. Used so approved edits
 *  route to the right row on fulfill (account-level vs. profile-level).
 *  Keys not listed here are ignored (safe default) — admin can still
 *  apply the change manually from the astrologer detail page if we
 *  forgot to whitelist a new field. */
const ACCOUNT_FIELDS = new Set([
  'fullName',
  'displayName',
  'email',
  'phone',
  'phoneLocal',
  'countryCode',
  'gender',
  'bio',
]);

const PROFILE_FIELDS = new Set([
  'experience',
  'image',
  'address',
  'city',
  'state',
  'country',
  'postalCode',
  'languages',
  'specializations',
  'idProofType',
  'idProofValue',
]);

@Injectable()
export class ProfileEditService {
  constructor(
    private prisma: PrismaService,
    private notif: JyotishNotificationsService,
  ) {}

  async findAll() {
    // Returns every request — the admin free-offers page reuses this
    // endpoint (filtered client-side) to show astrologer-submitted
    // "Free sessions offer" rows in its dedicated tab, while the
    // generic /admin/jyotish/profile-edit-requests page filters them
    // OUT client-side so the same row doesn't appear in two queues.
    return this.prisma.profileEditRequest.findMany({
      include: { astrologer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Astrologer-scoped list: only this astrologer's own requests. Used
   *  by the astrologer profile page to render the edit-requests badge
   *  + status summary up top. */
  async findForAstrologer(astrologerId: number) {
    return this.prisma.profileEditRequest.findMany({
      where: { astrologerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateProfileEditRequestDto) {
    const astrologer = await this.prisma.astrologerAccount.findUnique({
      where: { id: dto.astrologerId },
    });
    if (!astrologer) throw new NotFoundException('Astrologer not found');

    // One live free-offer campaign at a time. Two independent signals
    // count as "still in-flight":
    //   1. A PENDING ProfileEditRequest for "Free sessions offer" —
    //      admin hasn't acted on it yet.
    //   2. An active AstrologerFreeOffer whose date window still
    //      covers today — campaign is currently visible to shoppers.
    // Either one blocks a new submission; the astrologer has to wait
    // for rejection/end, or ask admin to deactivate it.
    const isFreeOffer =
      String(dto.section ?? '').toLowerCase() === 'free sessions offer';
    if (isFreeOffer) {
      const pending = await this.prisma.profileEditRequest.findFirst({
        where: {
          astrologerId: dto.astrologerId,
          section: 'Free sessions offer',
          overallStatus: 'PENDING' as any,
        },
      });
      if (pending) {
        throw new BadRequestException(
          'You already have a free-offer request awaiting admin review. Wait for it to be approved or rejected before submitting a new one.',
        );
      }
      const now = new Date();
      const liveOffer = await this.prisma.astrologerFreeOffer.findFirst({
        where: {
          astrologerId: dto.astrologerId,
          active: true,
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: now } }] },
            { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          ],
        },
      });
      if (liveOffer) {
        throw new BadRequestException(
          'You already have an active free-offer campaign running. Ask admin to deactivate it, or wait for its end date, before submitting a new one.',
        );
      }
    }

    const created = await this.prisma.profileEditRequest.create({
      data: {
        astrologerId: dto.astrologerId,
        section: dto.section,
        reason: dto.reason,
        fields: dto.fields,
      },
      include: { astrologer: true },
    });

    // Notify admin that a new request is waiting. Fire-and-forget —
    // the notify service swallows DB errors internally. Free-session
    // offers have their own admin surface, so route the notification
    // straight there instead of dumping the admin on the generic
    // profile-edit-requests queue where the row is filtered out.
    const astroLabel =
      created.astrologer?.displayName ||
      created.astrologer?.fullName ||
      created.astrologer?.email ||
      'An astrologer';
    void this.notif.notify({
      recipient: { type: 'ADMIN' },
      kind: 'EDIT_REQUEST_CREATED',
      title: `New edit request from ${astroLabel}`,
      body: `${dto.section} — ${dto.reason.slice(0, 140)}`,
      link: isFreeOffer
        ? '/admin/jyotish/free-offers'
        : '/admin/jyotish/profile-edit-requests',
    });
    return created;
  }

  /**
   * Admin accepts / rejects an edit request.
   *
   * When status is APPROVED we ALSO apply the requested values to the
   * astrologer so the change goes live without needing a second manual
   * edit. Fields in the `fields` JSON get routed to either the
   * AstrologerAccount row (name, email, gender, bio, …) or the
   * AstrologerProfile row (experience, address, languages, …) via the
   * whitelists above. After applying we bump status to FULFILLED so
   * the astrologer's profile page shows "applied" rather than
   * "approved, waiting" in the requests summary.
   */
  async fulfill(id: number, dto: FulfillProfileEditRequestDto) {
    const request = await this.prisma.profileEditRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Edit request not found');

    const nextStatus = dto.overallStatus;
    const adminNote = dto.adminNote;

    // Reject / partial / pending paths just flip the status row — no
    // value gets written to the astrologer.
    if (nextStatus !== 'APPROVED') {
      const updated = await this.prisma.profileEditRequest.update({
        where: { id },
        data: {
          overallStatus: nextStatus as any,
          adminNote,
        },
        include: { astrologer: true },
      });
      // Ping the astrologer so they know admin acted on their ask.
      if (nextStatus === 'REJECTED') {
        void this.notif.notify({
          recipient: { type: 'ASTROLOGER', astrologerId: updated.astrologerId },
          kind: 'EDIT_REQUEST_REJECTED',
          title: 'Your edit request was rejected',
          body: `${updated.section}${adminNote ? ` — ${adminNote}` : ''}`,
          link: '/jyotish/astrologer-dashboard/profile',
        });
      }
      return updated;
    }

    // APPROVED path: apply the fields JSON to the astrologer, then
    // record the request as FULFILLED in the same transaction so a
    // crash between the two writes can't leave the DB inconsistent.
    const fields = (request.fields ?? {}) as Record<string, unknown>;
    const accountData: Record<string, unknown> = {};
    const profileData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (ACCOUNT_FIELDS.has(key)) {
        accountData[key] = this.coerceField(key, value);
      } else if (PROFILE_FIELDS.has(key)) {
        profileData[key] = this.coerceField(key, value);
      }
      // Unknown keys: silently ignore. Admin can still apply them
      // manually from the astrologer detail page.
    }

    // "Free sessions offer" requests carry a nested `freeOffer`
    // payload that doesn't map to an astrologer column — it needs to
    // materialise as an AstrologerFreeOffer row so chat sessions can
    // find it at accept time and grant free minutes. We create it
    // here alongside the status flip so the astrologer doesn't have
    // to wait on an ops workflow.
    const freeOfferPayload = (fields as any).freeOffer as
      | Record<string, any>
      | undefined;
    const isFreeOfferRequest =
      freeOfferPayload && typeof freeOfferPayload === 'object';

    const ops: any[] = [
      this.prisma.astrologerAccount.update({
        where: { id: request.astrologerId },
        data: {
          ...accountData,
          ...(Object.keys(profileData).length > 0
            ? {
                profile: {
                  upsert: {
                    create: profileData as any,
                    update: profileData as any,
                  },
                },
              }
            : {}),
        },
      }),
      this.prisma.profileEditRequest.update({
        where: { id },
        data: {
          overallStatus: 'FULFILLED' as any,
          adminNote,
        },
      }),
    ];

    if (isFreeOfferRequest) {
      ops.push(
        this.prisma.astrologerFreeOffer.create({
          data: {
            astrologerId: request.astrologerId,
            title: String(freeOfferPayload.title ?? 'Free sessions offer'),
            description: freeOfferPayload.description
              ? String(freeOfferPayload.description)
              : null,
            source: String(freeOfferPayload.source ?? 'ASTROLOGER'),
            minutesPerSession: Number(
              freeOfferPayload.minutesPerSession ?? 0,
            ),
            usesPerUser: Number(freeOfferPayload.usesPerUser ?? 1),
            ratePerMinuteAfter: Number(freeOfferPayload.ratePerMinute ?? 0),
            // Date-only picker values need to bracket the full calendar
            // day — otherwise the offer "expires" at 00:00 UTC on the
            // picked endDate and fails the gte-now filter in acceptChat.
            startDate: parseOfferStart(freeOfferPayload.startDate),
            endDate: parseOfferEnd(freeOfferPayload.endDate),
            active: true,
          },
        }),
      );
    }

    await this.prisma.$transaction(ops);

    const final = await this.prisma.profileEditRequest.findUnique({
      where: { id },
      include: { astrologer: true },
    });

    // Tell the astrologer their change is live.
    if (final) {
      void this.notif.notify({
        recipient: {
          type: 'ASTROLOGER',
          astrologerId: final.astrologerId,
        },
        kind: 'EDIT_REQUEST_APPROVED',
        title: 'Your edit request was approved',
        body: `${final.section} is now updated.${adminNote ? ` Admin: ${adminNote}` : ''}`,
        link: '/jyotish/astrologer-dashboard/profile',
      });
    }
    return final;
  }

  /**
   * Turn whatever shape the astrologer submitted (always stored as
   * JSON so it can be strings, numbers, arrays, etc.) into the type
   * the relevant Prisma column expects. Falls back to the raw value
   * when the key isn't a special case — Prisma will throw if the
   * type is wrong, which surfaces to the admin immediately.
   */
  private coerceField(key: string, raw: unknown): unknown {
    if (raw === null || raw === undefined) return raw;
    if (key === 'experience') {
      const n = Number(raw);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    }
    if (key === 'languages' || key === 'specializations') {
      if (Array.isArray(raw)) return raw.map((v) => String(v));
      if (typeof raw === 'string') {
        return raw
          .split(/[,;\n]/)
          .map((v) => v.trim())
          .filter(Boolean);
      }
      return [];
    }
    // Everything else: stringify for safety. Prisma will reject if
    // the column isn't String-compatible (useful sanity check).
    return typeof raw === 'string' ? raw : JSON.stringify(raw);
  }
}
