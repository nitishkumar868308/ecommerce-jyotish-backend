import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateStateCountryDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() country_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() country_code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() iso2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() iso3166_2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fips_code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() latitude?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() longitude?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
