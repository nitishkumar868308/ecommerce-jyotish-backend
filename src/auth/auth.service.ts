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
import { MailService } from '../mail/mail.service';
import {
  RegisterDto,
  LoginDto,
  GoogleLoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto';
import { randomBytes } from 'crypto';
import { buildResetPasswordOtpEmailHtml } from './templates/reset-password-email';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.get('GOOGLE_CLIENT_ID'),
    );
  }

  private buildWelcomeEmail(name: string) {
    const safeName = (name || 'there').replace(/</g, '&lt;');
    return `
      <!doctype html>
      <html>
        <body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2937;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
            <tr><td align="center">
              <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(17,24,39,.06);">
                <tr><td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:36px 28px;color:#ffffff;">
                  <div style="font-size:13px;letter-spacing:2px;opacity:.85;text-transform:uppercase;">Welcome aboard</div>
                  <div style="font-size:26px;font-weight:700;margin-top:6px;">Hi ${safeName}, glad you're here!</div>
                </td></tr>
                <tr><td style="padding:28px;font-size:15px;line-height:1.6;">
                  <p style="margin:0 0 14px 0;">Your account is ready. You can now explore products, save favourites, track orders, and get personalised offers — all in one place.</p>
                  <p style="margin:0 0 20px 0;">If you ever need help, just reply to this email.</p>
                  <a href="#" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:12px;">Start shopping</a>
                </td></tr>
                <tr><td style="padding:20px 28px;border-top:1px solid #f3f4f6;font-size:12px;color:#6b7280;">
                  You're receiving this because you signed up with this email address.
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>`;
  }

  private sendWelcomeEmail(user: { email: string; name: string }) {
    // Fire-and-forget — MailService.send already swallows errors, but we also
    // avoid awaiting so signup latency stays flat when SMTP is slow.
    void this.mail.send({
      to: user.email,
      subject: 'Welcome! Your account is ready',
      html: this.buildWelcomeEmail(user.name),
    });
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
        lastLoginAt: new Date(),
      },
    });

    this.sendWelcomeEmail({ email: user.email, name: user.name });

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

    const stamped = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.createToken(stamped);
    const { password: _, ...userWithoutPassword } = stamped;
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

    let isNew = false;
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: payload.name || 'Google User',
          email: payload.email,
          profileImage: payload.picture || null,
          provider: 'GOOGLE',
          lastLoginAt: new Date(),
        },
      });
      isNew = true;
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    if (isNew) {
      this.sendWelcomeEmail({ email: user.email, name: user.name });
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
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        gender: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        profileImage: true,
        city: true,
        state: true,
        country: true,
        pincode: true,
        address: true,
        provider: true,
        walletBalance: true,
        lastLoginAt: true,
      },
    });
    return users;
  }

  async deleteUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.delete({ where: { id } });
  }

  async updateUser(dto: UpdateUserDto) {
    const data: any = { ...dto };
    delete data.id;
    // `countryCode` travels with the phone number on the address form but
    // User has no dedicated column for it (the number is stored as
    // "+<code><rest>"), so drop it before handing to Prisma.
    delete data.countryCode;

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

  /** TTL for reset OTPs — short enough to resist brute-force, long
   *  enough that the shopper has time to copy it from their inbox. */
  private readonly RESET_OTP_TTL_MINUTES = 15;

  /**
   * Kick off a password reset by generating a 6-digit OTP, persisting it
   * with a short TTL, and emailing it to the shopper. Throws 404 if the
   * email isn't registered so the UI can show a precise error — we're OK
   * with a mild email-enumeration tradeoff in exchange for better UX.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new NotFoundException('No account found for this email');

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(
      Date.now() + this.RESET_OTP_TTL_MINUTES * 60 * 1000,
    );

    // Clear any outstanding codes for the same email so a freshly-
    // requested OTP can't lose a tie-break against a stale one, and the
    // DB stays small.
    await this.prisma.passwordReset.deleteMany({
      where: { email: dto.email },
    });
    await this.prisma.passwordReset.create({
      data: { email: dto.email, token: otp, expires },
    });

    // Build a deep-link so the shopper can skip manually typing the
    // OTP — clicking lands them on the reset page with email + code
    // prefilled and the flow fast-forwards to "new password". Keep
    // the raw OTP in the email too as a fallback for mail clients
    // that strip links or shoppers who prefer copy-paste.
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );
    const magicLink = `${frontend}/reset-password?email=${encodeURIComponent(
      dto.email,
    )}&otp=${otp}`;

    // Fire-and-forget email — failure logs a warning but we still return
    // success so an SMTP blip doesn't block the user from retrying.
    void this.mail
      .send({
        to: dto.email,
        subject: 'Your Hecate password reset code',
        html: buildResetPasswordOtpEmailHtml({
          name: user.name,
          otp,
          expiresInMinutes: this.RESET_OTP_TTL_MINUTES,
          supportEmail: this.mail.adminEmail,
          variant: 'wizard',
          magicLink,
        }),
      })
      .catch(() => void 0);

    return { message: 'Password reset code sent', expiresInMinutes: this.RESET_OTP_TTL_MINUTES };
  }

  /**
   * Non-consuming verify step — confirms the OTP matches + hasn't
   * expired so the frontend can advance to the new-password screen. The
   * actual consume + password write happens in {@link resetPassword}.
   */
  async verifyForgotOtp(email: string, otp: string) {
    const record = await this.prisma.passwordReset.findFirst({
      where: { email, token: otp, expires: { gte: new Date() } },
    });
    if (!record) {
      throw new BadRequestException('Invalid or expired code');
    }
    return { valid: true };
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
      throw new BadRequestException('Invalid or expired reset code');
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
