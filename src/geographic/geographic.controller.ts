import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
  CreateStateDto,
  UpdateStateDto,
  UpdateCountryDto,
  UpdateStateCountryDto,
  UpdateCityCountryDto,
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

  @Public()
  @Get('country/:id')
  @ApiOperation({ summary: 'Get a country by ID' })
  findOneCountry(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneCountry(id);
  }

  @Post('country')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a country (Admin)' })
  createCountry(@Body() dto: CreateCountryDto) {
    return this.service.createCountry(dto);
  }

  @Put('country/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a country (Admin)' })
  updateCountry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCountryDto,
  ) {
    return this.service.updateCountry(id, dto);
  }

  @Delete('country/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete a country (Admin)' })
  removeCountry(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeCountry(id);
  }

  // ── StateCountry ─────────────────────────────────────────

  @Public()
  @Get('country-state')
  @ApiOperation({ summary: 'Get states by country ID' })
  @ApiQuery({ name: 'countryId', required: true, type: Number })
  findStatesByCountry(@Query('countryId', ParseIntPipe) countryId: number) {
    return this.service.findStatesByCountry(countryId);
  }

  @Public()
  @Get('country-state/:id')
  @ApiOperation({ summary: 'Get a state-country by ID' })
  findOneStateCountry(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneStateCountry(id);
  }

  @Post('country-state')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a state-country entry (Admin)' })
  createStateCountry(@Body() dto: CreateStateCountryDto) {
    return this.service.createStateCountry(dto);
  }

  @Put('country-state/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a state-country entry (Admin)' })
  updateStateCountry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStateCountryDto,
  ) {
    return this.service.updateStateCountry(id, dto);
  }

  @Delete('country-state/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete a state-country entry (Admin)' })
  removeStateCountry(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeStateCountry(id);
  }

  // ── CityCountry ──────────────────────────────────────────

  @Public()
  @Get('country-city')
  @ApiOperation({ summary: 'Get cities by state ID' })
  @ApiQuery({ name: 'stateId', required: true, type: Number })
  findCitiesByState(@Query('stateId', ParseIntPipe) stateId: number) {
    return this.service.findCitiesByState(stateId);
  }

  @Public()
  @Get('country-city/:id')
  @ApiOperation({ summary: 'Get a city-country by ID' })
  findOneCityCountry(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneCityCountry(id);
  }

  @Post('country-city')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a city-country entry (Admin)' })
  createCityCountry(@Body() dto: CreateCityCountryDto) {
    return this.service.createCityCountry(dto);
  }

  @Put('country-city/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a city-country entry (Admin)' })
  updateCityCountry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCityCountryDto,
  ) {
    return this.service.updateCityCountry(id, dto);
  }

  @Delete('country-city/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete a city-country entry (Admin)' })
  removeCityCountry(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeCityCountry(id);
  }

  // ── State (for banners / categories) ─────────────────────

  @Public()
  @Get('state')
  @ApiOperation({ summary: 'Get all states (banner/category)' })
  findAllStates() {
    return this.service.findAllStates();
  }

  @Post('state')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a state (Admin)' })
  createState(@Body() dto: CreateStateDto) {
    return this.service.createState(dto);
  }

  @Put('state/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a state (Admin)' })
  updateState(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStateDto,
  ) {
    return this.service.updateState(id, dto);
  }

  @Delete('state/:id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete a state (Admin)' })
  removeState(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeState(id);
  }
}
