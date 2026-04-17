import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber } from 'class-validator';

export class ApplyPromoDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  code: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 101 })
  @IsInt()
  orderId: number;

  @ApiProperty({ example: 500 })
  @IsNumber()
  subtotal: number;
}
