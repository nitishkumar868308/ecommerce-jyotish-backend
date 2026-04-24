import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SubcategoriesService } from './subcategories.service';
import { CreateSubcategoryDto, UpdateSubcategoryDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Subcategories')
@Controller('subcategories')
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all subcategories' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'platform', required: false, type: String, description: 'Filter subcategories opted into this surface (also enforces parent-category match).' })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'QuickGo: filter subcategories assigned to this city (parent category must also be assigned).' })
  async findAll(
    @Query('categoryId') categoryId?: string,
    @Query('platform') platform?: string,
    @Query('city') city?: string,
  ) {
    const data = categoryId
      ? await this.subcategoriesService.findByCategoryId(+categoryId, {
          platform,
          city,
        })
      : await this.subcategoriesService.findAll({ platform, city });
    return { success: true, data };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a subcategory by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.subcategoriesService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new subcategory (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() dto: CreateSubcategoryDto) {
    const data = await this.subcategoriesService.create(dto);
    return { success: true, message: 'Subcategory created successfully', data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a subcategory (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubcategoryDto,
  ) {
    const data = await this.subcategoriesService.update(id, dto);
    return { success: true, message: 'Subcategory updated successfully', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a subcategory (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.subcategoriesService.remove(id);
    return { success: true, message: 'Subcategory deleted successfully' };
  }
}
