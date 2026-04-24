import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

// Inventory sync request body. The frontend / cron typically leaves this
// empty (service defaults to `["bangalore"]`) — exposing it as an optional
// array lets ops target a subset of warehouses from Postman or curl.
export class SyncInventoryDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['bangalore'],
    description:
      'Warehouse codes to pull inventory for. Defaults to ["bangalore"] when omitted.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warehouseCodes?: string[];
}
