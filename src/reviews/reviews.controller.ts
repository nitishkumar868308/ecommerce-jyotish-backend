import { Controller, Get, Post, Put, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active reviews' })
  async findAll() {
    const data = await this.reviewsService.findAll();
    return { success: true, message: 'Reviews fetched successfully', data };
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a new review' })
  async create(@Body() dto: CreateReviewDto) {
    const data = await this.reviewsService.create(dto);
    return { success: true, message: 'Review submitted successfully', data };
  }

  @Roles('ADMIN')
  @Put()
  @ApiOperation({ summary: 'Approve or reject a review (Admin)' })
  async update(@Body() dto: UpdateReviewDto) {
    const data = await this.reviewsService.update(dto);
    return { success: true, message: 'Review updated successfully', data };
  }

  @Roles('ADMIN')
  @Delete()
  @ApiOperation({ summary: 'Soft delete a review (Admin)' })
  async delete(@Body() body: { id: number }) {
    const data = await this.reviewsService.delete(body.id);
    return { success: true, message: 'Review deleted successfully', data };
  }
}
