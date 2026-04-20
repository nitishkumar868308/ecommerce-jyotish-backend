import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto, MarkReadDto, ReplyContactDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a contact message (sends user confirmation + admin notification)' })
  async create(@Body() dto: CreateContactDto) {
    const data = await this.contactService.create(dto);
    return { success: true, message: 'Message sent successfully', data };
  }

  @Get()
  @ApiOperation({ summary: 'Get all contact messages with replies (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAll() {
    const data = await this.contactService.findAll();
    return { success: true, data };
  }

  @Post('read')
  @ApiOperation({ summary: 'Mark a contact message as read (Admin) — legacy body-id endpoint' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async markReadBody(@Body() dto: MarkReadDto) {
    const data = await this.contactService.markRead(dto.id);
    return { success: true, message: 'Marked as read', data };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a contact message as read (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async markRead(@Param('id', ParseIntPipe) id: number) {
    const data = await this.contactService.markRead(id);
    return { success: true, message: 'Marked as read', data };
  }

  @Post('reply')
  @ApiOperation({ summary: 'Reply to a contact message (legacy body-id endpoint)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async replyBody(@Body() dto: ReplyContactDto) {
    if (!dto.contactMessageId) {
      return { success: false, message: 'contactMessageId is required' };
    }
    const data = await this.contactService.reply(dto.contactMessageId, dto);
    return { success: true, message: 'Reply sent', data };
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to a contact message (Admin) — emails the user' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplyContactDto,
  ) {
    const data = await this.contactService.reply(id, dto);
    return { success: true, message: 'Reply sent', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a contact message (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(@Param('id', ParseIntPipe) id: number) {
    const data = await this.contactService.delete(id);
    return { success: true, message: 'Message deleted', data };
  }
}
