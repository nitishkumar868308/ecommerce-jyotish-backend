import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
  IsInt,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ServiceItemDto {
  @ApiProperty({ example: 'Kundli Reading' })
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  price?: number;

  @ApiProperty({ example: 'INR' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ example: '₹' })
  @IsString()
  @IsNotEmpty()
  currencySymbol: string;
}

export class DocumentItemDto {
  @ApiProperty({ example: 'ID_PROOF', enum: ['ID_PROOF', 'CERTIFICATE'] })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'https://example.com/doc.pdf' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}

export class RegisterAstrologerDto {
  @ApiProperty({ example: 'Ravi Sharma' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ example: 'Pandit Ravi' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiProperty({ example: 'ravi@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  phoneLocal: string;

  @ApiProperty({ example: '+91' })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiPropertyOptional({ example: 'MALE', enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  experience?: number;

  @ApiPropertyOptional({ example: 'Experienced Vedic astrologer...' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsString()
  @IsOptional()
  profilePhoto?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: '400001' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ example: ['Hindi', 'English'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @ApiPropertyOptional({ example: ['Vedic', 'Numerology'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specializations?: string[];

  @ApiPropertyOptional({ type: [ServiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  @IsOptional()
  services?: ServiceItemDto[];

  @ApiPropertyOptional({ type: [DocumentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentItemDto)
  @IsOptional()
  documents?: DocumentItemDto[];

  @ApiPropertyOptional({ example: 'AADHAAR' })
  @IsString()
  @IsOptional()
  idProofType?: string;

  @ApiPropertyOptional({ example: '1234-5678-9012' })
  @IsString()
  @IsOptional()
  idProofValue?: string;
}
