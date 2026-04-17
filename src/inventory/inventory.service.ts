import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncInventoryDto, PackOrderDto } from './dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async syncInventory(dto: SyncInventoryDto) {
    return this.prisma.bangaloreIncreffInventory.upsert({
      where: {
        locationCode_channelSkuCode: {
          locationCode: dto.locationCode,
          channelSkuCode: dto.channelSkuCode,
        },
      },
      update: {
        quantity: dto.quantity,
        minExpiry: dto.minExpiry,
        channelSerialNo: dto.channelSerialNo,
        payload: dto.payload,
        clientSkuId: dto.clientSkuId,
      },
      create: dto,
    });
  }

  findAll() {
    return this.prisma.bangaloreIncreffInventory.findMany({
      orderBy: { id: 'desc' },
    });
  }

  async packOrder(dto: PackOrderDto) {
    return this.prisma.bangaloreIncreffPackOrder.upsert({
      where: {
        orderCode_shipmentId: {
          orderCode: dto.orderCode,
          shipmentId: dto.shipmentId,
        },
      },
      update: {
        locationCode: dto.locationCode,
        shipmentCode: dto.shipmentCode,
        payload: dto.payload,
      },
      create: dto,
    });
  }

  findAllOrders() {
    return this.prisma.bangaloreIncreffOrder.findMany({
      orderBy: { id: 'desc' },
    });
  }
}
