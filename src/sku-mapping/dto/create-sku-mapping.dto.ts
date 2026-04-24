import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateSkuMappingDto {
  @ApiProperty() @IsString() channelSku: string;
  @ApiProperty() @IsString() ourSku: string;

  // When omitted (or null), the mapping applies to every location that
  // carries this channelSku — the common "one-click" case the admin page
  // uses by default. When set, the mapping is a per-location override.
  @ApiPropertyOptional({
    description:
      'Optional Increff locationCode. Omit to apply to all locations; set to override for one warehouse.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  locationCode?: string | null;
}
