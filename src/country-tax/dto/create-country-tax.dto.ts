import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateCountryTaxDto {
  @ApiProperty() @IsString() country: string;
  @ApiProperty() @IsInt() categoryId: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() generalTax?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() gstTax?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;
}
