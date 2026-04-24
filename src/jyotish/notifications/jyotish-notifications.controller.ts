import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JyotishNotificationsService } from './jyotish-notifications.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles, Public } from '../../common/decorators';

/**
 * Routes under `/jyotish/notifications`. Split into astrologer-facing
 * (public, we trust the astrologer id in the path — same pattern we
 * already use for admin-chat) and admin-facing (ADMIN role guarded).
 */
@ApiTags('Jyotish - Notifications')
@Controller('jyotish/notifications')
export class JyotishNotificationsController {
  constructor(private readonly notif: JyotishNotificationsService) {}

  /* ──── Astrologer side ──── */

  @Public()
  @Get('astrologer/:astrologerId/recent')
  @ApiOperation({ summary: 'Bell dropdown — most recent notifications' })
  async astrologerRecent(
    @Param('astrologerId', ParseIntPipe) astrologerId: number,
    @Query('limit') limit?: string,
  ) {
    const data = await this.notif.listRecent(
      { type: 'ASTROLOGER', astrologerId },
      limit ? Number(limit) : 10,
    );
    return { success: true, data };
  }

  @Public()
  @Get('astrologer/:astrologerId')
  @ApiOperation({ summary: 'Full list for the notifications page' })
  async astrologerAll(
    @Param('astrologerId', ParseIntPipe) astrologerId: number,
  ) {
    const data = await this.notif.listAll({
      type: 'ASTROLOGER',
      astrologerId,
    });
    return { success: true, data };
  }

  @Public()
  @Get('astrologer/:astrologerId/unread')
  @ApiOperation({ summary: 'Unread count for the bell badge' })
  async astrologerUnread(
    @Param('astrologerId', ParseIntPipe) astrologerId: number,
  ) {
    const count = await this.notif.unreadCount({
      type: 'ASTROLOGER',
      astrologerId,
    });
    return { success: true, data: { count } };
  }

  @Public()
  @Post('astrologer/:astrologerId/mark-read/:id')
  @ApiOperation({ summary: 'Mark one notification as read (astrologer)' })
  async astrologerMarkRead(
    @Param('astrologerId', ParseIntPipe) astrologerId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.notif.markRead(id, {
      type: 'ASTROLOGER',
      astrologerId,
    });
    return { success: true, data };
  }

  @Public()
  @Post('astrologer/:astrologerId/mark-all-read')
  @ApiOperation({ summary: 'Mark everything as read (astrologer)' })
  async astrologerMarkAllRead(
    @Param('astrologerId', ParseIntPipe) astrologerId: number,
  ) {
    const data = await this.notif.markAllRead({
      type: 'ASTROLOGER',
      astrologerId,
    });
    return { success: true, data };
  }

  /* ──── Admin side ──── */

  @Get('admin/recent')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bell dropdown — most recent (admin)' })
  async adminRecent(@Query('limit') limit?: string) {
    const data = await this.notif.listRecent(
      { type: 'ADMIN' },
      limit ? Number(limit) : 10,
    );
    return { success: true, data };
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Full list for the admin notifications page' })
  async adminAll() {
    const data = await this.notif.listAll({ type: 'ADMIN' });
    return { success: true, data };
  }

  @Get('admin/unread')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Unread count (admin bell)' })
  async adminUnread() {
    const count = await this.notif.unreadCount({ type: 'ADMIN' });
    return { success: true, data: { count } };
  }

  @Post('admin/mark-read/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminMarkRead(@Param('id', ParseIntPipe) id: number) {
    const data = await this.notif.markRead(id, { type: 'ADMIN' });
    return { success: true, data };
  }

  @Post('admin/mark-all-read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminMarkAllRead() {
    const data = await this.notif.markAllRead({ type: 'ADMIN' });
    return { success: true, data };
  }
}
