import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

// Payload the admin "Send to warehouse" queue dispatches. A single row per
// product/variation plus the destination warehouse and how many units go.
// `fulfilmentBucket` ties the stock to a city-specific inventory surface
// (e.g. "bangalorewarehouse") the QuickGo inventory page reads back.
export class CreateSendToWarehouseDto {
  @ApiProperty() @IsString() productId: string;

  @ApiPropertyOptional() @IsOptional() @IsString() variationId?: string;

  @ApiProperty() @IsInt() warehouseId: number;

  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) quantity: number;

  @ApiPropertyOptional() @IsOptional() @IsString() fulfilmentBucket?: string;
}
