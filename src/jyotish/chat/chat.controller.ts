import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import {
  RequestChatDto,
  AcceptChatDto,
  RejectChatDto,
  EndChatDto,
  ResumeChatDto,
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
}
