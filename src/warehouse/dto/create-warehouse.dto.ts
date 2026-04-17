import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty() @IsString() state: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() address: string;
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsString() pincode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contact?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() fulfillmentWarehouseId?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
