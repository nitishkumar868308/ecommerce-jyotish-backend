import { Module } from '@nestjs/common';
import { FreeOffersController } from './free-offers.controller';
import { FreeOffersService } from './free-offers.service';

@Module({
  controllers: [FreeOffersController],
  providers: [FreeOffersService],
  exports: [FreeOffersService],
})
export class FreeOffersModule {}
