import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsObject,
  IsBoolean,
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
  @IsObject()
  attributes?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description:
      'Mark the line as purchased once the order is paid. Server sets this via the payment-success hook; clients generally should not.',
  })
  @IsOptional()
  @IsBoolean()
  is_buy?: boolean;
}
