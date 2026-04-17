import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BannerCountryDto {
  @ApiProperty() @IsString() countryCode: string;
  @ApiProperty() @IsInt() position: number;
}

export class BannerStateDto {
  @ApiProperty() @IsInt() stateId: number;
  @ApiProperty() @IsInt() position: number;
}

export class CreateBannerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() text?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() image?: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) platform: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() link?: string;

  @ApiPropertyOptional({ type: [BannerCountryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BannerCountryDto)
  countries?: BannerCountryDto[];

  @ApiPropertyOptional({ type: [BannerStateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BannerStateDto)
  states?: BannerStateDto[];
}
