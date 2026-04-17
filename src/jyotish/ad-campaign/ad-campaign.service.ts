import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookAdDto, CreateAdConfigDto } from './dto';

@Injectable()
export class AdCampaignService {
  constructor(private prisma: PrismaService) {}

  async bookAd(dto: BookAdDto) {
    const astrologer = await this.prisma.astrologerAccount.findUnique({
      where: { id: dto.astrologerId },
    });
    if (!astrologer) throw new NotFoundException('Astrologer not found');

    const config = await this.getOrCreateConfig();

    const dates = dto.dates.map((d) => new Date(d));
    if (dates.some((d) => isNaN(d.getTime()))) {
      throw new BadRequestException('Invalid date format');
    }

    // Check capacity for each date
    for (const date of dates) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const count = await this.prisma.adBooking.count({
        where: {
          startDate: { lte: endOfDay },
          endDate: { gte: startOfDay },
          status: 'PAID',
        },
      });

      if (count >= config.capacityPerDay) {
        throw new BadRequestException(
          `No capacity available for ${date.toISOString().split('T')[0]}`,
        );
      }
    }

    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];
    const days = dates.length;
    const amount = days * config.pricePerDay;

    return this.prisma.adBooking.create({
      data: {
        astrologerId: dto.astrologerId,
        startDate,
        endDate,
        days,
        amount,
        currency: config.currency,
        currencySymbol: config.currencySymbol,
        status: 'PAID',
        paidAt: new Date(),
      },
      include: { astrologer: true },
    });
  }

  async getAvailability(startDate: string, endDate: string) {
    const config = await this.getOrCreateConfig();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const bookings = await this.prisma.adBooking.findMany({
      where: {
        startDate: { lte: end },
        endDate: { gte: start },
        status: 'PAID',
      },
    });

    // Build a day-by-day availability map
    const availability: { date: string; booked: number; available: number }[] =
      [];
    const current = new Date(start);
    while (current <= end) {
      const dayStr = current.toISOString().split('T')[0];
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const booked = bookings.filter(
        (b) => b.startDate <= dayEnd && b.endDate >= dayStart,
      ).length;

      availability.push({
        date: dayStr,
        booked,
        available: Math.max(0, config.capacityPerDay - booked),
      });

      current.setDate(current.getDate() + 1);
    }

    return { config, availability };
  }

  async getActiveWinners() {
    const now = new Date();
    const bookings = await this.prisma.adBooking.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        status: 'PAID',
      },
      include: {
        astrologer: {
          include: { profile: true, services: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings;
  }

  async getMyBookings(astrologerId: number) {
    return this.prisma.adBooking.findMany({
      where: { astrologerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConfig() {
    return this.getOrCreateConfig();
  }

  async upsertConfig(dto: CreateAdConfigDto) {
    const existing = await this.prisma.adCampaignConfig.findFirst();
    if (existing) {
      return this.prisma.adCampaignConfig.update({
        where: { id: existing.id },
        data: dto,
      });
    }
    return this.prisma.adCampaignConfig.create({ data: dto });
  }

  async getAllBookings() {
    return this.prisma.adBooking.findMany({
      include: { astrologer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getOrCreateConfig() {
    let config = await this.prisma.adCampaignConfig.findFirst();
    if (!config) {
      config = await this.prisma.adCampaignConfig.create({ data: {} });
    }
    return config;
  }
}
