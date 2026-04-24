import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { BangaloreInventoryService } from './bangalore-inventory.service';
import { IncreffService } from './increff.service';

// Admin-facing read endpoints for the Bangalore inventory the Increff
// webhook writes into `BangaloreIncreffInventory`. The storefront consumes
// the same data via SKU mapping; this controller is purely for the admin
// dashboard at `/admin/bangalore-inventory`.
@ApiTags('Bangalore Inventory')
@Controller('banglore_increff_inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class BangaloreInventoryController {
  constructor(
    private readonly service: BangaloreInventoryService,
    private readonly increff: IncreffService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List Bangalore inventory rows (paginated)' })
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search: search?.trim(),
    });
  }

  @Post('sync')
  @ApiOperation({ summary: 'Pull fresh Bangalore inventory from Increff' })
  sync() {
    return this.increff.fetchInventory(['bangalore']);
  }
}
