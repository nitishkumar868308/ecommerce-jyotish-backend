import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdatePromoCodeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;

  @ApiPropertyOptional({ enum: ['ALL_USERS', 'SPECIFIC_USERS'] })
  @IsOptional()
  @IsEnum(['ALL_USERS', 'SPECIFIC_USERS'])
  appliesTo?: 'ALL_USERS' | 'SPECIFIC_USERS';

  @ApiPropertyOptional({ enum: ['FLAT', 'PERCENTAGE'] })
  @IsOptional()
  @IsEnum(['FLAT', 'PERCENTAGE'])
  discountType?: 'FLAT' | 'PERCENTAGE';

  @ApiPropertyOptional() @IsOptional() @IsNumber() discountValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() usageLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validTill?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() eligibleUsers?: any;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
