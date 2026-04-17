import { Module } from '@nestjs/common';
import { GeographicController } from './geographic.controller';
import { GeographicService } from './geographic.service';

@Module({
  controllers: [GeographicController],
  providers: [GeographicService],
  exports: [GeographicService],
})
export class GeographicModule {}
