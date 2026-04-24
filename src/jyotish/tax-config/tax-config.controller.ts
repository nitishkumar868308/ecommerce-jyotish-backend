import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';
import { TaxConfigService } from './tax-config.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class UpdateTaxConfigDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  gstPercent: number;
}

@ApiTags('Jyotish - Tax Config')
@Controller('jyotish/config/tax')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class TaxConfigController {
  constructor(private readonly service: TaxConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get Jyotish GST config' })
  async getConfig() {
    const data = await this.service.getConfig();
    return { success: true, data };
  }

  @Put()
  @ApiOperation({ summary: 'Update Jyotish GST percent' })
  async updateConfig(@Body() dto: UpdateTaxConfigDto) {
    const data = await this.service.updateConfig(dto.gstPercent);
    return { success: true, message: 'GST updated', data };
  }
}
