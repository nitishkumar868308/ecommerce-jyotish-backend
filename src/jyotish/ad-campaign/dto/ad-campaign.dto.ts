import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsArray,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

export class BookAdDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  astrologerId: number;

  @ApiProperty({ example: ['2026-04-20', '2026-04-21'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  dates: string[];

  /** Optional: the AdCampaign row the astrologer picked from the
   *  tiles. When set, the backend bills `campaign.price × days` so
   *  the total matches the tile price — otherwise we fall back to
   *  `AdCampaignConfig.pricePerDay` (legacy single-rate mode). */
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  campaignId?: number;
}

export class CreateAdCampaignDto {
  @ApiProperty({ example: 'Diwali 2026 Spotlight' })
  @IsString()
  title: string;

  @ApiProperty({ example: 499, description: 'Slot price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 20, description: 'How many astrologer slots this campaign offers' })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateAdCampaignDto {
  @ApiPropertyOptional({ example: 'Diwali 2026 Spotlight' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 499 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
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
