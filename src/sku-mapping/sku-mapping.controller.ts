import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
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

  @Get('inventory')
  @ApiOperation({
    summary:
      'List Bangalore inventory rows joined with their mapping status (if any)',
  })
  findInventoryWithMappings() {
    return this.skuMappingService.findInventoryWithMappings();
  }

  @Get('internal-skus')
  @ApiOperation({
    summary: 'List every internal product + variation SKU for mapping pickers',
  })
  listInternalSkus() {
    return this.skuMappingService.listInternalSkus();
  }

  @Post()
  @ApiOperation({ summary: 'Create (or replace) a SKU mapping' })
  create(@Body() dto: CreateSkuMappingDto) {
    return this.skuMappingService.create(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a SKU mapping' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.skuMappingService.remove(id);
  }
}
