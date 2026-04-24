import { Module } from '@nestjs/common';
import { AstrologerModule } from './astrologer/astrologer.module';
import { ChatModule } from './chat/chat.module';
import { AdminChatModule } from './admin-chat/admin-chat.module';
import { JyotishNotificationsModule } from './notifications/jyotish-notifications.module';
import { AdCampaignModule } from './ad-campaign/ad-campaign.module';
import { ProfileEditModule } from './profile-edit/profile-edit.module';
import { PenaltyModule } from './penalty/penalty.module';
import { GatewayModule } from './gateway/gateway.module';
import { TaxConfigModule } from './tax-config/tax-config.module';
import { FreeOffersModule } from './free-offers/free-offers.module';

@Module({
  imports: [
    AstrologerModule,
    ChatModule,
    AdminChatModule,
    JyotishNotificationsModule,
    AdCampaignModule,
    ProfileEditModule,
    PenaltyModule,
    GatewayModule,
    TaxConfigModule,
    FreeOffersModule,
  ],
})
export class JyotishModule {}
