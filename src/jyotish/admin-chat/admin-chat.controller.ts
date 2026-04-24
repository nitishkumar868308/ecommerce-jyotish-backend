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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminChatService } from './admin-chat.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';

/**
 * Routes under `/jyotish/admin-chat`. Split into astrologer-facing +
 * admin-facing endpoints so the guards can enforce the right role on
 * each. Astrologer side is Public — the JWT guard here doesn't
 * distinguish astrologer tokens from shopper ones, so we treat the
 * astrologer id passed in the body as the source of truth (the
 * frontend hook pulls it from `useAuthStore` which was populated at
 * login).
 */
@ApiTags('Jyotish - Admin Chat')
@Controller('jyotish/admin-chat')
export class AdminChatController {
  constructor(private readonly chat: AdminChatService) {}

  /* ───── Astrologer side ───── */

  @Post('astrologer/send')
  @ApiOperation({ summary: 'Astrologer posts a message to admin' })
  async astrologerSend(
    @Body() body: { astrologerId: number; text: string },
  ) {
    const data = await this.chat.postMessage({
      astrologerId: Number(body.astrologerId),
      senderType: 'ASTROLOGER',
      senderId: Number(body.astrologerId),
      text: body.text,
    });
    return { success: true, data };
  }

  @Get('astrologer/:astrologerId/messages')
  @ApiOperation({ summary: 'Thread messages for an astrologer' })
  async astrologerMessages(
    @Param('astrologerId', ParseIntPipe) astrologerId: number,
  ) {
    const data = await this.chat.listMessages(astrologerId);
    return { success: true, data };
  }

  @Post('astrologer/:astrologerId/mark-read')
  @ApiOperation({ summary: 'Astrologer marks the thread read' })
  async astrologerMarkRead(
    @Param('astrologerId', ParseIntPipe) astrologerId: number,
  ) {
    const data = await this.chat.markThreadRead(astrologerId, 'ASTROLOGER');
    return { success: true, data };
  }

  @Get('astrologer/:astrologerId/unread')
  @ApiOperation({ summary: 'Unread count for astrologer dashboard badge' })
  async astrologerUnread(
    @Param('astrologerId', ParseIntPipe) astrologerId: number,
  ) {
    const count = await this.chat.unreadForAstrologer(astrologerId);
    return { success: true, data: { count } };
  }

  /* ───── Admin side ───── */

  @Get('admin/inbox')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Admin inbox: every astrologer thread with latest message',
  })
  async adminInbox() {
    const data = await this.chat.adminInbox();
    return { success: true, data };
  }

  @Get('admin/:astrologerId/messages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin opens a specific astrologer thread' })
  async adminMessages(
    @Param('astrologerId', ParseIntPipe) astrologerId: number,
  ) {
    const data = await this.chat.listMessages(astrologerId);
    return { success: true, data };
  }

  @Post('admin/:astrologerId/send')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin replies in an astrologer thread' })
  async adminSend(
    @Param('astrologerId', ParseIntPipe) astrologerId: number,
    @Body() body: { text: string; adminId?: number },
  ) {
    const data = await this.chat.postMessage({
      astrologerId,
      senderType: 'ADMIN',
      senderId: Number(body.adminId ?? 0),
      text: body.text,
    });
    return { success: true, data };
  }

  @Post('admin/:astrologerId/mark-read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin marks a thread read' })
  async adminMarkRead(
    @Param('astrologerId', ParseIntPipe) astrologerId: number,
  ) {
    const data = await this.chat.markThreadRead(astrologerId, 'ADMIN');
    return { success: true, data };
  }
}
