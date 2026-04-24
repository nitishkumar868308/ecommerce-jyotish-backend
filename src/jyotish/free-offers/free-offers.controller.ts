import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FreeOffersService } from './free-offers.service';
import { CreateFreeOfferDto, UpdateFreeOfferDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Jyotish - Free Offers')
@Controller('jyotish/free-offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class FreeOffersController {
  constructor(private readonly service: FreeOffersService) {}

  @Get()
  @ApiOperation({ summary: 'List free consultation offers' })
  async list() {
    const data = await this.service.list();
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create free consultation offer (applies to all astrologers)' })
  async create(@Body() dto: CreateFreeOfferDto) {
    const data = await this.service.create(dto);
    return { success: true, message: 'Free offer created', data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update free consultation offer' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFreeOfferDto,
  ) {
    const data = await this.service.update(id, dto);
    return { success: true, message: 'Free offer updated', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete free consultation offer' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true, message: 'Free offer deleted' };
  }
}
