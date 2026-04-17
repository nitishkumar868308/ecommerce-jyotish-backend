import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsArray,
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class BookAdDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  astrologerId: number;

  @ApiProperty({ example: ['2026-04-20', '2026-04-21'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  dates: string[];
}

export class CreateAdConfigDto {
  @ApiPropertyOptional({ example: 50 })
  @IsInt()
  @IsOptional()
  capacityPerDay?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @IsOptional()
  pricePerDay?: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: '₹' })
  @IsString()
  @IsOptional()
  currencySymbol?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsInt()
  @IsOptional()
  homepageDisplayCount?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsInt()
  @IsOptional()
  consultSliderDisplayCount?: number;
}
