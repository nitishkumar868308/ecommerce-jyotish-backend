import { Module } from '@nestjs/common';
import { DonationsController } from './donations.controller';
import { DonationCampaignsController } from './donation-campaigns.controller';
import { DonationsService } from './donations.service';

@Module({
  controllers: [DonationsController, DonationCampaignsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
