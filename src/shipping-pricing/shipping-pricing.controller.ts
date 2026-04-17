import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ShippingPricingService } from './shipping-pricing.service';
import { CreateShippingPricingDto, UpdateShippingPricingDto } from './dto';
import { Public, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';

@ApiTags('Shipping Pricing')
@Controller('shipping-pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingPricingController {
  constructor(private readonly service: ShippingPricingService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all shipping pricing entries' })
  findAll() {
    return this.service.findAll();
  }

  @Public()
  @Get('countryWise')
  @ApiOperation({ summary: 'Get shipping pricing by country' })
  @ApiQuery({ name: 'country', required: true })
  findByCountry(@Query('country') country: string) {
    return this.service.findByCountry(country);
  }

  @Post()
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create shipping pricing (Admin)' })
  create(@Body() dto: CreateShippingPricingDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update shipping pricing (Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateShippingPricingDto) {
    return this.service.update(id, dto);
  }
}
