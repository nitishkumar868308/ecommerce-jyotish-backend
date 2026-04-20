import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCountryDto,
  CreateStateCountryDto,
  CreateCityCountryDto,
  CreateStateDto,
  UpdateStateDto,
  UpdateCountryDto,
  UpdateStateCountryDto,
  UpdateCityCountryDto,
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

  async findOneCountry(id: number) {
    const country = await this.prisma.country.findFirst({
      where: { id, deleted: 0 },
    });
    if (!country) throw new NotFoundException('Country not found');
    return country;
  }

  async createCountry(dto: CreateCountryDto) {
    return this.prisma.country.create({ data: dto });
  }

  async updateCountry(id: number, dto: UpdateCountryDto) {
    await this.findOneCountry(id);
    return this.prisma.country.update({ where: { id }, data: dto });
  }

  async removeCountry(id: number) {
    await this.findOneCountry(id);
    return this.prisma.country.update({
      where: { id },
      data: { deleted: 1 },
    });
  }

  // ── StateCountry ─────────────────────────────────────────

  async findStatesByCountry(countryId: number) {
    return this.prisma.stateCountry.findMany({
      where: { country_id: countryId, deleted: 0 },
      orderBy: { name: 'asc' },
    });
  }

  async findOneStateCountry(id: number) {
    const state = await this.prisma.stateCountry.findFirst({
      where: { id, deleted: 0 },
    });
    if (!state) throw new NotFoundException('State not found');
    return state;
  }

  async createStateCountry(dto: CreateStateCountryDto) {
    return this.prisma.stateCountry.create({ data: dto });
  }

  async updateStateCountry(id: number, dto: UpdateStateCountryDto) {
    await this.findOneStateCountry(id);
    return this.prisma.stateCountry.update({ where: { id }, data: dto });
  }

  async removeStateCountry(id: number) {
    await this.findOneStateCountry(id);
    return this.prisma.stateCountry.update({
      where: { id },
      data: { deleted: 1 },
    });
  }

  // ── CityCountry ──────────────────────────────────────────

  async findCitiesByState(stateId: number) {
    return this.prisma.cityCountry.findMany({
      where: { state_id: stateId, deleted: 0 },
      orderBy: { name: 'asc' },
    });
  }

  async findOneCityCountry(id: number) {
    const city = await this.prisma.cityCountry.findFirst({
      where: { id, deleted: 0 },
    });
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  async createCityCountry(dto: CreateCityCountryDto) {
    return this.prisma.cityCountry.create({ data: dto });
  }

  async updateCityCountry(id: number, dto: UpdateCityCountryDto) {
    await this.findOneCityCountry(id);
    return this.prisma.cityCountry.update({ where: { id }, data: dto });
  }

  async removeCityCountry(id: number) {
    await this.findOneCityCountry(id);
    return this.prisma.cityCountry.update({
      where: { id },
      data: { deleted: 1 },
    });
  }

  // ── State (banner/category states) ───────────────────────

  async findAllStates() {
    return this.prisma.state.findMany({
      where: { deleted: 0 },
      orderBy: { name: 'asc' },
    });
  }

  async findOneState(id: number) {
    const state = await this.prisma.state.findFirst({
      where: { id, deleted: 0 },
    });
    if (!state) throw new NotFoundException('State not found');
    return state;
  }

  async createState(dto: CreateStateDto) {
    // Idempotent on (stateRefId, cityRefId) when refs are present; otherwise
    // fall back to the (name, city) pair. A state without a city and a
    // state+city pair are treated as distinct entries.
    const existing = await this.prisma.state.findFirst({
      where:
        dto.stateRefId !== undefined
          ? {
              stateRefId: dto.stateRefId,
              cityRefId: dto.cityRefId ?? null,
              deleted: 0,
            }
          : {
              name: dto.name,
              city: dto.city ?? null,
              deleted: 0,
            },
    });
    if (existing) return existing;
    return this.prisma.state.create({ data: dto });
  }

  async updateState(id: number, dto: UpdateStateDto) {
    await this.findOneState(id);
    return this.prisma.state.update({ where: { id }, data: dto });
  }

  async removeState(id: number) {
    await this.findOneState(id);
    return this.prisma.state.update({
      where: { id },
      data: { deleted: 1 },
    });
  }
}
