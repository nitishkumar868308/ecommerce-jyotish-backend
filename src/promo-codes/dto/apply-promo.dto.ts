import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, IsOptional } from 'class-validator';

export class ApplyPromoDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  code: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  // orderId is only known once the order has been created. The storefront
  // validates the promo on the checkout page before the order exists, so
  // this field is optional — persistence of the PromoUser row is skipped
  // when it's missing and happens at order-placement time instead.
  @ApiPropertyOptional({ example: 101 })
  @IsOptional()
  @IsInt()
  orderId?: number;

  @ApiProperty({ example: 500 })
  @IsNumber()
  subtotal: number;
}
