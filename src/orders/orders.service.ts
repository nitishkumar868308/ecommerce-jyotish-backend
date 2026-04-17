import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Generate a unique order number: ORD-YYYYMMDD-XXXXX */
  private generateOrderNumber(): string {
    const date = new Date();
    const ymd =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ORD-${ymd}-${rand}`;
  }

  async create(dto: CreateOrderDto) {
    const orderNumber = this.generateOrderNumber();

    const order = await this.prisma.orders.create({
      data: {
        userId: dto.userId ?? null,
        shippingName: dto.shippingAddress?.name ?? null,
        shippingPhone: dto.shippingAddress?.phone ?? null,
        shippingAddress: dto.shippingAddress?.address ?? null,
        shippingCity: dto.shippingAddress?.city ?? null,
        shippingState: dto.shippingAddress?.state ?? null,
        shippingPincode: dto.shippingAddress?.pincode ?? null,
        billingName: dto.billingAddress?.name ?? null,
        billingPhone: dto.billingAddress?.phone ?? null,
        billingAddress: dto.billingAddress?.address ?? null,
        billingCity: dto.billingAddress?.city ?? null,
        billingState: dto.billingAddress?.state ?? null,
        billingPincode: dto.billingAddress?.pincode ?? null,
        items: dto.items as any,
        subtotal: dto.subtotal ?? null,
        shippingCharges: dto.shippingCharges ?? null,
        taxAmount: dto.taxAmount ?? null,
        discountAmount: dto.discountAmount ?? null,
        totalAmount: dto.totalAmount ?? null,
        paymentMethod: dto.paymentMethod,
        paymentCurrency: 'INR',
        orderNumber,
        promoCode: dto.promoCode ?? null,
        donationAmount: dto.donationAmount ?? null,
        donationCampaignId: dto.donationCampaignId ?? null,
        note: dto.note ?? null,
        orderBy: dto.orderBy ?? null,
        locationCode: dto.warehouseCode ?? null,
      },
    });

    return order;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { deleted: 0 };
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

    const [orders, total] = await Promise.all([
      this.prisma.orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.orders.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(dto: UpdateOrderDto) {
    const existing = await this.prisma.orders.findUnique({
      where: { id: dto.id },
    });
    if (!existing) throw new NotFoundException('Order not found');

    const { id, ...updateData } = dto;

    // Remove undefined values
    const cleanData: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) cleanData[key] = value;
    }

    return this.prisma.orders.update({
      where: { id },
      data: cleanData,
    });
  }

  async trackOrder(orderNumber: string) {
    if (!orderNumber)
      throw new BadRequestException('orderNumber is required');

    const order = await this.prisma.orders.findUnique({
      where: { orderNumber },
    });
    if (!order) throw new NotFoundException('Order not found');

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      trackingLink: order.trackingLink,
      shippingName: order.shippingName,
      shippingCity: order.shippingCity,
      shippingState: order.shippingState,
    };
  }

  async verifyPayment(payload: any) {
    // Determine orderNumber from the webhook payload
    const orderNumber =
      payload.orderNumber ??
      payload.order_id ??
      payload.txnid ??
      payload.orderId;

    if (!orderNumber)
      throw new BadRequestException('Could not resolve order from payload');

    const order = await this.prisma.orders.findUnique({
      where: { orderNumber: String(orderNumber) },
    });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.orders.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        status: 'PROCESSING',
      },
    });
  }

  async verifyPaymentStatus(body: { orderNumber?: string; orderId?: number }) {
    const where: any = {};
    if (body.orderNumber) where.orderNumber = body.orderNumber;
    else if (body.orderId) where.id = body.orderId;
    else throw new BadRequestException('orderNumber or orderId is required');

    const order = await this.prisma.orders.findFirst({ where });
    if (!order) throw new NotFoundException('Order not found');

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
    };
  }

  async getInvoice(orderId: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ── Order Adjustments ──

  async createAdjustment(dto: {
    orderId: number;
    adjustmentType: string;
    impact: string;
    amount: number;
    reason?: string;
    isManual?: boolean;
    manualType?: string;
  }) {
    const order = await this.prisma.orders.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.order_adjustments.create({
      data: {
        orderId: dto.orderId,
        adjustmentType: dto.adjustmentType as any,
        impact: dto.impact as any,
        amount: dto.amount,
        reason: dto.reason ?? null,
        isManual: dto.isManual ?? false,
        manualType: dto.manualType ?? null,
      },
    });
  }

  async getAdjustments(orderId: number) {
    return this.prisma.order_adjustments.findMany({
      where: { orderId },
      orderBy: { id: 'desc' },
    });
  }
}
