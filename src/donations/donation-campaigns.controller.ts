import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * REST-style alias of donation campaign endpoints used by the admin panel
 * (the legacy /donations controller takes ids in the body).
 */
@ApiTags('Donation Campaigns')
@Controller('donation-campaigns')
export class DonationCampaignsController {
  constructor(private donationsService: DonationsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all donation campaigns' })
  async findAll() {
    const data = await this.donationsService.findAll();
    return { success: true, message: 'Campaigns fetched successfully', data };
  }

  @Roles('ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a donation campaign (Admin)' })
  async create(@Body() dto: CreateCampaignDto) {
    const data = await this.donationsService.create(dto);
    return { success: true, message: 'Campaign created successfully', data };
  }

  @Roles('ADMIN')
  @Put(':id')
  @ApiOperation({ summary: 'Update a donation campaign (Admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Omit<UpdateCampaignDto, 'id'>,
  ) {
    const data = await this.donationsService.update({ ...dto, id });
    return { success: true, message: 'Campaign updated successfully', data };
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a donation campaign (Admin)' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    const data = await this.donationsService.delete(id);
    return { success: true, message: 'Campaign deleted successfully', data };
  }
}
