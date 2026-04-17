import { Controller, Get, Post, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BlogReviewsService } from './blog-reviews.service';
import { CreateBlogReviewDto, UpdateBlogReviewDto } from './dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Blog Reviews')
@Controller('blog-reviews')
export class BlogReviewsController {
  constructor(private blogReviewsService: BlogReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active blog reviews' })
  async findAll() {
    const data = await this.blogReviewsService.findAll();
    return { success: true, message: 'Blog reviews fetched successfully', data };
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a blog review' })
  async create(@Body() dto: CreateBlogReviewDto) {
    const data = await this.blogReviewsService.create(dto);
    return { success: true, message: 'Blog review submitted successfully', data };
  }

  @Roles('ADMIN')
  @Put()
  @ApiOperation({ summary: 'Approve or reject a blog review (Admin)' })
  async update(@Body() dto: UpdateBlogReviewDto) {
    const data = await this.blogReviewsService.update(dto);
    return { success: true, message: 'Blog review updated successfully', data };
  }
}
