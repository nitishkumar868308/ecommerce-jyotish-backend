import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreatePenaltyDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  astrologerId: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Late to session' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @IsOptional()
  settlement?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  paid?: number;
}
