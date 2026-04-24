import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Public, Roles } from '../common/decorators';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product with variations, tags, and offers' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all active products with price conversion by country' })
  @ApiHeader({ name: 'x-country', required: false, description: 'Country code for price conversion' })
  findAllActive(@Headers('x-country') countryCode?: string) {
    return this.productsService.findAllActive(countryCode);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all products including inactive (Admin)' })
  findAll() {
    return this.productsService.findAll();
  }

  @Get('check-sku')
  @Public()
  @ApiOperation({
    summary:
      'Is this SKU available? Used by the admin form to warn before save.',
  })
  @ApiQuery({ name: 'sku', required: true, type: String })
  @ApiQuery({
    name: 'ignoreId',
    required: false,
    type: String,
    description: 'Existing product id to ignore (edit flow).',
  })
  async checkSku(
    @Query('sku') sku: string,
    @Query('ignoreId') ignoreId?: string,
  ) {
    return { available: await this.productsService.isSkuAvailable(sku, ignoreId) };
  }

  @Get('fast')
  @Public()
  @ApiOperation({ summary: 'Paginated fast product list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'subcategoryId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  @ApiQuery({ name: 'letter', required: false, type: String })
  @ApiQuery({ name: 'platform', required: false, type: String, description: 'wizard | quickgo | jyotish' })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'QuickGo: effective fulfillment city' })
  @ApiQuery({ name: 'pincode', required: false, type: String, description: 'QuickGo: shopper pincode — drives warehouse match' })
  findAllPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('letter') letter?: string,
    @Query('platform') platform?: string,
    @Query('city') city?: string,
    @Query('pincode') pincode?: string,
    @Headers('x-country') countryCode?: string,
  ) {
    return this.productsService.findAllPaginated(
      parseInt(page || '1', 10) || 1,
      parseInt(limit || '20', 10) || 20,
      {
        categoryId,
        subcategoryId,
        search,
        tags,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder,
        letter,
        platform,
        city,
        pincode,
        countryCode,
      },
    );
  }

  @Get('search')
  @Public()
  @ApiOperation({
    summary:
      'Token-AND autocomplete search across product name, SKU, description, tags, and every variation\'s name / SKU / attribute combo. QuickGo-aware when city+pincode are supplied.',
  })
  @ApiHeader({ name: 'x-country', required: false })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'platform', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'pincode', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  search(
    @Query('q') q?: string,
    @Query('platform') platform?: string,
    @Query('city') city?: string,
    @Query('pincode') pincode?: string,
    @Query('limit') limit?: string,
    @Headers('x-country') countryCode?: string,
  ) {
    return this.productsService.search({
      q: q ?? '',
      platform,
      city,
      pincode,
      limit: limit ? parseInt(limit, 10) : undefined,
      countryCode,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single product by ID' })
  @ApiHeader({ name: 'x-country', required: false, description: 'Country code for price conversion' })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'QuickGo: effective fulfillment city — filters variations to locally-stocked ones' })
  @ApiQuery({ name: 'pincode', required: false, type: String, description: 'QuickGo: shopper pincode' })
  findOne(
    @Param('id') id: string,
    @Query('city') city?: string,
    @Query('pincode') pincode?: string,
    @Headers('x-country') countryCode?: string,
  ) {
    const quickGo =
      city && pincode ? { city, pincode } : undefined;
    return this.productsService.findOne(id, countryCode, quickGo);
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  update(@Body() dto: UpdateProductDto) {
    return this.productsService.update(dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete a product' })
  softDelete(@Body() body: { id: string }) {
    return this.productsService.softDelete(body.id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle product active status' })
  toggleActive(@Body() body: { id: string; active: boolean }) {
    return this.productsService.toggleActive(body.id, body.active);
  }

  @Delete('variations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product variation' })
  deleteVariation(@Body() body: { variationId: string }) {
    return this.productsService.deleteVariation(body.variationId);
  }
}
