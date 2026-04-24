import { Global, Module } from '@nestjs/common';
import { JyotishNotificationsController } from './jyotish-notifications.controller';
import { JyotishNotificationsService } from './jyotish-notifications.service';

// Global so every jyotish sub-module (astrologer, profile-edit,
// admin-chat) can inject the notifications service without plumbing
// imports module-by-module. Kept separate from the storefront
// NotificationsModule because the audiences + kinds don't overlap.
@Global()
@Module({
  controllers: [JyotishNotificationsController],
  providers: [JyotishNotificationsService],
  exports: [JyotishNotificationsService],
})
export class JyotishNotificationsModule {}
