import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
} from 'class-validator';

export class CreateSubcategoryDto {
  @ApiProperty({ example: 'Smartphones' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  categoryId: number;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  offerId?: number;

  @ApiPropertyOptional({ example: ['web', 'mobile'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  platform?: string[];

  @ApiPropertyOptional({
    example: [1, 2, 3],
    type: [Number],
    description: 'IDs from the State (location master) table to link.',
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  stateIds?: number[];
}
