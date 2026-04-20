import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
} from 'class-validator';

/**
 * The `State` table acts as the master location entry that banners, categories
 * and subcategories link to. Each row captures the full country → state → city
 * lineage so downstream pages don't have to re-join against the geographic
 * tables.
 */
export class CreateStateDto {
  @ApiPropertyOptional({ example: 101 })
  @IsInt()
  @IsOptional()
  countryId?: number;

  @ApiPropertyOptional({ example: 'India' })
  @IsString()
  @IsOptional()
  countryName?: string;

  @ApiPropertyOptional({ example: 3512 })
  @IsInt()
  @IsOptional()
  stateRefId?: number;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 12854 })
  @IsInt()
  @IsOptional()
  cityRefId?: number;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
