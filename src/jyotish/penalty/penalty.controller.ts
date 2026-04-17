import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PenaltyService } from './penalty.service';
import { CreatePenaltyDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Jyotish - Penalties')
@Controller('jyotish/penalties')
export class PenaltyController {
  constructor(private readonly penaltyService: PenaltyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all penalties (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAll() {
    const data = await this.penaltyService.findAll();
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a penalty (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() dto: CreatePenaltyDto) {
    const data = await this.penaltyService.create(dto);
    return { success: true, message: 'Penalty created', data };
  }
}
