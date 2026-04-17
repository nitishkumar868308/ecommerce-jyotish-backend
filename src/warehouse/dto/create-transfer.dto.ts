import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateTransferDto {
  @ApiProperty() @IsString() productId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variationId?: string;
  @ApiProperty() @IsString() productName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variationName?: string;
  @ApiProperty() @IsString() price: string;
  @ApiProperty() @IsString() MRP: string;
  @ApiProperty() @IsString() FNSKU: string;
  @ApiProperty() @IsObject() entries: any;
  @ApiPropertyOptional() @IsOptional() @IsString() image?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
}
