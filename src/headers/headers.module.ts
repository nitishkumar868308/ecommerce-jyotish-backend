import { Module } from '@nestjs/common';
import { HeadersController } from './headers.controller';
import { HeadersService } from './headers.service';

@Module({
  controllers: [HeadersController],
  providers: [HeadersService],
  exports: [HeadersService],
})
export class HeadersModule {}
