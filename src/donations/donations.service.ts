import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto, UserDonateDto, ToggleCampaignDto } from './dto';

@Injectable()
export class DonationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.donationCampaign.findMany({
      include: { userDonations: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Storefront-facing: only campaigns flagged `active: true`. `countryCode`
  // is accepted for forward-compatibility (the storefront already passes it)
  // but isn't applied until the schema grows a country column.
  async findActive(_countryCode?: string) {
    return this.prisma.donationCampaign.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateCampaignDto) {
    return this.prisma.donationCampaign.create({ data: dto });
  }

  async update(dto: UpdateCampaignDto) {
    const { id, ...data } = dto;
    const campaign = await this.prisma.donationCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return this.prisma.donationCampaign.update({ where: { id }, data });
  }

  async delete(id: number) {
    const campaign = await this.prisma.donationCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return this.prisma.donationCampaign.delete({ where: { id } });
  }

  async countryWise() {
    const donations = await this.prisma.userDonation.findMany({
      include: { donationCampaign: true },
    });

    const grouped: Record<string, { total: number; count: number }> = {};
    for (const d of donations) {
      const key = d.donationCampaign.title;
      if (!grouped[key]) grouped[key] = { total: 0, count: 0 };
      grouped[key].total += d.amount;
      grouped[key].count += 1;
    }

    return grouped;
  }

  async userDonate(dto: UserDonateDto) {
    const campaign = await this.prisma.donationCampaign.findUnique({
      where: { id: dto.donationCampaignId },
    });
    if (!campaign || !campaign.active) {
      throw new NotFoundException('Campaign not found or inactive');
    }

    return this.prisma.userDonation.create({ data: dto });
  }

  async toggle(dto: ToggleCampaignDto) {
    const campaign = await this.prisma.donationCampaign.findUnique({
      where: { id: dto.id },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return this.prisma.donationCampaign.update({
      where: { id: dto.id },
      data: { active: dto.active },
    });
  }
}
