import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IncreffService } from './increff.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Increff')
@Controller('increff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class IncreffController {
  constructor(private readonly increff: IncreffService) {}

  @Post('inventory/sync')
  @ApiOperation({ summary: 'Pull inventory from Increff and upsert stock' })
  syncInventory() {
    return this.increff.fetchInventory();
  }

  @Post('orders/:id/pack')
  @ApiOperation({ summary: 'Push an order to Increff for packing' })
  packOrder(@Param('id', ParseIntPipe) id: number) {
    return this.increff.packOrder(id);
  }

  @Get('orders/:id/invoice')
  @ApiOperation({ summary: 'Fetch invoice URL for an order from Increff' })
  getInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.increff.getInvoice(id);
  }
}
