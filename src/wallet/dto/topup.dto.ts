import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TopupDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'Wallet top-up' })
  @IsOptional()
  @IsString()
  note?: string;
}
