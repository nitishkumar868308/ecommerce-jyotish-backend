import { Module } from '@nestjs/common';
import { AdminChatController } from './admin-chat.controller';
import { AdminChatService } from './admin-chat.service';

@Module({
  controllers: [AdminChatController],
  providers: [AdminChatService],
  exports: [AdminChatService],
})
export class AdminChatModule {}
