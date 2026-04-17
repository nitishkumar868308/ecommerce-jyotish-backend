import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsObject } from 'class-validator';

export class PackOrderDto {
  @ApiProperty() @IsString() orderCode: string;
  @ApiProperty() @IsInt() shipmentId: number;
  @ApiProperty() @IsString() locationCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shipmentCode?: string;
  @ApiProperty() @IsObject() payload: any;
}
