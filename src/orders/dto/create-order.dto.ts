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
  @ApiProperty() @IsNumber() productId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiProperty() @IsNumber() quantity: number;
  @ApiProperty() @IsNumber() price: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discount?: number;
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
