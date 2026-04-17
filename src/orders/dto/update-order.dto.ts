import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
  REFUND = 'REFUND',
}

export enum PaymentStatusEnum {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export class UpdateOrderDto {
  @ApiProperty() @IsInt() id: number;

  @ApiPropertyOptional({ enum: OrderStatusEnum })
  @IsOptional()
  @IsEnum(OrderStatusEnum)
  status?: OrderStatusEnum;

  @ApiPropertyOptional({ enum: PaymentStatusEnum })
  @IsOptional()
  @IsEnum(PaymentStatusEnum)
  paymentStatus?: PaymentStatusEnum;

  @ApiPropertyOptional() @IsOptional() @IsString() trackingLink?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() shippingName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingState?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingPincode?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() billingName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billingPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billingAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billingCity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billingState?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billingPincode?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locationCode?: string;
}
