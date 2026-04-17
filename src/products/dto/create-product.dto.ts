import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  price?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stock?: string;

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

  @ApiPropertyOptional({ type: [Number], description: 'Array of tag IDs' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tagIds?: number[];

  @ApiPropertyOptional({ type: [Number], description: 'Array of offer IDs' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  offerIds?: number[];
}
