import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GeographicService } from './geographic.service';
import {
  CreateCountryDto,
  CreateStateCountryDto,
  CreateCityCountryDto,
} from './dto';
import { Public, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';

@ApiTags('Geographic')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GeographicController {
  constructor(private readonly service: GeographicService) {}

  // ── Country ──────────────────────────────────────────────

  @Public()
  @Get('country')
  @ApiOperation({ summary: 'Get all countries' })
  findAllCountries() {
    return this.service.findAllCountries();
  }

  @Post('country')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a country (Admin)' })
  createCountry(@Body() dto: CreateCountryDto) {
    return this.service.createCountry(dto);
  }

  // ── StateCountry ─────────────────────────────────────────

  @Public()
  @Get('country-state')
  @ApiOperation({ summary: 'Get states by country ID' })
  @ApiQuery({ name: 'countryId', required: true, type: Number })
  findStatesByCountry(@Query('countryId', ParseIntPipe) countryId: number) {
    return this.service.findStatesByCountry(countryId);
  }

  @Post('country-state')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a state-country entry (Admin)' })
  createStateCountry(@Body() dto: CreateStateCountryDto) {
    return this.service.createStateCountry(dto);
  }

  // ── CityCountry ──────────────────────────────────────────

  @Public()
  @Get('country-city')
  @ApiOperation({ summary: 'Get cities by state ID' })
  @ApiQuery({ name: 'stateId', required: true, type: Number })
  findCitiesByState(@Query('stateId', ParseIntPipe) stateId: number) {
    return this.service.findCitiesByState(stateId);
  }

  @Post('country-city')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a city-country entry (Admin)' })
  createCityCountry(@Body() dto: CreateCityCountryDto) {
    return this.service.createCityCountry(dto);
  }

  // ── State (for banners / categories) ─────────────────────

  @Public()
  @Get('state')
  @ApiOperation({ summary: 'Get all states (banner/category)' })
  findAllStates() {
    return this.service.findAllStates();
  }
}
