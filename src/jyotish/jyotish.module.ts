import { Module } from '@nestjs/common';
import { AstrologerModule } from './astrologer/astrologer.module';
import { ChatModule } from './chat/chat.module';
import { AdCampaignModule } from './ad-campaign/ad-campaign.module';
import { ProfileEditModule } from './profile-edit/profile-edit.module';
import { PenaltyModule } from './penalty/penalty.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    AstrologerModule,
    ChatModule,
    AdCampaignModule,
    ProfileEditModule,
    PenaltyModule,
    GatewayModule,
  ],
})
export class JyotishModule {}
