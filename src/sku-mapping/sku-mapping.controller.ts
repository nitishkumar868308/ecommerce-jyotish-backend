import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkuMappingService } from './sku-mapping.service';
import { CreateSkuMappingDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';

@ApiTags('Inventory')
@Controller('sku-mapping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class SkuMappingController {
  constructor(private readonly skuMappingService: SkuMappingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all SKU mappings' })
  findAll() {
    return this.skuMappingService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a SKU mapping' })
  create(@Body() dto: CreateSkuMappingDto) {
    return this.skuMappingService.create(dto);
  }
}
