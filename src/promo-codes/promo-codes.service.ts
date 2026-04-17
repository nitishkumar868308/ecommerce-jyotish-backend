import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoCodeDto, ApplyPromoDto } from './dto';

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

    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestException('Promo code usage limit reached');
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
}
