import { Module } from '@nestjs/common';
import { BlogReviewsController } from './blog-reviews.controller';
import { BlogReviewsService } from './blog-reviews.service';

@Module({
  controllers: [BlogReviewsController],
  providers: [BlogReviewsService],
  exports: [BlogReviewsService],
})
export class BlogReviewsModule {}
