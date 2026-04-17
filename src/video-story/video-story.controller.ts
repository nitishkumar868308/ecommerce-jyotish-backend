import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VideoStoryService } from './video-story.service';
import { CreateVideoStoryDto } from './dto';
import { Public, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';

@ApiTags('Video Story')
@Controller('video-story')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VideoStoryController {
  constructor(private readonly service: VideoStoryService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all video stories' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a video story (Admin)' })
  create(@Body() dto: CreateVideoStoryDto) {
    return this.service.create(dto);
  }
}
