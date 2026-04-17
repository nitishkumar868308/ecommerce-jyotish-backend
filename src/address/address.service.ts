import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number) {
    return this.prisma.address.findMany({
      where: { userId },
    });
  }

  async create(dto: CreateAddressDto) {
    // If setting as default, unset other defaults for this user
    if (dto.isDefault && dto.userId) {
      await this.prisma.address.updateMany({
        where: { userId: dto.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: dto,
    });
  }

  async update(dto: UpdateAddressDto) {
    const { id, ...data } = dto;

    const existing = await this.prisma.address.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Address with id ${id} not found`);
    }

    // Duplicate prevention: check if same address already exists for user
    const userId = data.userId ?? existing.userId;
    if (userId) {
      const duplicate = await this.prisma.address.findFirst({
        where: {
          userId,
          name: data.name ?? existing.name,
          mobile: data.mobile ?? existing.mobile,
          pincode: data.pincode ?? existing.pincode,
          address: data.address ?? existing.address,
          city: data.city ?? existing.city,
          state: data.state ?? existing.state,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException('This address already exists for the user');
      }
    }

    // If setting as default, unset other defaults for this user
    if (data.isDefault && userId) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.address.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Address with id ${id} not found`);
    }

    return this.prisma.address.delete({ where: { id } });
  }
}
