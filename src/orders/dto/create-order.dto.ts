import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethodEnum {
  PayU = 'PayU',
  CashFree = 'CashFree',
  PayGlocal = 'PayGlocal',
}

class ShippingAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
}

class BillingAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
}

class OrderItemDto {
  // `Product.id` is a cuid in the current schema, not an auto-increment
  // int, so `productId` needs to be a string. Variation ids come from
  // `ProductVariation.id` (also a cuid).
  @ApiProperty() @IsString() productId: string;

  @ApiPropertyOptional() @IsOptional() @IsString() variationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiProperty() @IsNumber() quantity: number;
  @ApiProperty() @IsNumber() price: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() pricePerItem?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() image?: string;

  // Per-line offer/bulk context the storefront computes at checkout — kept
  // on the order so invoices / admin views can trace what was applied.
  @ApiPropertyOptional() @IsOptional() @IsNumber() paidQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() freeQty?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() bulkApplied?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() offerApplied?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() offerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() offerId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() barCode?: string;

  @ApiPropertyOptional({
    description: 'Free-form attribute map (colour, form, etc.).',
  })
  @IsOptional()
  attributes?: Record<string, unknown>;
}

export class CreateOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() userId?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() userName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() userPhone?: string;

  @ApiPropertyOptional({ type: ShippingAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ApiPropertyOptional({ type: BillingAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() subtotal?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() shippingCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalAmount?: number;

  @ApiProperty({ enum: PaymentMethodEnum })
  @IsEnum(PaymentMethodEnum)
  paymentMethod: PaymentMethodEnum;

  @ApiPropertyOptional() @IsOptional() @IsString() promoCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() donationAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() donationCampaignId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isXpress?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderBy?: string;
}
