import { PartialType } from '@nestjs/swagger';
import { CreateCityCountryDto } from './create-city-country.dto';

export class UpdateCityCountryDto extends PartialType(CreateCityCountryDto) {}
