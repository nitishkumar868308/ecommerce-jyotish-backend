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
import { AttributesService } from './attributes.service';
import { CreateAttributeDto, UpdateAttributeDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Attributes')
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all attributes' })
  async findAll() {
    const data = await this.attributesService.findAll();
    return { success: true, data };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get an attribute by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.attributesService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new attribute (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() dto: CreateAttributeDto) {
    const data = await this.attributesService.create(dto);
    return { success: true, message: 'Attribute created successfully', data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an attribute (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttributeDto,
  ) {
    const data = await this.attributesService.update(id, dto);
    return { success: true, message: 'Attribute updated successfully', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an attribute (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.attributesService.remove(id);
    return { success: true, message: 'Attribute deleted successfully' };
  }
}
