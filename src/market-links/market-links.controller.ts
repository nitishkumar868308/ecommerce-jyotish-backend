import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MarketLinksService } from './market-links.service';
import { CreateMarketLinkDto, UpdateMarketLinkDto } from './dto';
import { Public, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';

@ApiTags('Market Links')
@Controller('market-links')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketLinksController {
  constructor(private readonly service: MarketLinksService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get all market links. Optionally scope to a product.',
  })
  @ApiQuery({ name: 'productId', required: false, type: String })
  findAll(@Query('productId') productId?: string) {
    return this.service.findAll(productId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single market link' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a market link (Admin)' })
  create(@Body() dto: CreateMarketLinkDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a market link (Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateMarketLinkDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a market link (Admin)' })
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}
