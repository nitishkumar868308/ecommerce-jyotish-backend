import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegisterDto,
  LoginDto,
  GoogleLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.get('GOOGLE_CLIENT_ID'),
    );
  }

  private createToken(user: any) {
    return this.jwt.sign({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender,
      phone: user.phone,
    });
  }

  getCookieOptions() {
    const isProduction = this.config.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('User already exists with this email');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role || 'USER',
      },
    });

    const token = this.createToken(user);
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.createToken(user);
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async googleLogin(dto: GoogleLoginDto) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: dto.token,
      audience: this.config.get('GOOGLE_CLIENT_ID'),
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new BadRequestException('Invalid Google token');
    }

    let user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: payload.name || 'Google User',
          email: payload.email,
          profileImage: payload.picture || null,
          provider: 'GOOGLE',
        },
      });
    }

    const token = this.createToken(user);
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        carts: { where: { is_buy: false } },
        addresses: true,
        orders: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        gender: true,
        phone: true,
        createdAt: true,
        profileImage: true,
        country: true,
        walletBalance: true,
      },
    });
    return users;
  }

  async updateUser(dto: UpdateUserDto) {
    const data: any = { ...dto };
    delete data.id;

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }
    if (dto.gender) {
      data.gender = dto.gender as any;
    }

    const user = await this.prisma.user.update({
      where: { id: dto.id },
      data,
    });
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new NotFoundException('User not found');

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordReset.create({
      data: { email: dto.email, token, expires },
    });

    // TODO: send email with reset link
    return { message: 'Password reset link sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetRecord = await this.prisma.passwordReset.findFirst({
      where: {
        email: dto.email,
        token: dto.token,
        expires: { gte: new Date() },
      },
    });
    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { email: dto.email },
      data: { password: hashedPassword },
    });

    await this.prisma.passwordReset.deleteMany({
      where: { email: dto.email },
    });

    return { message: 'Password reset successfully' };
  }

  async validateToken(email: string, token: string) {
    const record = await this.prisma.passwordReset.findFirst({
      where: { email, token, expires: { gte: new Date() } },
    });
    return { valid: !!record };
  }
}
