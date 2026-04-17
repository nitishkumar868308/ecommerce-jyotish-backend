import { Module } from '@nestjs/common';
import { AstrologerController } from './astrologer.controller';
import { AstrologerService } from './astrologer.service';

@Module({
  controllers: [AstrologerController],
  providers: [AstrologerService],
  exports: [AstrologerService],
})
export class AstrologerModule {}
