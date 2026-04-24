import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { CreateCartDto, UpdateCartDto } from './dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Fetch cart items for a user with prices converted to their country and offer/bulk applied server-side.',
  })
  @ApiHeader({
    name: 'x-country',
    required: false,
    description: 'Country code for price conversion (e.g. "IND", "USA").',
  })
  async findAll(
    @Headers('x-country') countryCode?: string,
    @Query('userId') userId?: string,
    @Query('platform') platform?: string,
  ) {
    const data = await this.cartService.findAll({
      userId: userId ? Number(userId) : undefined,
      countryCode,
      platform,
    });
    return { success: true, message: 'Cart items fetched successfully', data };
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  async create(@Body() dto: CreateCartDto) {
    const data = await this.cartService.create(dto);
    return { success: true, message: 'Item added to cart', data };
  }

  @Public()
  @Put()
  @ApiOperation({ summary: 'Update a cart item quantity / mark as purchased' })
  async update(@Body() dto: UpdateCartDto) {
    const data = await this.cartService.update(dto);
    return { success: true, message: 'Cart item updated', data };
  }

  @Public()
  @Delete()
  @ApiOperation({
    summary:
      'Delete cart item(s). Supply { id } for one, { id: [] } for many, { productId, userId } to remove all variations of a product, or { clearAll, userId } to empty the cart.',
  })
  async delete(
    @Body()
    body: {
      id?: string | string[];
      clearAll?: boolean;
      userId?: number;
      productId?: string;
    },
  ) {
    const data = await this.cartService.delete(body);
    return { success: true, message: 'Cart item(s) deleted', data };
  }
}
