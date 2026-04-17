import { PartialType } from '@nestjs/swagger';
import { CreateShippingPricingDto } from './create-shipping-pricing.dto';

export class UpdateShippingPricingDto extends PartialType(CreateShippingPricingDto) {}
