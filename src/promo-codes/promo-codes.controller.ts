import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PromoCodesService } from './promo-codes.service';
import {
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  ApplyPromoDto,
} from './dto';
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

  @Public()
  @Get('active')
  @ApiOperation({
    summary:
      'Active promo codes visible to the shopper. Pass userId so private (specific-user) codes are included when eligible and per-user usage state is computed.',
  })
  async findPublic(@Query('userId') userId?: string) {
    const uid = userId ? Number(userId) : undefined;
    const data = await this.promoCodesService.findPublic(
      Number.isFinite(uid) ? (uid as number) : undefined,
    );
    return { success: true, data };
  }

  @Roles('ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a promo code (Admin)' })
  async create(@Body() dto: CreatePromoCodeDto) {
    const data = await this.promoCodesService.create(dto);
    return { success: true, message: 'Promo code created successfully', data };
  }

  @Roles('ADMIN')
  @Put(':id')
  @ApiOperation({ summary: 'Update a promo code (Admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromoCodeDto,
  ) {
    const data = await this.promoCodesService.update(id, dto);
    return { success: true, message: 'Promo code updated successfully', data };
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a promo code (Admin)' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    const data = await this.promoCodesService.delete(id);
    return { success: true, message: 'Promo code deleted successfully', data };
  }

  @Public()
  @Post('apply')
  @ApiOperation({ summary: 'Apply a promo code to an order' })
  async apply(@Body() dto: ApplyPromoDto) {
    const data = await this.promoCodesService.apply(dto);
    return { success: true, message: 'Promo code applied successfully', data };
  }
}
