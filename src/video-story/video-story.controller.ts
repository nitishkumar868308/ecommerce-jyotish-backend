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
import { VideoStoryService } from './video-story.service';
import { CreateVideoStoryDto, UpdateVideoStoryDto } from './dto';
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
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a video story (Admin)' })
  create(@Body() dto: CreateVideoStoryDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a video story (Admin)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVideoStoryDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a video story (Admin)' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
