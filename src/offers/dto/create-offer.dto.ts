import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

/**
 * Offer payloads.
 *
 * `discountType` indicates the shape `discountValue` must match. We keep the
 * storage flexible (Json) but callers should adhere to one of the shapes below
 * — the frontend and checkout engine both branch on `discountType`:
 *
 *   "RANGE_FREE"  → discountValue = { from: number; to: number; freeCount: number }
 *                   Buyer gets `freeCount` free items when `from ≤ qty ≤ to`.
 *
 *   "PERCENTAGE"  → discountValue = { minQty: number; percent: number }
 *                   Percentage off when `qty ≥ minQty`.
 *
 * `type` is a free-form scope marker (e.g. { scope: 'PRODUCT' }). Reserved for
 * future expansion — current code only checks `discountType`.
 */
export class CreateOfferDto {
  @ApiProperty({ example: 'Diwali Sale' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'RANGE_FREE',
    description:
      'One of "RANGE_FREE" or "PERCENTAGE". Controls the shape of discountValue.',
  })
  @IsString()
  discountType: string;

  @ApiProperty({
    example: { from: 12, to: 19, freeCount: 2 },
    description:
      'For RANGE_FREE: { from, to, freeCount }. For PERCENTAGE: { minQty, percent }.',
  })
  @IsObject()
  discountValue: any;

  @ApiProperty({ example: { scope: 'PRODUCT' } })
  @IsObject()
  type: any;

  @ApiPropertyOptional({ example: 'Festival discount' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
