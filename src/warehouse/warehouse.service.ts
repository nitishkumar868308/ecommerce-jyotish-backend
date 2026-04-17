import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto, UpdateWarehouseDto, CreateTransferDto, CreateDispatchDto } from './dto';

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Warehouse CRUD ───

  findAll() {
    return this.prisma.wareHouse.findMany({
      where: { deleted: false },
      orderBy: { id: 'desc' },
    });
  }

  create(dto: CreateWarehouseDto) {
    return this.prisma.wareHouse.create({ data: dto });
  }

  update(id: number, dto: UpdateWarehouseDto) {
    return this.prisma.wareHouse.update({ where: { id }, data: dto });
  }

  softDelete(id: number) {
    return this.prisma.wareHouse.update({
      where: { id },
      data: { deleted: true, active: false },
    });
  }

  // ─── Transfer ───

  findAllTransfers() {
    return this.prisma.warehouseTransfer.findMany({
      where: { deleted: false },
      orderBy: { id: 'desc' },
    });
  }

  createTransfer(dto: CreateTransferDto) {
    return this.prisma.warehouseTransfer.create({ data: dto });
  }

  // ─── Dispatch ───

  findAllDispatches() {
    return this.prisma.warehouseDispatch.findMany({
      where: { deleted: false },
      orderBy: { id: 'desc' },
    });
  }

  createDispatch(dto: CreateDispatchDto) {
    return this.prisma.warehouseDispatch.create({ data: dto });
  }

  // ─── Delhi Store ───

  findAllDelhiStock() {
    return this.prisma.delhiWarehouseStock.findMany({
      where: { deleted: false },
      orderBy: { id: 'desc' },
    });
  }
}
