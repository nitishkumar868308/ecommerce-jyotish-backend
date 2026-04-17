import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class CreateOfferDto {
  @ApiProperty({ example: 'Diwali Sale' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'PERCENTAGE' })
  @IsString()
  discountType: string;

  @ApiProperty({ example: { value: 10 } })
  @IsObject()
  discountValue: any;

  @ApiProperty({ example: { scope: 'PRODUCT' } })
  @IsObject()
  type: any;

  @ApiPropertyOptional({ example: 'Festival discount' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
