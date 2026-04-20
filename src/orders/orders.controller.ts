import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './dto';
import { Public } from '../common/decorators';
import { Roles } from '../common/decorators';

// ── DTOs for adjustment & payment ──

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';

enum AdjustmentTypeEnum {
  SHIPPING = 'SHIPPING',
  NETWORK_FEE = 'NETWORK_FEE',
  ITEM_ADD = 'ITEM_ADD',
  ITEM_REMOVE = 'ITEM_REMOVE',
  DISCOUNT = 'DISCOUNT',
  PENALTY = 'PENALTY',
  TAX = 'TAX',
  MANUAL = 'MANUAL',
  ITEM_SHIPPING = 'ITEM_SHIPPING',
}

enum AdjustmentImpactEnum {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

class CreateAdjustmentDto {
  @ApiProperty() @IsInt() orderId: number;

  @ApiProperty({ enum: AdjustmentTypeEnum })
  @IsEnum(AdjustmentTypeEnum)
  adjustmentType: AdjustmentTypeEnum;

  @ApiProperty({ enum: AdjustmentImpactEnum })
  @IsEnum(AdjustmentImpactEnum)
  impact: AdjustmentImpactEnum;

  @ApiProperty() @IsNumber() amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isManual?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() manualType?: string;
}

class VerifyPaymentStatusDto {
  @ApiPropertyOptional() @IsOptional() @IsString() orderNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() orderId?: number;
}

// ── Controller ──

@ApiTags('Orders')
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── Orders ──

  @Post('orders')
  @Public()
  @ApiOperation({ summary: 'Create a new order and initiate payment' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get('orders')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all orders (admin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.ordersService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      status,
      paymentStatus,
    });
  }

  @Put('orders')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update order status, payment info (admin)' })
  update(@Body() dto: UpdateOrderDto) {
    return this.ordersService.update(dto);
  }

  @Get('orders/track')
  @Public()
  @ApiOperation({ summary: 'Track order by orderNumber' })
  @ApiQuery({ name: 'orderNumber', required: true })
  trackOrder(@Query('orderNumber') orderNumber: string) {
    return this.ordersService.trackOrder(orderNumber);
  }

  @Post('orders/verify')
  @Public()
  @ApiOperation({ summary: 'Payment verification webhook' })
  verifyPayment(@Body() payload: any) {
    return this.ordersService.verifyPayment(payload);
  }

  @Post('orders/verify-status')
  @Public()
  @ApiOperation({ summary: 'Verify payment status' })
  verifyPaymentStatus(@Body() dto: VerifyPaymentStatusDto) {
    return this.ordersService.verifyPaymentStatus(dto);
  }

  @Get('orders/invoice/:orderId')
  @ApiOperation({ summary: 'Get invoice data for an order' })
  getInvoice(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.ordersService.getInvoice(orderId);
  }

  // ── Order Adjustments ──

  @Post('order-adjustments')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create order adjustment (admin)' })
  createAdjustment(@Body() dto: CreateAdjustmentDto) {
    return this.ordersService.createAdjustment(dto);
  }

  @Get('order-adjustments')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get adjustments for an order (admin)' })
  @ApiQuery({ name: 'orderId', required: true })
  getAdjustments(@Query('orderId', ParseIntPipe) orderId: number) {
    return this.ordersService.getAdjustments(orderId);
  }

  // ── PayU Callbacks ──

  @Post('payu/success')
  @Public()
  @ApiOperation({ summary: 'PayU success callback' })
  payuSuccess(@Body() payload: any) {
    return this.ordersService.verifyPayment(payload);
  }

  @Post('payu/failure')
  @Public()
  @ApiOperation({ summary: 'PayU failure callback' })
  payuFailure(@Body() payload: any) {
    return { status: 'failed', payload };
  }

  @Post('payu/adjustment-success')
  @Public()
  @ApiOperation({ summary: 'PayU adjustment success callback' })
  payuAdjustmentSuccess(@Body() payload: any) {
    return { status: 'adjustment_success', payload };
  }

  @Post('payu/adjustment-failure')
  @Public()
  @ApiOperation({ summary: 'PayU adjustment failure callback' })
  payuAdjustmentFailure(@Body() payload: any) {
    return { status: 'adjustment_failed', payload };
  }

  // ── PayGlocal Callback ──

  @Post('payglocal/callback')
  @Public()
  @ApiOperation({ summary: 'PayGlocal callback' })
  payglocalCallback(@Body() payload: any) {
    return this.ordersService.verifyPayment(payload);
  }
}
