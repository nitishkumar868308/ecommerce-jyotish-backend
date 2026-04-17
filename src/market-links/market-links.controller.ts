import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarketLinksService } from './market-links.service';
import { CreateMarketLinkDto } from './dto';
import { Public, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';

@ApiTags('Market Links')
@Controller('market-links')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketLinksController {
  constructor(private readonly service: MarketLinksService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all market links' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a market link (Admin)' })
  create(@Body() dto: CreateMarketLinkDto) {
    return this.service.create(dto);
  }
}
