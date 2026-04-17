import { PartialType } from '@nestjs/swagger';
import { CreateCountryPricingDto } from './create-country-pricing.dto';

export class UpdateCountryPricingDto extends PartialType(CreateCountryPricingDto) {}
