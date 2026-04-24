import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { AddMoneyDto, TopupDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get authenticated user wallet balance' })
  async getWallet(@CurrentUser('id') userId: number) {
    const data = await this.walletService.getBalance(userId);
    return { success: true, message: 'Wallet fetched successfully', data };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get authenticated user wallet transactions' })
  async getTransactions(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.walletService.getTransactions(userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return { success: true, message: 'Transactions fetched successfully', data };
  }

  @Post('add')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add or debit money from user wallet (Admin)' })
  async addMoney(@Body() dto: AddMoneyDto) {
    const data = await this.walletService.addMoney(dto);
    return { success: true, message: 'Wallet updated successfully', data };
  }

  @Post('topup')
  @ApiOperation({ summary: 'Self-service top-up — credits the caller wallet' })
  async topup(@CurrentUser('id') userId: number, @Body() dto: TopupDto) {
    const data = await this.walletService.topup(userId, dto);
    return { success: true, message: 'Wallet topped up successfully', data };
  }
}
