import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  ParseIntPipe,
  Headers,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';
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
  @ApiHeader({
    name: 'x-country',
    required: false,
    description:
      'Country code (IND, USA, ...) — snapshots the currency + conversion rate onto the order.',
  })
  create(
    @Body() dto: CreateOrderDto,
    @Headers('x-country') countryCode?: string,
  ) {
    return this.ordersService.create(dto, countryCode);
  }

  @Get('orders/me')
  @ApiOperation({ summary: 'Get the authenticated user\'s orders' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findForUser(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
  ) {
    if (!userId) {
      return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }
    return this.ordersService.findForUser(Number(userId), {
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get a single order (with items) by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
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

  @Get('order-adjustments/by-id/:id')
  @Public()
  @ApiOperation({
    summary:
      'Get a single adjustment by id. Used by the /pay/adjustment/:id landing page the customer opens from their email.',
  })
  getAdjustmentById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getAdjustmentById(id);
  }

  @Post('order-adjustments/:id/initiate-payu')
  @Public()
  @ApiOperation({
    summary:
      'Build a PayU launch payload for an outstanding DEBIT adjustment. The /pay/adjustment/:id page POSTs this to auto-submit to the gateway.',
  })
  initiateAdjustmentPayu(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.initiatePayuForAdjustment(id);
  }

  // ── PayU Callbacks ──
  //
  // PayU posts back as `application/x-www-form-urlencoded` — main.ts
  // registers `express.urlencoded()` so `@Body()` sees the parsed form.
  // Both callbacks terminate with an HTTP 302 back to the storefront
  // (not JSON) — the shopper's browser is the active agent, so we need
  // to leave them on the right themed page.

  @Post('payu/success')
  @Public()
  @ApiOperation({ summary: 'PayU success callback' })
  async payuSuccess(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ) {
    const url = await this.ordersService.handlePayuCallback(body, 'success');
    return res.redirect(302, url);
  }

  @Post('payu/failure')
  @Public()
  @ApiOperation({ summary: 'PayU failure callback' })
  async payuFailure(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ) {
    const url = await this.ordersService.handlePayuCallback(body, 'failure');
    return res.redirect(302, url);
  }

  @Post('payu/sync/:txnid')
  @Public()
  @ApiOperation({
    summary:
      'Reconcile an order with PayU by hitting their verify_payment API. Used when the browser-side callback didn\'t arrive (shopper closed the tab etc.) so our DB never got the final status.',
  })
  syncPayu(@Param('txnid') txnid: string) {
    return this.ordersService.syncOrderWithPayu(txnid);
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
