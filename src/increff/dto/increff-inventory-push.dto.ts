import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// Shape Increff pushes on their inventory webhook (PUT /inventory/sync).
// One payload per location; each line carries the channel SKU + on-hand
// quantity. Upserted into `BangaloreIncreffInventory`; `quantity` on
// update is INCREMENTED (not replaced) to mirror the legacy Next.js route.
export class IncreffInventoryLineDto {
  @ApiProperty({ example: 'Red_Candle_100' })
  @IsString()
  channelSkuCode: string;

  @ApiProperty({ example: 1, minimum: 0 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ nullable: true, example: null })
  @IsOptional()
  @IsString()
  minExpiry?: string | null;

  @ApiPropertyOptional({ nullable: true, example: null })
  @IsOptional()
  @IsString()
  channelSerialNo?: string | null;

  // Increff pushes this in snake_case; the DB column is `clientSkuId`.
  @ApiPropertyOptional({ nullable: true, example: 'RED-CANDLE-100' })
  @IsOptional()
  @IsString()
  client_sku_id?: string | null;
}

export class IncreffInventoryPushDto {
  @ApiProperty({ example: 'KUD01', description: 'Increff location code.' })
  @IsString()
  locationCode: string;

  @ApiProperty({ type: [IncreffInventoryLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IncreffInventoryLineDto)
  inventories: IncreffInventoryLineDto[];
}
