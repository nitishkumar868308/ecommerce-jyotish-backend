import { Module } from '@nestjs/common';
import { ShippingPricingController } from './shipping-pricing.controller';
import { ShippingPricingService } from './shipping-pricing.service';

@Module({
  controllers: [ShippingPricingController],
  providers: [ShippingPricingService],
  exports: [ShippingPricingService],
})
export class ShippingPricingModule {}
