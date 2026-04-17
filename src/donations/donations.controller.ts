import { Controller, Get, Post, Put, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  UserDonateDto,
  ToggleCampaignDto,
} from './dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Donations')
@Controller('donations')
export class DonationsController {
  constructor(private donationsService: DonationsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all donation campaigns with donations' })
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
  @Put()
  @ApiOperation({ summary: 'Update a donation campaign (Admin)' })
  async update(@Body() dto: UpdateCampaignDto) {
    const data = await this.donationsService.update(dto);
    return { success: true, message: 'Campaign updated successfully', data };
  }

  @Roles('ADMIN')
  @Delete()
  @ApiOperation({ summary: 'Delete a donation campaign (Admin)' })
  async delete(@Body() body: { id: number }) {
    const data = await this.donationsService.delete(body.id);
    return { success: true, message: 'Campaign deleted successfully', data };
  }

  @Public()
  @Get('countryWise')
  @ApiOperation({ summary: 'Get donations grouped by campaign' })
  async countryWise() {
    const data = await this.donationsService.countryWise();
    return { success: true, message: 'Grouped donations fetched', data };
  }

  @Public()
  @Post('userDonate')
  @ApiOperation({ summary: 'Record a user donation' })
  async userDonate(@Body() dto: UserDonateDto) {
    const data = await this.donationsService.userDonate(dto);
    return { success: true, message: 'Donation recorded successfully', data };
  }

  @Roles('ADMIN')
  @Post('toggle')
  @ApiOperation({ summary: 'Toggle campaign active status (Admin)' })
  async toggle(@Body() dto: ToggleCampaignDto) {
    const data = await this.donationsService.toggle(dto);
    return { success: true, message: 'Campaign toggled successfully', data };
  }
}
