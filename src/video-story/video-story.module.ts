import { Module } from '@nestjs/common';
import { VideoStoryController } from './video-story.controller';
import { VideoStoryService } from './video-story.service';

@Module({
  controllers: [VideoStoryController],
  providers: [VideoStoryService],
  exports: [VideoStoryService],
})
export class VideoStoryModule {}
