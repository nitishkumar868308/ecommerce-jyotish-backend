import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { AddMoneyDto } from './dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get user wallet balance and transactions' })
  async getWallet(@CurrentUser('id') userId: number) {
    const data = await this.walletService.getWallet(userId);
    return { success: true, message: 'Wallet fetched successfully', data };
  }

  @Post('add')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add or debit money from user wallet (Admin)' })
  async addMoney(@Body() dto: AddMoneyDto) {
    const data = await this.walletService.addMoney(dto);
    return { success: true, message: 'Wallet updated successfully', data };
  }
}
