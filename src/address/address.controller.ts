import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto, UpdateAddressDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Address')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('address')
export class AddressController {
  constructor(private addressService: AddressService) {}

  @Get()
  @ApiOperation({ summary: 'Fetch all addresses for the authenticated user' })
  async findAll(@CurrentUser('id') userId: number) {
    const data = await this.addressService.findAll(userId);
    return { success: true, message: 'Addresses fetched successfully', data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  async create(@Body() dto: CreateAddressDto) {
    const data = await this.addressService.create(dto);
    return { success: true, message: 'Address created successfully', data };
  }

  @Put()
  @ApiOperation({ summary: 'Update an existing address' })
  async update(@Body() dto: UpdateAddressDto) {
    const data = await this.addressService.update(dto);
    return { success: true, message: 'Address updated successfully', data };
  }

  @Delete()
  @ApiOperation({ summary: 'Delete an address' })
  async delete(@Body() body: { id: string }) {
    const data = await this.addressService.delete(body.id);
    return { success: true, message: 'Address deleted successfully', data };
  }
}
