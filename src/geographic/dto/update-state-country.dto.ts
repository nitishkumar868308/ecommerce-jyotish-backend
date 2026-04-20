import { PartialType } from '@nestjs/swagger';
import { CreateStateCountryDto } from './create-state-country.dto';

export class UpdateStateCountryDto extends PartialType(CreateStateCountryDto) {}
