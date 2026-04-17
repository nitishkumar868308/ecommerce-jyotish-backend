import { Module } from '@nestjs/common';
import { MarketLinksController } from './market-links.controller';
import { MarketLinksService } from './market-links.service';

@Module({
  controllers: [MarketLinksController],
  providers: [MarketLinksService],
  exports: [MarketLinksService],
})
export class MarketLinksModule {}
