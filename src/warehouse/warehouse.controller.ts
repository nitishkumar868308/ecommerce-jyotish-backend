import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateTransferDto,
  CreateDispatchDto,
  CreateSendToWarehouseDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles, Public } from '../common/decorators';

@ApiTags('Warehouse')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // ─── Warehouse ───

  @Get('warehouse')
  @ApiOperation({ summary: 'Get all warehouses' })
  findAll() {
    return this.warehouseService.findAll();
  }

  @Public()
  @Get('warehouse/public-cities')
  @ApiOperation({
    summary:
      'Public lookup — active warehouses grouped by city with their pincodes. Used by storefront landing selectors.',
  })
  findPublicCities() {
    return this.warehouseService.findPublicCities();
  }

  @Post('warehouse')
  @ApiOperation({ summary: 'Create a new warehouse' })
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehouseService.create(dto);
  }

  @Put('warehouse')
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiQuery({ name: 'id', type: Number })
  update(@Query('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehouseService.update(+id, dto);
  }

  @Delete('warehouse')
  @ApiOperation({ summary: 'Soft-delete a warehouse' })
  @ApiQuery({ name: 'id', type: Number })
  remove(@Query('id') id: string) {
    return this.warehouseService.softDelete(+id);
  }

  // ─── Transfer ───

  @Get('transfer-warehouse')
  @ApiOperation({ summary: 'Get all warehouse transfers' })
  findAllTransfers() {
    return this.warehouseService.findAllTransfers();
  }

  @Post('transfer-warehouse')
  @ApiOperation({ summary: 'Create a warehouse transfer' })
  createTransfer(@Body() dto: CreateTransferDto) {
    return this.warehouseService.createTransfer(dto);
  }

  // ─── Dispatch ───

  @Get('dispatch-warehouse')
  @ApiOperation({ summary: 'Get all warehouse dispatches' })
  findAllDispatches() {
    return this.warehouseService.findAllDispatches();
  }

  @Post('dispatch-warehouse')
  @ApiOperation({ summary: 'Create a warehouse dispatch' })
  createDispatch(@Body() dto: CreateDispatchDto) {
    return this.warehouseService.createDispatch(dto);
  }

  // ─── Delhi Store ───

  @Get('delhi-store')
  @ApiOperation({ summary: 'Get all Delhi warehouse stock' })
  findAllDelhiStock() {
    return this.warehouseService.findAllDelhiStock();
  }

  @Put('delhi-store/:id')
  @ApiOperation({ summary: 'Update stock on a Delhi warehouse row' })
  updateDelhiStock(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { stock?: number; status?: string; minStock?: number },
  ) {
    return this.warehouseService.updateDelhiStock(id, body);
  }

  // ─── Send to Warehouse (admin queue) ───

  @Get('send_to_warehouse')
  @ApiOperation({ summary: 'List stock transfers from the Send-to-warehouse queue' })
  findAllSendToWarehouse() {
    return this.warehouseService.findAllSendToWarehouse();
  }

  @Post('send_to_warehouse')
  @ApiOperation({ summary: 'Dispatch a row from the Send-to-warehouse queue' })
  createSendToWarehouse(@Body() dto: CreateSendToWarehouseDto) {
    return this.warehouseService.createSendToWarehouse(dto);
  }
}
