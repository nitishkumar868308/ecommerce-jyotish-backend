import { Controller, Get, Post, Put, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { CreateOfferDto, UpdateOfferDto } from './dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Offers')
@Controller('offers')
export class OffersController {
  constructor(private offersService: OffersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active offers' })
  async findAll() {
    const data = await this.offersService.findAll();
    return { success: true, message: 'Offers fetched successfully', data };
  }

  @Roles('ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a new offer (Admin)' })
  async create(@Body() dto: CreateOfferDto) {
    const data = await this.offersService.create(dto);
    return { success: true, message: 'Offer created successfully', data };
  }

  @Roles('ADMIN')
  @Put()
  @ApiOperation({ summary: 'Update an offer (Admin)' })
  async update(@Body() dto: UpdateOfferDto) {
    const data = await this.offersService.update(dto);
    return { success: true, message: 'Offer updated successfully', data };
  }

  @Roles('ADMIN')
  @Delete()
  @ApiOperation({ summary: 'Soft delete an offer (Admin)' })
  async delete(@Body() body: { id: number }) {
    const data = await this.offersService.delete(body.id);
    return { success: true, message: 'Offer deleted successfully', data };
  }
}
