import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddMoneyDto } from './dto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getWallet(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, walletBalance: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const transactions = await this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return { walletBalance: user.walletBalance, transactions };
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
}
