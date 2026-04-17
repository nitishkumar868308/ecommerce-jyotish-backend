import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateMarketLinkDto {
  @ApiProperty() @IsString() countryName: string;
  @ApiProperty() @IsString() countryCode: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() url: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
}
