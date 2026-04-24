import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoCodeDto, UpdatePromoCodeDto, ApplyPromoDto } from './dto';

@Injectable()
export class PromoCodesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.promoCode.findMany({
      where: { deleted: false },
      include: { users: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Public list of promo codes a shopper can see at checkout.
   *
   *  - All-users codes: visible to everyone
   *  - Specific-user codes: visible ONLY when `userId` is in the
   *    `eligibleUsers` list (private invitations that happen to be
   *    discoverable to the target user inside their checkout)
   *  - Globally exhausted codes (`usedCount >= usageLimit`) stay in
   *    the list so the admin's hand-out is still recognisable, but we
   *    flag `exhausted: true` so the UI can render them disabled with
   *    a "Used up" chip instead of silently hiding them
   *  - Per-user usage is surfaced via `usedByUser` so codes the
   *    shopper has already claimed come back disabled with "Used"
   */
  async findPublic(userId?: number) {
    const now = new Date();
    const rows = await this.prisma.promoCode.findMany({
      where: {
        deleted: false,
        active: true,
        validFrom: { lte: now },
        validTill: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch this user's historical promo usage in one shot so we don't
    // do N+1 queries when the checkout page renders. Empty list means
    // anonymous browsing — we simply won't mark any code as "used by
    // you" in that case.
    const usedPromoIds = new Set<number>();
    if (userId != null) {
      const usages = await this.prisma.promoUser.findMany({
        where: { userId },
        select: { promoId: true },
      });
      for (const u of usages) usedPromoIds.add(u.promoId);
    }

    // Per-user usage counts (how many times THIS shopper has already
    // redeemed each code). `usageLimit` on the promo is a per-user cap
    // — a code with usageLimit=1 means every eligible user can apply
    // it once, not that only one person can apply it globally. This
    // matches the admin mental model ("1 use per user"), and we show
    // codes disabled once the shopper hits their personal cap.
    const userUsageMap = new Map<number, number>();
    if (userId != null) {
      const grouped = await this.prisma.promoUser.groupBy({
        by: ['promoId'],
        where: { userId },
        _count: { promoId: true },
      });
      for (const g of grouped) {
        userUsageMap.set(g.promoId, g._count.promoId);
      }
    }

    const visible = rows.filter((p) => {
      if (p.appliesTo === 'ALL_USERS') return true;
      if (p.appliesTo === 'SPECIFIC_USERS') {
        if (userId == null) return false;
        const eligible = (p.eligibleUsers as number[] | null) ?? [];
        return eligible.includes(userId);
      }
      return false;
    });

    return visible.map((p) => {
      const userCount = userUsageMap.get(p.id) ?? 0;
      const exhausted =
        p.usageLimit != null && userCount >= p.usageLimit;
      return {
        id: p.id,
        code: p.code,
        discountType: p.discountType,
        discountValue: p.discountValue,
        validTill: p.validTill,
        appliesTo: p.appliesTo,
        exhausted,
        usedByUser: userCount > 0,
      };
    });
  }

  async create(dto: CreatePromoCodeDto) {
    return this.prisma.promoCode.create({
      data: {
        code: dto.code,
        appliesTo: dto.appliesTo as any,
        discountType: dto.discountType as any,
        discountValue: dto.discountValue,
        usageLimit: dto.usageLimit,
        validFrom: new Date(dto.validFrom),
        validTill: new Date(dto.validTill),
        eligibleUsers: dto.eligibleUsers ?? undefined,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: number, dto: UpdatePromoCodeDto) {
    const existing = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!existing || existing.deleted) {
      throw new NotFoundException('Promo code not found');
    }
    const data: Record<string, unknown> = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.appliesTo !== undefined) data.appliesTo = dto.appliesTo;
    if (dto.discountType !== undefined) data.discountType = dto.discountType;
    if (dto.discountValue !== undefined) data.discountValue = dto.discountValue;
    if (dto.usageLimit !== undefined) data.usageLimit = dto.usageLimit;
    if (dto.validFrom !== undefined) data.validFrom = new Date(dto.validFrom);
    if (dto.validTill !== undefined) data.validTill = new Date(dto.validTill);
    if (dto.eligibleUsers !== undefined) data.eligibleUsers = dto.eligibleUsers;
    if (dto.active !== undefined) data.active = dto.active;
    return this.prisma.promoCode.update({ where: { id }, data });
  }

  async delete(id: number) {
    const existing = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!existing || existing.deleted) {
      throw new NotFoundException('Promo code not found');
    }
    return this.prisma.promoCode.update({
      where: { id },
      data: { deleted: true, active: false },
    });
  }

  async apply(dto: ApplyPromoDto) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: dto.code },
      include: { users: true },
    });

    if (!promo || promo.deleted || !promo.active) {
      throw new NotFoundException('Promo code not found or inactive');
    }

    const now = new Date();
    if (now < promo.validFrom || now > promo.validTill) {
      throw new BadRequestException('Promo code has expired or is not yet valid');
    }

    // Per-user usage check. `usageLimit` caps how many times THIS user
    // can redeem the code — a global counter is misleading here
    // because one user applying it 5 times shouldn't lock everyone
    // else out on a public "welcome" code.
    if (promo.usageLimit != null) {
      const userUsage = await this.prisma.promoUser.count({
        where: { promoId: promo.id, userId: dto.userId },
      });
      if (userUsage >= promo.usageLimit) {
        throw new BadRequestException(
          'You have already redeemed this promo code the maximum number of times.',
        );
      }
    }

    if (promo.appliesTo === 'SPECIFIC_USERS') {
      const eligible = promo.eligibleUsers as number[] | null;
      if (!eligible || !eligible.includes(dto.userId)) {
        throw new BadRequestException('You are not eligible for this promo code');
      }
    }

    let discountAmount: number;
    if (promo.discountType === 'FLAT') {
      discountAmount = promo.discountValue;
    } else {
      discountAmount = (dto.subtotal * promo.discountValue) / 100;
    }

    discountAmount = Math.min(discountAmount, dto.subtotal);

    // Only persist the usage record once an orderId is available — the
    // storefront calls this endpoint on the checkout page (pre-order) purely
    // to compute the discount. Persisting on the pre-check would also let a
    // shopper burn through `usageLimit` just by hammering "Apply".
    if (dto.orderId != null) {
      const [promoUser] = await this.prisma.$transaction([
        this.prisma.promoUser.create({
          data: {
            promoId: promo.id,
            userId: dto.userId,
            orderId: dto.orderId,
            discountAmount,
            subtotal: dto.subtotal,
          },
        }),
        this.prisma.promoCode.update({
          where: { id: promo.id },
          data: { usedCount: { increment: 1 } },
        }),
      ]);
      return { discountAmount, promoUser };
    }

    return { discountAmount };
  }
}
