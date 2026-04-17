import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto, ApplyPromoDto } from './dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Promo Codes')
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private promoCodesService: PromoCodesService) {}

  @Roles('ADMIN')
  @Get()
  @ApiOperation({ summary: 'Get all promo codes (Admin)' })
  async findAll() {
    const data = await this.promoCodesService.findAll();
    return { success: true, message: 'Promo codes fetched successfully', data };
  }

  @Roles('ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a promo code (Admin)' })
  async create(@Body() dto: CreatePromoCodeDto) {
    const data = await this.promoCodesService.create(dto);
    return { success: true, message: 'Promo code created successfully', data };
  }

  @Public()
  @Post('apply')
  @ApiOperation({ summary: 'Apply a promo code to an order' })
  async apply(@Body() dto: ApplyPromoDto) {
    const data = await this.promoCodesService.apply(dto);
    return { success: true, message: 'Promo code applied successfully', data };
  }
}
