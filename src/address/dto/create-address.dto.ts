import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEmail,
  IsIn,
} from 'class-validator';

// Accepts both the legacy column-name payload (`mobile`, `address`, `type`,
// `customType`) and the modern one the storefront + dashboard send today
// (`phone`, `addressLine1`, `addressType`, `addressLabel`). The service
// normalises whichever came in before talking to Prisma, so either shape
// works without a migration.
export class CreateAddressDto {
  @ApiProperty() @IsString() name: string;

  // Modern shape
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional({ description: 'Home / Office / Other' })
  @IsOptional()
  @IsIn(['HOME', 'OFFICE', 'OTHER', 'Home', 'Office', 'Other'])
  addressType?: string;

  @ApiPropertyOptional({ description: 'Custom label when addressType=OTHER' })
  @IsOptional()
  @IsString()
  addressLabel?: string;

  @ApiPropertyOptional({ description: 'Contact email (not persisted)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone country code (not persisted)' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  // Legacy shape — kept so older callers / seeders still validate.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customType?: string;

  // Shared
  @ApiProperty() @IsString() pincode: string;
  @ApiProperty() @IsString() city: string;
  @ApiProperty() @IsString() state: string;

  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() landmark?: string;

  // Optional — controller defaults to the JWT user.
  @ApiPropertyOptional() @IsOptional() @IsInt() userId?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}
