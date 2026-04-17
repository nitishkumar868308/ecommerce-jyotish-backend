import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateAttributeDto {
  @ApiProperty({ example: 'Color' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: ['Red', 'Blue', 'Green'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  values: string[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
