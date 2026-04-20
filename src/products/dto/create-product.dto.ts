import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsNumber,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Single volume-pricing tier. Example: { qty: 20, unitPrice: 2 } */
export class BulkPricingTierDto {
  @ApiProperty({ example: 20 })
  @IsInt()
  qty: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  unitPrice: number;
}

/** One resolved attribute value for a variation row. */
export class AttributeComboEntryDto {
  @ApiProperty({ example: 'Color' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Red' })
  @IsString()
  value: string;
}

export class ProductMarketLinkDto {
  @ApiProperty({ example: 'United States' })
  @IsString()
  @IsNotEmpty()
  countryName: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ example: 'Amazon' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'https://amazon.com/dp/XYZ' })
  @IsString()
  @IsNotEmpty()
  url: string;
}

export class CreateProductVariationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  variationName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  price?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  MRP?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stock?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  short?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  offerId?: number;

  @ApiPropertyOptional({ type: [BulkPricingTierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkPricingTierDto)
  bulkPricingTiers?: BulkPricingTierDto[];

  @ApiPropertyOptional({ type: [AttributeComboEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeComboEntryDto)
  attributeCombo?: AttributeComboEntryDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  dimension?: any;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[];
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsInt()
  subcategoryId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  color?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  price?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  size?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stock?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  short?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  offerId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  otherCountriesPrice?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  image: string[];

  @ApiPropertyOptional()
  @IsOptional()
  isDefault?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bulkPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minQuantity?: string;

  @ApiPropertyOptional({ type: [BulkPricingTierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkPricingTierDto)
  bulkPricingTiers?: BulkPricingTierDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  MRP?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platform?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  dimension?: any;

  @ApiPropertyOptional({ type: [CreateProductVariationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariationDto)
  variations?: CreateProductVariationDto[];

  @ApiPropertyOptional({ type: [ProductMarketLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductMarketLinkDto)
  marketLinks?: ProductMarketLinkDto[];

  @ApiPropertyOptional({ type: [Number], description: 'Array of tag IDs' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[];

  @ApiPropertyOptional({
    type: [Number],
    description:
      'Deprecated — use offerId for a single product-level offer. Array of offer IDs still accepted for backward compatibility.',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  offerIds?: number[];
}
