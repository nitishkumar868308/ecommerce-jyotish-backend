import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CountryTaxService } from './country-tax.service';
import { CreateCountryTaxDto, UpdateCountryTaxDto } from './dto';
import { Public, Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';

@ApiTags('Country Tax')
@Controller('country-tax')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CountryTaxController {
  constructor(private readonly service: CountryTaxService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get country tax entries (filter by country/category)' })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  findAll(
    @Query('country') country?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.findAll(
      country,
      categoryId ? parseInt(categoryId, 10) : undefined,
    );
  }

  @Get('all')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all country tax entries (Admin)' })
  findAllAdmin() {
    return this.service.findAllAdmin();
  }

  @Post()
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create country tax entry (Admin)' })
  create(@Body() dto: CreateCountryTaxDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update country tax entry (Admin)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCountryTaxDto,
  ) {
    return this.service.update(id, dto);
  }
}
