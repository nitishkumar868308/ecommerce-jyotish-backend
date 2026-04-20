import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ example: ['web', 'mobile'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  platform?: string[];

  @ApiPropertyOptional({ example: '8471' })
  @IsString()
  @IsOptional()
  hsn?: string;

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
