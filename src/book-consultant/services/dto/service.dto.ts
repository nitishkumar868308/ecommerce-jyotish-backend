import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Vedic Astrology' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Short tagline' })
  @IsOptional()
  @IsString()
  shortDesc?: string;

  @ApiPropertyOptional({ example: 'Full description…' })
  @IsOptional()
  @IsString()
  longDesc?: string;

  @ApiPropertyOptional({ example: '/uploads/services/abc.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDesc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  longDesc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
