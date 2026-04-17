import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { CreateCartDto, UpdateCartDto } from './dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Fetch all cart items not purchased' })
  async findAll() {
    const data = await this.cartService.findAll();
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
  @ApiOperation({ summary: 'Update a cart item' })
  async update(@Body() dto: UpdateCartDto) {
    const data = await this.cartService.update(dto);
    return { success: true, message: 'Cart item updated', data };
  }

  @Public()
  @Delete()
  @ApiOperation({ summary: 'Delete cart item(s)' })
  async delete(
    @Body() body: { id?: string | string[]; clearAll?: boolean; userId?: number },
  ) {
    const data = await this.cartService.delete(body);
    return { success: true, message: 'Cart item(s) deleted', data };
  }
}
