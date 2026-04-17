import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkuMappingDto } from './dto';

@Injectable()
export class SkuMappingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.bangaloreIncreffMappingSKU.findMany({
      orderBy: { id: 'desc' },
    });
  }

  create(dto: CreateSkuMappingDto) {
    return this.prisma.bangaloreIncreffMappingSKU.create({ data: dto });
  }
}
