import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddMoneyDto, TopupDto } from './dto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, walletBalance: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return { balance: user.walletBalance };
  }

  async getTransactions(
    userId: number,
    opts: { page?: number; limit?: number } = {},
  ) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? opts.limit : 20;
    const skip = (page - 1) * limit;

    const [total, transactions] = await this.prisma.$transaction([
      this.prisma.walletTransaction.count({ where: { userId } }),
      this.prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { data: transactions, page, limit, total };
  }

  async addMoney(dto: AddMoneyDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const newBalance =
      dto.type === 'CREDIT'
        ? user.walletBalance + dto.amount
        : user.walletBalance - dto.amount;

    if (newBalance < 0) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const [updatedUser, transaction] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: dto.userId },
        data: { walletBalance: newBalance },
      }),
      this.prisma.walletTransaction.create({
        data: {
          userId: dto.userId,
          amount: dto.amount,
          type: dto.type,
          note: dto.note,
        },
      }),
    ]);

    return { walletBalance: updatedUser.walletBalance, transaction };
  }

  // Self-service top-up: the authenticated user credits their own
  // wallet. Until the real PayU / PayGlocal gateway is wired this
  // stands in for a successful gateway callback — it unblocks wallet
  // flows (consultation prepay, checkout, etc.) end-to-end while the
  // payment integration is still in flight.
  async topup(userId: number, dto: TopupDto) {
    return this.addMoney({
      userId,
      amount: dto.amount,
      type: 'CREDIT',
      note: dto.note ?? 'Wallet top-up',
    });
  }
}
