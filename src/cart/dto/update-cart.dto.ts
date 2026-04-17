import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
} from 'class-validator';

export class UpdateCartDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pricePerItem?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencySymbol?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributes?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selectedCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_buy?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bulkPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  bulkMinQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  offerApplied?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  productOfferApplied?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  productOfferDiscount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  productOffer?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  productOfferId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purchasePlatform?: string;
}
