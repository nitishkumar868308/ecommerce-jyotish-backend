import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Submit a contact message' })
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
  @ApiOperation({ summary: 'Mark a contact message as read (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async markRead(@Body() dto: MarkReadDto) {
    const data = await this.contactService.markRead(dto);
    return { success: true, message: 'Marked as read', data };
  }

  @Post('reply')
  @ApiOperation({ summary: 'Reply to a contact message (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reply(@Body() dto: ReplyContactDto) {
    const data = await this.contactService.reply(dto);
    return { success: true, message: 'Reply sent', data };
  }
}
