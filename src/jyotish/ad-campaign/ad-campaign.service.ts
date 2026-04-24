import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BookAdDto,
  CreateAdConfigDto,
  CreateAdCampaignDto,
  UpdateAdCampaignDto,
} from './dto';

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

    // Price resolution: when the astrologer picked a specific
    // AdCampaign tile, bill `campaign.price × days` so the total the
    // caller saw on the tile is what actually lands on AdBooking.
    // Falls back to the global AdCampaignConfig rate when no
    // campaignId is sent (legacy + guard against stale frontend).
    let perSlot = config.pricePerDay;
    if (dto.campaignId) {
      const campaign = await this.prisma.adCampaign.findUnique({
        where: { id: dto.campaignId },
      });
      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
      if (!campaign.active) {
        throw new BadRequestException('This campaign is no longer active.');
      }
      perSlot = campaign.price;
    }
    const amount = days * perSlot;

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
        // No campaign FK on AdBooking yet; the admin bookings tab
        // infers the per-slot rate from amount/days.
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

  // ─── Admin Campaign Slots ───
  //
  // Separate from AdBooking (which represents an astrologer buying specific
  // days). A Campaign is admin-defined: title, slot price, how many astrologer
  // slots exist. Astrologers can later be attached via a follow-up flow.

  /** Public-facing list of active campaigns the astrologer can pick
   *  from. Returns bare campaign rows (title + price + capacity) so the
   *  astrologer's ad-campaigns page can render them as selectable tiles
   *  above the booking calendar. */
  async listActiveCampaigns() {
    return this.prisma.adCampaign.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listCampaigns(params: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.max(1, Math.min(100, params.limit ?? 20));
    const search = params.search?.trim();

    const where = search
      ? { title: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [total, data] = await Promise.all([
      this.prisma.adCampaign.count({ where }),
      this.prisma.adCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async createCampaign(dto: CreateAdCampaignDto) {
    return this.prisma.adCampaign.create({ data: dto });
  }

  async updateCampaign(id: number, dto: UpdateAdCampaignDto) {
    const existing = await this.prisma.adCampaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Campaign not found');
    return this.prisma.adCampaign.update({ where: { id }, data: dto });
  }

  async deleteCampaign(id: number) {
    const existing = await this.prisma.adCampaign.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Campaign not found');
    return this.prisma.adCampaign.delete({ where: { id } });
  }
}
