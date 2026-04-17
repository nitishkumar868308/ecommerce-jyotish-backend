import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDispatchDto {
  @ApiProperty() @IsObject() entries: any;
  @ApiProperty() @IsInt() totalUnits: number;
  @ApiProperty() @IsInt() totalFNSKU: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() dimensions?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trackingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trackingLink?: string;
}
