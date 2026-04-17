import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsDateString,
  IsArray,
} from 'class-validator';

export class CreatePromoCodeDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  code: string;

  @ApiProperty({ enum: ['ALL_USERS', 'SPECIFIC_USERS'] })
  @IsEnum(['ALL_USERS', 'SPECIFIC_USERS'])
  appliesTo: 'ALL_USERS' | 'SPECIFIC_USERS';

  @ApiProperty({ enum: ['FLAT', 'PERCENTAGE'] })
  @IsEnum(['FLAT', 'PERCENTAGE'])
  discountType: 'FLAT' | 'PERCENTAGE';

  @ApiProperty({ example: 20 })
  @IsNumber()
  discountValue: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  usageLimit?: number;

  @ApiProperty({ example: '2026-04-01T00:00:00Z' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ example: '2026-05-01T00:00:00Z' })
  @IsDateString()
  validTill: string;

  @ApiPropertyOptional({ example: [1, 2, 3] })
  @IsOptional()
  @IsArray()
  eligibleUsers?: any;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
