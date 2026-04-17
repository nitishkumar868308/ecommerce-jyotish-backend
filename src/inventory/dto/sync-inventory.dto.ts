import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsObject } from 'class-validator';

export class SyncInventoryDto {
  @ApiProperty() @IsString() locationCode: string;
  @ApiProperty() @IsString() channelSkuCode: string;
  @ApiProperty() @IsInt() quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() minExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channelSerialNo?: string;
  @ApiProperty() @IsObject() payload: any;
  @ApiPropertyOptional() @IsOptional() @IsString() clientSkuId?: string;
}
