import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HeadersService } from './headers.service';
import { CreateHeaderDto, UpdateHeaderDto } from './dto';
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
  async findAll() {
    const data = await this.service.findAll();
    return { success: true, data };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a header by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a header (Admin)' })
  async create(@Body() dto: CreateHeaderDto) {
    const data = await this.service.create(dto);
    return { success: true, message: 'Header created successfully', data };
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a header (Admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHeaderDto,
  ) {
    const data = await this.service.update(id, dto);
    return { success: true, message: 'Header updated successfully', data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete a header (Admin)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true, message: 'Header deleted successfully' };
  }
}
