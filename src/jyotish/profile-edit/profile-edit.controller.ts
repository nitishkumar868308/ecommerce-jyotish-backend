import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProfileEditService } from './profile-edit.service';
import {
  CreateProfileEditRequestDto,
  FulfillProfileEditRequestDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Jyotish - Profile Edit Requests')
@Controller('jyotish/profile-edit-requests')
export class ProfileEditController {
  constructor(private readonly profileEditService: ProfileEditService) {}

  @Get()
  @ApiOperation({ summary: 'Get all profile edit requests (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAll() {
    const data = await this.profileEditService.findAll();
    return { success: true, data };
  }

  @Public()
  @Get('by-astrologer/:astrologerId')
  @ApiOperation({
    summary:
      'Requests scoped to one astrologer — the astrologer dashboard reads this so they can see their own submissions without admin auth.',
  })
  async findForAstrologer(
    @Param('astrologerId', ParseIntPipe) astrologerId: number,
  ) {
    const data = await this.profileEditService.findForAstrologer(astrologerId);
    return { success: true, data };
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a profile edit request' })
  async create(@Body() dto: CreateProfileEditRequestDto) {
    const data = await this.profileEditService.create(dto);
    return { success: true, message: 'Edit request submitted', data };
  }

  @Put(':id/fulfill')
  @ApiOperation({ summary: 'Approve or reject a profile edit request (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async fulfill(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FulfillProfileEditRequestDto,
  ) {
    const data = await this.profileEditService.fulfill(id, dto);
    return { success: true, message: 'Edit request updated', data };
  }
}
