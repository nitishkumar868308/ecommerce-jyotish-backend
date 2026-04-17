import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateCountryPricingDto {
  @ApiProperty() @IsString() country: string;
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsNumber() multiplier: number;
  @ApiProperty() @IsString() currency: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() currencySymbol?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() conversionRate?: number;
}
