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

  /**
   * Public lookup used by the QuickGo landing page. Returns active warehouses
   * grouped by city along with the pincodes available at each — so the user
   * can pick a city first, then the nearest/their pincode.
   */
  async findPublicCities() {
    const warehouses = await this.prisma.wareHouse.findMany({
      where: { deleted: false, active: true },
      orderBy: { city: 'asc' },
      select: {
        id: true,
        city: true,
        state: true,
        pincode: true,
        cityRefId: true,
      },
    });

    const grouped = new Map<
      string,
      {
        city: string;
        state: string;
        cityRefId: number | null;
        pincodes: string[];
      }
    >();
    for (const w of warehouses) {
      const cityName = w.city?.trim();
      if (!cityName) continue;
      const key = `${cityName}__${w.state}`;
      const bucket = grouped.get(key) ?? {
        city: cityName,
        state: w.state,
        cityRefId: w.cityRefId ?? null,
        pincodes: [],
      };
      if (!bucket.pincodes.includes(w.pincode)) bucket.pincodes.push(w.pincode);
      grouped.set(key, bucket);
    }
    return Array.from(grouped.values());
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
