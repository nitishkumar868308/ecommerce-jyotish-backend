import { PartialType } from '@nestjs/swagger';
import { CreateCountryTaxDto } from './create-country-tax.dto';

export class UpdateCountryTaxDto extends PartialType(CreateCountryTaxDto) {}
