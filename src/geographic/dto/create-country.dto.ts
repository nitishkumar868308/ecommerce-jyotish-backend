import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCountryDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() iso3: string;
  @ApiProperty() @IsString() iso2: string;
  @ApiProperty() @IsString() numeric_code: string;
  @ApiProperty() @IsString() phonecode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() capital?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency_symbol?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postal_code_format?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postal_code_regex?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() emoji?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emojiU?: string;
}
