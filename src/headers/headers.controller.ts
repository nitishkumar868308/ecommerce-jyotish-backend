import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HeadersService } from './headers.service';
import { CreateHeaderDto } from './dto';
import { Public, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';

@ApiTags('Headers')
@Controller('headers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HeadersController {
  constructor(private readonly service: HeadersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all headers' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a header (Admin)' })
  create(@Body() dto: CreateHeaderDto) {
    return this.service.create(dto);
  }
}
