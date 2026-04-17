import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PenaltyItemDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Late login' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  settlement?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  paid?: number;
}

export class ExtraDocumentItemDto {
  @ApiProperty({ example: 'Degree Certificate' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'https://example.com/doc.pdf' })
  @IsString()
  fileUrl: string;
}

export class ServiceUpdateItemDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  id?: number;

  @ApiProperty({ example: 'Kundli Reading' })
  @IsString()
  serviceName: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  price?: number;

  @ApiProperty({ example: 'INR' })
  @IsString()
  currency: string;

  @ApiProperty({ example: '₹' })
  @IsString()
  currencySymbol: string;
}

export class UpdateAstrologerDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiPropertyOptional({ example: 'Pandit Ravi' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isApproved?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isRejected?: boolean;

  @ApiPropertyOptional({ example: 'Incomplete documents' })
  @IsString()
  @IsOptional()
  rejectReason?: string;

  @ApiPropertyOptional({ example: 'Experienced astrologer...' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 'Ravi Sharma' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: 'MALE' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: 'ravi@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '+91' })
  @IsString()
  @IsOptional()
  countryCode?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsString()
  @IsOptional()
  phoneLocal?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsInt()
  @IsOptional()
  experience?: number;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsString()
  @IsOptional()
  image?: string;

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

  @ApiPropertyOptional({ type: [ServiceUpdateItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceUpdateItemDto)
  @IsOptional()
  services?: ServiceUpdateItemDto[];

  @ApiPropertyOptional({ type: [PenaltyItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PenaltyItemDto)
  @IsOptional()
  penalties?: PenaltyItemDto[];

  @ApiPropertyOptional({ type: [ExtraDocumentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraDocumentItemDto)
  @IsOptional()
  extraDocuments?: ExtraDocumentItemDto[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isTop?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  topRank?: number;

  @ApiPropertyOptional({ example: 70 })
  @IsNumber()
  @IsOptional()
  revenueAstrologer?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsNumber()
  @IsOptional()
  revenueAdmin?: number;

  @ApiPropertyOptional({ example: 18 })
  @IsNumber()
  @IsOptional()
  gst?: number;
}
