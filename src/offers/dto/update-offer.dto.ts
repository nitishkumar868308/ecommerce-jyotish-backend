import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class UpdateOfferDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discountType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  discountValue?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  type?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
