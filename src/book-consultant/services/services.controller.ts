import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Book Consultant - Services')
@Controller('book_consultant/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  // Listing is public — the storefront/consult page needs it without auth.
  @Public()
  @Get()
  @ApiOperation({ summary: 'List consultant services' })
  async list() {
    const data = await this.service.list();
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create consultant service (Admin)' })
  async create(@Body() dto: CreateServiceDto) {
    const data = await this.service.create(dto);
    return { success: true, message: 'Service created', data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update consultant service (Admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
  ) {
    const data = await this.service.update(id, dto);
    return { success: true, message: 'Service updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete consultant service (Admin)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.softDelete(id);
    return { success: true, message: 'Service deleted' };
  }
}
