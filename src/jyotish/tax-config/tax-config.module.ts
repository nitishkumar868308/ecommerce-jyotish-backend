import { Module } from '@nestjs/common';
import { TaxConfigController } from './tax-config.controller';
import { TaxConfigService } from './tax-config.service';

@Module({
  controllers: [TaxConfigController],
  providers: [TaxConfigService],
  exports: [TaxConfigService],
})
export class TaxConfigModule {}
