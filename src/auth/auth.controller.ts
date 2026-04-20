import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  ParseIntPipe,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  GoogleLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    res.cookie('session', result.token, this.authService.getCookieOptions());
    return { success: true, message: 'Registration successful', user: result.user, token: result.token };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    res.cookie('session', result.token, this.authService.getCookieOptions());
    return { success: true, message: 'Login successful', user: result.user, token: result.token };
  }

  @Public()
  @Post('google')
  @ApiOperation({ summary: 'Login with Google OAuth' })
  async googleLogin(@Body() dto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.googleLogin(dto);
    res.cookie('session', result.token, this.authService.getCookieOptions());
    return { success: true, message: 'Google login successful', user: result.user, token: result.token };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout (clear session cookie)' })
  @ApiBearerAuth()
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('session');
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser('id') userId: number) {
    const user = await this.authService.getMe(userId);
    return { success: true, message: 'Welcome', user };
  }

  @Get('getAllUser')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAllUsers() {
    const data = await this.authService.getAllUsers();
    return { success: true, message: 'Users fetched successfully', data };
  }

  @Put('updateUser')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async updateUser(@Body() dto: UpdateUserDto) {
    const user = await this.authService.updateUser(dto);
    return { success: true, message: 'User updated successfully', user };
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.authService.deleteUser(id);
    return { success: true, message: 'User deleted successfully' };
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Get('validate-token')
  @ApiOperation({ summary: 'Validate password reset token' })
  @ApiQuery({ name: 'email', required: true })
  @ApiQuery({ name: 'token', required: true })
  async validateToken(
    @Query('email') email: string,
    @Query('token') token: string,
  ) {
    return this.authService.validateToken(email, token);
  }
}
