import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateReviewDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;

  @ApiPropertyOptional({ example: 'approved' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
