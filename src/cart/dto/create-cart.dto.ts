import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsObject } from 'class-validator';

export class CreateCartDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variationId?: string;

  @ApiProperty()
  @IsInt()
  quantity: number;

  @ApiProperty({
    description:
      'Free-form attribute map (e.g. { Color: "Red", Form: "Pack of 2" }). Stored verbatim; used for grouping + display.',
  })
  @IsObject()
  attributes: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description: 'Storefront the item was added from — "wizard" or "quickgo".',
  })
  @IsOptional()
  @IsString()
  purchasePlatform?: string;
}
