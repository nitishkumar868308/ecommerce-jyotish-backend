import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import {
  RequestChatDto,
  StartChatSessionDto,
  AcceptChatDto,
  RejectChatDto,
  EndChatDto,
  ResumeChatDto,
  SendMessageDto,
} from './dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Jyotish - Chat')
@Controller('jyotish/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Public()
  @Post('request')
  @ApiOperation({ summary: 'User initiates a chat request' })
  async requestChat(@Body() dto: RequestChatDto) {
    const data = await this.chatService.requestChat(dto);
    return { success: true, message: 'Chat request created', data };
  }

  // Frontend-facing alias. The consultation launcher posts here with
  // `{ userId, astrologerId, type }`; we normalise `type` (chat|call)
  // and reuse the existing requestChat flow so there's one code path
  // creating PENDING sessions. Admin-facing tooling still points at
  // /request above.
  @Public()
  @Post('start-session')
  @ApiOperation({ summary: 'Start a chat or call session (user-initiated)' })
  async startSession(@Body() dto: StartChatSessionDto) {
    const data = await this.chatService.requestChat({
      userId: dto.userId,
      astrologerId: dto.astrologerId,
      serviceId: dto.serviceId,
    });
    return { success: true, message: 'Session started', data };
  }

  @Public()
  @Post('accept')
  @ApiOperation({ summary: 'Astrologer accepts a chat request' })
  async acceptChat(@Body() dto: AcceptChatDto) {
    const data = await this.chatService.acceptChat(dto);
    return { success: true, message: 'Chat accepted', data };
  }

  @Public()
  @Post('reject')
  @ApiOperation({ summary: 'Astrologer rejects a chat request' })
  async rejectChat(@Body() dto: RejectChatDto) {
    const data = await this.chatService.rejectChat(dto);
    return { success: true, message: 'Chat rejected', data };
  }

  @Public()
  @Post('end')
  @ApiOperation({ summary: 'End a chat session' })
  async endChat(@Body() dto: EndChatDto) {
    const data = await this.chatService.endChat(dto);
    return { success: true, message: 'Chat ended', data };
  }

  @Public()
  @Post('resume')
  @ApiOperation({ summary: 'Resume a paused chat session' })
  async resumeChat(@Body() dto: ResumeChatDto) {
    const data = await this.chatService.resumeChat(dto);
    return { success: true, message: 'Chat resumed', data };
  }

  @Public()
  @Get('sessions')
  @ApiOperation({
    summary:
      'List active + pending sessions for an astrologer (dashboard polling).',
  })
  @ApiQuery({ name: 'astrologerId', required: true, example: 1 })
  async listSessions(@Query('astrologerId') astrologerId: string) {
    const id = Number(astrologerId);
    if (!id) return { success: true, data: [] };
    const data = await this.chatService.listForAstrologer(id);
    return { success: true, data };
  }

  @Public()
  @Get('missed')
  @ApiOperation({
    summary:
      'List missed (timed-out) chat requests for an astrologer — powers the dashboard history tab.',
  })
  @ApiQuery({ name: 'astrologerId', required: true, example: 1 })
  async listMissed(@Query('astrologerId') astrologerId: string) {
    const id = Number(astrologerId);
    if (!id) return { success: true, data: [] };
    const data = await this.chatService.listMissedForAstrologer(id);
    return { success: true, data };
  }

  @Public()
  @Get('requests')
  @ApiOperation({
    summary:
      'Full request history for an astrologer across every status — powers the sidebar "Requests" page.',
  })
  @ApiQuery({ name: 'astrologerId', required: true, example: 1 })
  async listAllRequests(@Query('astrologerId') astrologerId: string) {
    const id = Number(astrologerId);
    if (!id) return { success: true, data: [] };
    const data = await this.chatService.listAllForAstrologer(id);
    return { success: true, data };
  }

  @Public()
  @Get('user-active')
  @ApiOperation({
    summary:
      'Shopper\'s current active/pending session so the jyotish layout can show a "Return to chat" banner when they navigate away.',
  })
  @ApiQuery({ name: 'userId', required: true, example: 1 })
  async userActive(@Query('userId') userId: string) {
    const id = Number(userId);
    if (!id) return { success: true, data: null };
    const data = await this.chatService.getUserActiveSession(id);
    return { success: true, data };
  }

  @Public()
  @Get('earnings')
  @ApiOperation({
    summary:
      "Astrologer's completed-session earnings ledger — drives the dashboard Transactions page.",
  })
  @ApiQuery({ name: 'astrologerId', required: true, example: 1 })
  async earnings(@Query('astrologerId') astrologerId: string) {
    const id = Number(astrologerId);
    if (!id) return { success: true, data: [] };
    const data = await this.chatService.listEarningsForAstrologer(id);
    return { success: true, data };
  }

  @Public()
  @Get('astrologer-offers')
  @ApiOperation({
    summary:
      'Admin-wide list of every astrologer-sourced free offer — powers the admin free-offers page with toggle + status info.',
  })
  async listAstrologerOffers() {
    const data = await this.chatService.listAstrologerFreeOffers();
    return { success: true, data };
  }

  @Public()
  @Patch('astrologer-offers/:id/active')
  @ApiOperation({
    summary:
      'Toggle an astrologer free-offer active/inactive. Inactive offers stop attaching to new chat sessions but existing live sessions keep their granted minutes.',
  })
  async setAstrologerOfferActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { active: boolean },
  ) {
    const data = await this.chatService.setAstrologerFreeOfferActive(
      id,
      !!body?.active,
    );
    return { success: true, data };
  }

  @Public()
  @Get('free-offer-summary')
  @ApiOperation({
    summary:
      "Astrologer's free-offer snapshot for the dashboard — currently active offer (if any) + how many free sessions have been given so far.",
  })
  @ApiQuery({ name: 'astrologerId', required: true, example: 1 })
  async freeOfferSummary(@Query('astrologerId') astrologerId: string) {
    const id = Number(astrologerId);
    if (!id) {
      return {
        success: true,
        data: { activeOffer: null, totalFreeSessions: 0 },
      };
    }
    const data = await this.chatService.freeOfferSummary(id);
    return { success: true, data };
  }

  @Public()
  @Get('admin/transactions')
  @ApiOperation({
    summary:
      'Admin-wide ledger of completed chat sessions across every astrologer.',
  })
  @ApiQuery({ name: 'astrologerId', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 200 })
  async adminTransactions(
    @Query('astrologerId') astrologerId?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.chatService.listAllTransactionsForAdmin({
      astrologerId: astrologerId ? Number(astrologerId) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return { success: true, data };
  }

  @Public()
  @Get('my-history')
  @ApiOperation({
    summary: "Shopper's past consultations — drives the user dashboard tab.",
  })
  @ApiQuery({ name: 'userId', required: true, example: 1 })
  async myHistory(@Query('userId') userId: string) {
    const id = Number(userId);
    if (!id) return { success: true, data: [] };
    const data = await this.chatService.listHistoryForUser(id);
    return { success: true, data };
  }

  @Public()
  @Post(':sessionId/review')
  @ApiOperation({
    summary:
      'Submit the post-session review. One per session; 1-5 rating + optional comment.',
  })
  async submitReview(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body()
    body: { userId: number; rating: number; comment?: string },
  ) {
    const data = await this.chatService.submitReview(sessionId, body);
    return { success: true, message: 'Review submitted', data };
  }

  @Public()
  @Get('session/:id')
  @ApiOperation({ summary: 'Get a chat session with messages' })
  async getSession(@Param('id', ParseIntPipe) id: number) {
    const data = await this.chatService.getSession(id);
    return { success: true, data };
  }

  @Public()
  @Get('messages/:sessionId')
  @ApiOperation({ summary: 'Get paginated messages for a session' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'before', required: false, example: 100 })
  async getMessages(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Query('limit') limit?: number,
    @Query('before') before?: number,
  ) {
    const data = await this.chatService.getMessages(sessionId, {
      limit: limit ? Number(limit) : undefined,
      before: before ? Number(before) : undefined,
    });
    return { success: true, data };
  }

  @Public()
  @Post(':sessionId/send')
  @ApiOperation({ summary: 'Post a message to a session' })
  async sendMessage(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: SendMessageDto,
  ) {
    const data = await this.chatService.sendMessage(sessionId, dto);
    return { success: true, message: 'Message sent', data };
  }

  @Public()
  @Post(':sessionId/typing')
  @ApiOperation({ summary: 'Typing heartbeat (ephemeral, in-memory)' })
  markTyping(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() body: { senderType: 'USER' | 'ASTROLOGER' },
  ) {
    this.chatService.markTyping(sessionId, body.senderType);
    return { success: true };
  }

  @Public()
  @Post(':sessionId/adding-money')
  @ApiOperation({
    summary:
      'Shopper heartbeat — the Add-money modal is open. Lets the astrologer see "user is topping up" so they don\'t end early.',
  })
  markAddingMoney(@Param('sessionId', ParseIntPipe) sessionId: number) {
    this.chatService.markAddingMoney(sessionId);
    return { success: true };
  }

  @Public()
  @Get(':sessionId/status')
  @ApiOperation({
    summary:
      'Lightweight live status — typing flags, wallet balance, billing totals — polled every second by the chat header.',
  })
  async status(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const data = await this.chatService.getLiveStatus(sessionId);
    return { success: true, data };
  }
}
