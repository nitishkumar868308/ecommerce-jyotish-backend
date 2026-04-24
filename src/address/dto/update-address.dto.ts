import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEmail,
  IsIn,
} from 'class-validator';

// Same dual-shape tolerance as CreateAddressDto. `id` can come from either
// the URL (`PUT /address/:id`) or the body (legacy `PUT /address`).
export class UpdateAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine1?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['HOME', 'OFFICE', 'OTHER', 'Home', 'Office', 'Other'])
  addressType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() addressLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryCode?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landmark?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() userId?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}
