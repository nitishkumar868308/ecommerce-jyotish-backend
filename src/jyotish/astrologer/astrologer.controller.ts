import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AstrologerService } from './astrologer.service';
import {
  RegisterAstrologerDto,
  UpdateAstrologerDto,
  LoginAstrologerDto,
  DeleteAstrologerDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Jyotish - Astrologer')
@Controller('jyotish')
export class AstrologerController {
  constructor(private readonly astrologerService: AstrologerService) {}

  @Public()
  @Get('astrologer')
  @ApiOperation({ summary: 'Get all astrologers or a single astrologer by id' })
  @ApiQuery({ name: 'public', required: false, example: 'true' })
  @ApiQuery({ name: 'id', required: false, example: 1 })
  async findAll(
    @Query('public') isPublic?: string,
    @Query('id') id?: number,
  ) {
    const data = await this.astrologerService.findAll({
      public: isPublic,
      id: id ? Number(id) : undefined,
    });
    return { success: true, data };
  }

  @Public()
  @Post('astrologer')
  @ApiOperation({ summary: 'Register a new astrologer' })
  async register(@Body() dto: RegisterAstrologerDto) {
    const data = await this.astrologerService.register(dto);
    return { success: true, message: 'Astrologer registered successfully', data };
  }

  @Put('astrologer')
  @ApiOperation({ summary: 'Update an astrologer (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(@Body() dto: UpdateAstrologerDto) {
    const data = await this.astrologerService.update(dto);
    return { success: true, message: 'Astrologer updated successfully', data };
  }

  @Delete('astrologer')
  @ApiOperation({ summary: 'Hard delete an astrologer (Admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(@Body() dto: DeleteAstrologerDto) {
    const data = await this.astrologerService.delete(dto.id);
    return { success: true, message: 'Astrologer deleted successfully', data };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Astrologer login' })
  async login(@Body() dto: LoginAstrologerDto) {
    const data = await this.astrologerService.login(dto);
    return { success: true, data };
  }

  @Public()
  @Post('astrologer/:id/online')
  @ApiOperation({ summary: 'Astrologer toggles their own online status' })
  async setOnline(
    @Param('id') id: string,
    @Body() body: { online: boolean },
  ) {
    const data = await this.astrologerService.setOnline(
      Number(id),
      !!body.online,
    );
    return { success: true, data };
  }

  @Public()
  @Get('check-display-name')
  @ApiOperation({ summary: 'Check display name availability' })
  @ApiQuery({ name: 'displayName', required: true })
  @ApiQuery({ name: 'ignoreId', required: false, type: Number })
  async checkDisplayName(
    @Query('displayName') displayName: string,
    @Query('ignoreId') ignoreId?: string,
  ) {
    const data = await this.astrologerService.checkDisplayName(
      displayName,
      ignoreId ? Number(ignoreId) : undefined,
    );
    return { success: true, data };
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Astrologer forgot password — emails a 6-digit OTP' })
  async forgotPassword(@Body() body: { email: string }) {
    const data = await this.astrologerService.forgotPassword(body.email);
    return { success: true, data };
  }

  @Public()
  @Post('verify-forgot-otp')
  @ApiOperation({ summary: 'Astrologer: verify reset OTP (non-consuming)' })
  async verifyAstroForgotOtp(
    @Body() body: { email: string; otp: string },
  ) {
    const data = await this.astrologerService.verifyForgotOtp(
      body.email,
      body.otp,
    );
    return { success: true, data };
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Astrologer: reset password with OTP' })
  async resetAstroPassword(
    @Body() body: { email: string; otp: string; password: string },
  ) {
    const data = await this.astrologerService.resetPassword(
      body.email,
      body.otp,
      body.password,
    );
    return { success: true, data };
  }
}
