import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCountryDto,
  CreateStateCountryDto,
  CreateCityCountryDto,
} from './dto';

@Injectable()
export class GeographicService {
  constructor(private prisma: PrismaService) {}

  // ── Country ──────────────────────────────────────────────

  async findAllCountries() {
    return this.prisma.country.findMany({
      where: { deleted: 0 },
      orderBy: { name: 'asc' },
    });
  }

  async createCountry(dto: CreateCountryDto) {
    return this.prisma.country.create({ data: dto });
  }

  // ── StateCountry ─────────────────────────────────────────

  async findStatesByCountry(countryId: number) {
    return this.prisma.stateCountry.findMany({
      where: { country_id: countryId, deleted: 0 },
      orderBy: { name: 'asc' },
    });
  }

  async createStateCountry(dto: CreateStateCountryDto) {
    return this.prisma.stateCountry.create({ data: dto });
  }

  // ── CityCountry ──────────────────────────────────────────

  async findCitiesByState(stateId: number) {
    return this.prisma.cityCountry.findMany({
      where: { state_id: stateId, deleted: 0 },
      orderBy: { name: 'asc' },
    });
  }

  async createCityCountry(dto: CreateCityCountryDto) {
    return this.prisma.cityCountry.create({ data: dto });
  }

  // ── State (banner/category states) ───────────────────────

  async findAllStates() {
    return this.prisma.state.findMany({
      where: { deleted: 0 },
      orderBy: { name: 'asc' },
    });
  }
}
