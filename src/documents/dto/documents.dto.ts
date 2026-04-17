import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateVerificationDocumentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  astrologerId: number;

  @ApiProperty({ example: 'ID_PROOF', enum: ['ID_PROOF', 'CERTIFICATE'] })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 'https://example.com/doc.pdf' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}

export class CreateExtraDocumentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  astrologerId: number;

  @ApiProperty({ example: 'Degree Certificate' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'https://example.com/degree.pdf' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}
