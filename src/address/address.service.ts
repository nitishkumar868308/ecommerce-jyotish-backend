import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto';

// Frontend sends address fields under modern names (`phone`, `addressLine1`,
// `addressType`, `addressLabel`), but the `Address` table still uses the
// legacy column names (`mobile`, `address`, `type`, `customType`). We
// normalise here so both shapes land in the right columns, and silently
// drop fields the table doesn't have (`email`, `countryCode`,
// `addressLine2`) — validation still permits them so callers don't get a
// 400 for sending harmless extras.
type AddressPayload = CreateAddressDto | UpdateAddressDto;

function toDbColumns(dto: AddressPayload): Record<string, unknown> {
  const mobile = dto.phone ?? dto.mobile;
  const address = (() => {
    if (dto.addressLine1) {
      return dto.addressLine2
        ? `${dto.addressLine1}, ${dto.addressLine2}`
        : dto.addressLine1;
    }
    return dto.address;
  })();
  const rawType = dto.addressType ?? dto.type;
  const type = rawType ? rawType.toString().toUpperCase() : undefined;
  const customType = dto.addressLabel ?? dto.customType;

  const out: Record<string, unknown> = {};
  if (dto.name !== undefined) out.name = dto.name;
  if (mobile !== undefined) out.mobile = mobile;
  if (dto.pincode !== undefined) out.pincode = dto.pincode;
  if (address !== undefined) out.address = address;
  if (dto.city !== undefined) out.city = dto.city;
  if (dto.state !== undefined) out.state = dto.state;
  if (dto.country !== undefined) out.country = dto.country;
  if (dto.landmark !== undefined) out.landmark = dto.landmark;
  if (type !== undefined) out.type = type;
  if (customType !== undefined) out.customType = customType;
  if (dto.userId !== undefined) out.userId = dto.userId;
  if (dto.isDefault !== undefined) out.isDefault = dto.isDefault;
  return out;
}

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateAddressDto, fallbackUserId?: number) {
    const data = toDbColumns(dto) as any;
    // Controller passes the JWT user as a fallback so the frontend doesn't
    // need to echo `userId` in the body.
    if (data.userId == null && fallbackUserId != null) {
      data.userId = fallbackUserId;
    }
    // Address row requires mobile / address / type — give them safe blanks
    // if the caller didn't send them so the DB NOT NULL constraint doesn't
    // blow up mid-request.
    if (data.mobile == null) data.mobile = '';
    if (data.address == null) data.address = '';
    if (data.type == null) data.type = 'HOME';

    if (data.isDefault && data.userId) {
      await this.prisma.address.updateMany({
        where: { userId: data.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({ data });
  }

  async update(dto: UpdateAddressDto & { id: string }, fallbackUserId?: number) {
    const { id } = dto;
    const existing = await this.prisma.address.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Address with id ${id} not found`);
    }

    const data = toDbColumns(dto);
    const userId = (data.userId as number | undefined) ?? existing.userId ?? fallbackUserId;

    // Duplicate prevention: same (name, mobile, pincode, address, city, state)
    // for this user, different id.
    if (userId) {
      const duplicate = await this.prisma.address.findFirst({
        where: {
          userId,
          name: (data.name as string) ?? existing.name,
          mobile: (data.mobile as string) ?? existing.mobile,
          pincode: (data.pincode as string) ?? existing.pincode,
          address: (data.address as string) ?? existing.address,
          city: (data.city as string) ?? existing.city,
          state: (data.state as string) ?? existing.state,
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException('This address already exists for the user');
      }
    }

    if (data.isDefault && userId) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({ where: { id }, data });
  }

  async delete(id: string) {
    const existing = await this.prisma.address.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Address with id ${id} not found`);
    }
    return this.prisma.address.delete({ where: { id } });
  }
}
