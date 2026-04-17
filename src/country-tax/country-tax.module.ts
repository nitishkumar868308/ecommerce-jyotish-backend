import { Module } from '@nestjs/common';
import { CountryTaxController } from './country-tax.controller';
import { CountryTaxService } from './country-tax.service';

@Module({
  controllers: [CountryTaxController],
  providers: [CountryTaxService],
  exports: [CountryTaxService],
})
export class CountryTaxModule {}
