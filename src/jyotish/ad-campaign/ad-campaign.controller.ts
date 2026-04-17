import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdCampaignService } from './ad-campaign.service';
import { BookAdDto, CreateAdConfigDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Jyotish - Ad Campaign')
@Controller()
export class AdCampaignController {
  constructor(private readonly adCampaignService: AdCampaignService) {}

  // --- Public endpoints ---

  @Public()
  @Post('jyotish/ad-campaign/book')
  @ApiOperation({ summary: 'Book ad slots for an astrologer' })
  async bookAd(@Body() dto: BookAdDto) {
    const data = await this.adCampaignService.bookAd(dto);
    return { success: true, message: 'Ad booked successfully', data };
  }

  @Public()
  @Get('jyotish/ad-campaign/availability')
  @ApiOperation({ summary: 'Get ad slot availability for a date range' })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-04-20' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-04-30' })
  async getAvailability(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const data = await this.adCampaignService.getAvailability(
      startDate,
      endDate,
    );
    return { success: true, data };
  }

  @Public()
  @Get('jyotish/ad-campaign/active-winners')
  @ApiOperation({ summary: 'Get astrologers with currently active ads' })
  async getActiveWinners() {
    const data = await this.adCampaignService.getActiveWinners();
    return { success: true, data };
  }

  @Public()
  @Get('jyotish/ad-campaign/my-bookings')
  @ApiOperation({ summary: 'Get bookings for an astrologer' })
  @ApiQuery({ name: 'astrologerId', required: true, example: 1 })
  async getMyBookings(@Query('astrologerId') astrologerId: number) {
    const data = await this.adCampaignService.getMyBookings(
      Number(astrologerId),
    );
    return { success: true, data };
  }

  // --- Admin endpoints ---

  @Get('admin/ad-campaign/config')
  @ApiOperation({ summary: 'Get ad campaign config (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getConfig() {
    const data = await this.adCampaignService.getConfig();
    return { success: true, data };
  }

  @Post('admin/ad-campaign/config')
  @ApiOperation({ summary: 'Create or update ad campaign config (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async upsertConfig(@Body() dto: CreateAdConfigDto) {
    const data = await this.adCampaignService.upsertConfig(dto);
    return { success: true, message: 'Config saved', data };
  }

  @Get('admin/ad-campaign/bookings')
  @ApiOperation({ summary: 'Get all ad bookings (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAllBookings() {
    const data = await this.adCampaignService.getAllBookings();
    return { success: true, data };
  }
}
