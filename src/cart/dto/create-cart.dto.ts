import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
} from 'class-validator';

export class CreateCartDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variationId?: string;

  @ApiProperty()
  @IsString()
  productName: string;

  @ApiProperty()
  @IsInt()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  pricePerItem: number;

  @ApiProperty()
  @IsString()
  currencySymbol: string;

  @ApiProperty()
  @IsNumber()
  totalPrice: number;

  @ApiProperty()
  @IsObject()
  attributes: any;

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
  @IsString()
  barCode?: string;

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
  purchasePlatform?: string;
}
