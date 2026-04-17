import { Controller, Get, Post, Put, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BlogService } from './blog.service';
import { CreateBlogDto, UpdateBlogDto } from './dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(private blogService: BlogService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all blogs or a single blog by slug' })
  @ApiQuery({ name: 'slug', required: false })
  async findAll(@Query('slug') slug?: string) {
    const data = await this.blogService.findAll(slug);
    return { success: true, message: 'Blog(s) fetched successfully', data };
  }

  @Roles('ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a new blog post (Admin)' })
  async create(@Body() dto: CreateBlogDto) {
    const data = await this.blogService.create(dto);
    return { success: true, message: 'Blog created successfully', data };
  }

  @Roles('ADMIN')
  @Put()
  @ApiOperation({ summary: 'Update a blog post (Admin)' })
  async update(@Body() dto: UpdateBlogDto) {
    const data = await this.blogService.update(dto);
    return { success: true, message: 'Blog updated successfully', data };
  }

  @Roles('ADMIN')
  @Delete()
  @ApiOperation({ summary: 'Soft delete a blog post (Admin)' })
  async delete(@Body() body: { id: number }) {
    const data = await this.blogService.delete(body.id);
    return { success: true, message: 'Blog deleted successfully', data };
  }
}
