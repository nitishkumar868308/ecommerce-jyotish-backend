import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
  async create(
    @Body() dto: CreateAddressDto,
    @CurrentUser('id') userId: number,
  ) {
    const data = await this.addressService.create(dto, userId);
    return { success: true, message: 'Address created successfully', data };
  }

  // Modern REST route used by the storefront + dashboard.
  @Put(':id')
  @ApiOperation({ summary: 'Update an address by id (REST)' })
  async updateById(
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
    @CurrentUser('id') userId: number,
  ) {
    const data = await this.addressService.update(
      { ...dto, id },
      userId,
    );
    return { success: true, message: 'Address updated successfully', data };
  }

  // Legacy route kept for seeders / older tooling that sent id in the body.
  @Put()
  @ApiOperation({ summary: 'Update an address (id in body)' })
  async update(
    @Body() dto: UpdateAddressDto,
    @CurrentUser('id') userId: number,
  ) {
    if (!dto.id) {
      return {
        success: false,
        message: 'id is required in the body when using PUT /address',
      };
    }
    const data = await this.addressService.update(
      dto as UpdateAddressDto & { id: string },
      userId,
    );
    return { success: true, message: 'Address updated successfully', data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an address by id (REST)' })
  async deleteById(@Param('id') id: string) {
    const data = await this.addressService.delete(id);
    return { success: true, message: 'Address deleted successfully', data };
  }

  @Delete()
  @ApiOperation({ summary: 'Delete an address (id in body)' })
  async delete(@Body() body: { id: string }) {
    const data = await this.addressService.delete(body.id);
    return { success: true, message: 'Address deleted successfully', data };
  }
}
