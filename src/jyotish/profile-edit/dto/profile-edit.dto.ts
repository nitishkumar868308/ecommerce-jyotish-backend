import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateProfileEditRequestDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  astrologerId: number;

  @ApiProperty({ example: 'personal' })
  @IsString()
  section: string;

  @ApiProperty({ example: 'Updating my bio and languages' })
  @IsString()
  reason: string;

  @ApiProperty({ example: { bio: 'Updated bio text', languages: ['Hindi', 'English', 'Sanskrit'] } })
  @IsObject()
  fields: Record<string, any>;
}

export class FulfillProfileEditRequestDto {
  @ApiProperty({ example: 'APPROVED', enum: ['APPROVED', 'REJECTED', 'PARTIALLY_APPROVED', 'FULFILLED'] })
  @IsString()
  overallStatus: string;

  @ApiPropertyOptional({ example: 'Looks good, approved.' })
  @IsString()
  @IsOptional()
  adminNote?: string;
}
