import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import type { NotificationRecipientType } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notif: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user' })
  list(
    @Req() req: any,
    @Query('as') as: NotificationRecipientType = 'USER',
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user;
    const resolvedAs: NotificationRecipientType =
      user?.role === 'ADMIN' && (!as || as === 'USER') ? 'ADMIN' : as;
    return this.notif.list(resolvedAs, user?.id ?? null, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? Math.min(100, Number(limit)) : undefined,
    });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@Param('id', ParseIntPipe) id: number) {
    return this.notif.markRead(id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(
    @Req() req: any,
    @Query('as') as: NotificationRecipientType = 'USER',
  ) {
    const user = req.user;
    const resolvedAs: NotificationRecipientType =
      user?.role === 'ADMIN' && (!as || as === 'USER') ? 'ADMIN' : as;
    return this.notif.markAllRead(resolvedAs, user?.id ?? null);
  }
}
