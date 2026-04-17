import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { SyncInventoryDto, PackOrderDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Sync Increff inventory (upsert by location + SKU)' })
  syncInventory(@Body() dto: SyncInventoryDto) {
    return this.inventoryService.syncInventory(dto);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all Increff inventory records' })
  findAll() {
    return this.inventoryService.findAll();
  }

  @Post('pack-order')
  @ApiOperation({ summary: 'Pack an Increff order' })
  packOrder(@Body() dto: PackOrderDto) {
    return this.inventoryService.packOrder(dto);
  }

  @Get('invoice')
  @ApiOperation({ summary: 'Get all Increff orders (invoices)' })
  findAllOrders() {
    return this.inventoryService.findAllOrders();
  }
}
