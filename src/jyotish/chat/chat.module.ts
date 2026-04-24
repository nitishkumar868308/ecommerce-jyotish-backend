import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { NotificationsModule } from '../../notifications/notifications.module';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [NotificationsModule, MailModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
