import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';

export class AddMoneyDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: ['CREDIT', 'DEBIT'] })
  @IsEnum(['CREDIT', 'DEBIT'])
  type: 'CREDIT' | 'DEBIT';

  @ApiPropertyOptional({ example: 'Manual top-up' })
  @IsOptional()
  @IsString()
  note?: string;
}
