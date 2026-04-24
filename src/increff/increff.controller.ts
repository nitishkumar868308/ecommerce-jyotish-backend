import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IncreffService } from './increff.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SyncInventoryDto } from './dto/sync-inventory.dto';
import { IncreffInventoryPushDto } from './dto/increff-inventory-push.dto';

// Increff's webhook auth is "username"/"password" request headers, not the
// site's JWT. Kept in env so rotation doesn't need a code change; if either
// env var is unset, we fall back to the legacy hard-coded pair the Next.js
// route used so the existing integration keeps working out of the box.
const WEBHOOK_USER = process.env.INCREFF_WEBHOOK_USER || 'hecate_wizard_mall';
const WEBHOOK_PASS =
  process.env.INCREFF_WEBHOOK_PASS || 'Pratiekajain9@';

@ApiTags('Increff')
@Controller('increff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class IncreffController {
  constructor(private readonly increff: IncreffService) {}

  @Post('inventory/sync')
  @ApiOperation({ summary: 'Pull inventory from Increff and upsert stock' })
  syncInventory(@Body() dto: SyncInventoryDto = {} as SyncInventoryDto) {
    return this.increff.fetchInventory(dto?.warehouseCodes);
  }

  // Increff push webhook. They authenticate via `username` / `password`
  // headers (not our admin JWT), so this route is `@Public()` and verifies
  // credentials inline.
  @Public()
  @Put('inventory/sync')
  @ApiOperation({
    summary: 'Increff inventory push webhook (username/password headers)',
  })
  pushInventory(
    @Headers('username') user: string,
    @Headers('password') pass: string,
    @Body() dto: IncreffInventoryPushDto,
  ) {
    if (user !== WEBHOOK_USER || pass !== WEBHOOK_PASS) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.increff.applyInventoryPush(dto);
  }

  // Read-back of what Increff has pushed for a given location. Uses the
  // same header auth so Increff can reconcile.
  @Public()
  @Get('inventory/sync')
  @ApiOperation({
    summary: 'Read inventory pushed by Increff for a locationCode',
  })
  readInventory(
    @Headers('username') user: string,
    @Headers('password') pass: string,
    @Query('locationCode') locationCode?: string,
  ) {
    if (user !== WEBHOOK_USER || pass !== WEBHOOK_PASS) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.increff.readInventoryByLocation(locationCode);
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
