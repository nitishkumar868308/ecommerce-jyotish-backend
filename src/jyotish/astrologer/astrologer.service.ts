import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterAstrologerDto } from './dto/register-astrologer.dto';
import { UpdateAstrologerDto } from './dto/update-astrologer.dto';
import { LoginAstrologerDto } from './dto/login-astrologer.dto';
import {
  buildAstrologerRegistrationEmailHtml,
  buildAstrologerApprovedCredentialsEmailHtml,
} from './templates/astrologer-emails';
import { buildResetPasswordOtpEmailHtml } from '../../auth/templates/reset-password-email';
import { JyotishNotificationsService } from '../notifications/jyotish-notifications.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AstrologerService {
  private readonly logger = new Logger(AstrologerService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private jwt: JwtService,
    private notif: JyotishNotificationsService,
  ) {}

  /** Where the astrologer signs in after approval — reused in both emails. */
  private get jyotishLoginUrl(): string {
    const base = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );
    return `${base}/login-jyotish`;
  }

  /**
   * Generate a memorable, name-derived temporary password when we first
   * activate an astrologer. Pattern: first word of displayName/fullName
   * (lowercased, non-alphanumeric stripped) + 4 random digits. e.g.
   * "Ravi Sharma" → "ravi4829". Short enough to type, random enough to
   * resist guessing until they rotate it from the dashboard.
   */
  private generateInitialPassword(
    displayName?: string | null,
    fullName?: string | null,
  ): string {
    const seed = (displayName || fullName || 'astrologer')
      .toString()
      .toLowerCase()
      .split(/\s+/)[0]
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8) || 'astro';
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    return `${seed}${digits}`;
  }

  private readonly fullInclude = {
    profile: true,
    services: true,
    documents: true,
    certificates: true,
    penalties: true,
    extraDocuments: true,
    editRequests: true,
    adBookings: true,
    chatSessions: true,
  };

  async findAll(query: { public?: string; id?: number }) {
    const publicOnly = query.public === 'true';
    if (query.id) {
      const astrologer = await this.prisma.astrologerAccount.findUnique({
        where: { id: query.id },
        include: this.fullInclude,
      });
      if (!astrologer) throw new NotFoundException('Astrologer not found');
      // Public single-astrologer fetches (the consult-now profile page)
      // hit the same endpoint as admin's — so when the caller explicitly
      // flags `public=true` we enforce the visibility rules here too.
      // Otherwise a rejected / inactive astrologer could still leak via
      // `/jyotish/astrologer/<id>`.
      if (
        publicOnly &&
        (!astrologer.isApproved ||
          !astrologer.isActive ||
          astrologer.isRejected)
      ) {
        throw new NotFoundException('Astrologer not found');
      }
      return astrologer;
    }

    const where = publicOnly
      ? { isApproved: true, isActive: true, isRejected: false }
      : {};

    return this.prisma.astrologerAccount.findMany({
      where,
      include: this.fullInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async register(dto: RegisterAstrologerDto) {
    const existing = await this.prisma.astrologerAccount.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (existing) {
      throw new ConflictException('Email or phone already registered');
    }

    const created = await this.prisma.astrologerAccount.create({
      data: {
        fullName: dto.fullName,
        displayName: dto.displayName,
        email: dto.email,
        phone: dto.phone,
        phoneLocal: dto.phoneLocal,
        countryCode: dto.countryCode,
        gender: dto.gender as any,
        bio: dto.bio,
        profile: {
          create: {
            experience: dto.experience,
            bio: dto.bio,
            image: dto.profilePhoto,
            address: dto.address,
            city: dto.city,
            state: dto.state,
            country: dto.country,
            postalCode: dto.postalCode,
            languages: dto.languages || [],
            specializations: dto.specializations || [],
            idProofType: dto.idProofType,
            idProofValue: dto.idProofValue,
          },
        },
        services: dto.services?.length
          ? {
              create: dto.services.map((s) => ({
                serviceName: s.serviceName,
                price: s.price,
                currency: s.currency,
                currencySymbol: s.currencySymbol,
              })),
            }
          : undefined,
        documents: dto.documents?.length
          ? {
              create: dto.documents.map((d) => ({
                type: d.type as any,
                fileUrl: d.fileUrl,
              })),
            }
          : undefined,
      },
      include: this.fullInclude,
    });

    // Fire-and-forget registration acknowledgement. We never let an SMTP
    // failure break the signup flow — the admin still sees the account
    // in the review queue and can manually resend credentials later.
    this.mail
      .send({
        to: created.email,
        subject: 'We received your Hecate Jyotish application',
        html: buildAstrologerRegistrationEmailHtml({
          fullName: created.fullName,
          displayName: created.displayName,
          loginUrl: this.jyotishLoginUrl,
          supportEmail: this.mail.adminEmail,
        }),
      })
      .catch((err) =>
        this.logger.warn(
          `Registration ack email failed for ${created.email}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ),
      );

    return created;
  }

  async update(dto: UpdateAstrologerDto) {
    const { id, services, penalties, extraDocuments, ...data } = dto;

    const astrologer = await this.prisma.astrologerAccount.findUnique({
      where: { id },
    });
    if (!astrologer) throw new NotFoundException('Astrologer not found');

    // Enforce display-name uniqueness on edit so two astrologers can't
    // end up sharing a public handle. Case-insensitive match + self-skip
    // so re-saving the same name is always safe.
    if (
      data.displayName !== undefined &&
      data.displayName !== null &&
      data.displayName.trim() &&
      data.displayName !== astrologer.displayName
    ) {
      const clash = await this.prisma.astrologerAccount.findFirst({
        where: {
          id: { not: id },
          displayName: {
            equals: data.displayName.trim(),
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      if (clash) {
        throw new ConflictException(
          'Display name already in use. Pick a different one.',
        );
      }
    }

    // Build account-level update data
    const accountData: any = {};
    const directFields = [
      'displayName',
      'isApproved',
      'isActive',
      'isRejected',
      'rejectReason',
      'bio',
      'fullName',
      'email',
      'phone',
      'countryCode',
      'phoneLocal',
      'isTop',
      'topRank',
      'revenueAstrologer',
      'revenueAdmin',
      'gst',
    ];
    for (const field of directFields) {
      if (data[field] !== undefined) accountData[field] = data[field];
    }
    if (data.gender !== undefined) accountData.gender = data.gender as any;

    // First-time activation: when the admin flips both isApproved and
    // isActive to true and credentials haven't been sent yet, generate a
    // memorable temporary password, hash it, and queue the credentials
    // email once the update row is written. We keep the plaintext in a
    // local var so we don't leak the hash into the email.
    const willBeApproved =
      accountData.isApproved ?? astrologer.isApproved;
    const willBeActive = accountData.isActive ?? astrologer.isActive;
    let plainPasswordForEmail: string | null = null;
    if (
      willBeApproved &&
      willBeActive &&
      !astrologer.credentialsSent &&
      !astrologer.password
    ) {
      plainPasswordForEmail = this.generateInitialPassword(
        (accountData.displayName as string | undefined) ??
          astrologer.displayName,
        (accountData.fullName as string | undefined) ?? astrologer.fullName,
      );
      accountData.password = await bcrypt.hash(plainPasswordForEmail, 10);
      accountData.credentialsSent = true;
    }

    // Build profile upsert data
    const profileFields = [
      'experience',
      'image',
      'address',
      'city',
      'state',
      'country',
      'postalCode',
      'languages',
      'specializations',
    ];
    const profileData: any = {};
    for (const field of profileFields) {
      if (data[field] !== undefined) profileData[field] = data[field];
    }

    if (Object.keys(profileData).length > 0) {
      accountData.profile = {
        upsert: {
          create: profileData,
          update: profileData,
        },
      };
    }

    // Handle services: delete all and recreate
    if (services) {
      await this.prisma.astrologerService.deleteMany({
        where: { astrologerId: id },
      });
      accountData.services = {
        create: services.map((s) => ({
          serviceName: s.serviceName,
          price: s.price,
          currency: s.currency,
          currencySymbol: s.currencySymbol,
        })),
      };
    }

    // Handle penalties: create new ones
    if (penalties?.length) {
      accountData.penalties = {
        create: penalties.map((p) => ({
          amount: p.amount,
          reason: p.reason,
          settlement: p.settlement,
          paid: p.paid,
        })),
      };
    }

    // Handle extra documents: create new ones
    if (extraDocuments?.length) {
      accountData.extraDocuments = {
        create: extraDocuments.map((d) => ({
          title: d.title,
          fileUrl: d.fileUrl,
        })),
      };
    }

    const updated = await this.prisma.astrologerAccount.update({
      where: { id },
      data: accountData,
      include: this.fullInclude,
    });

    // Dispatch the credentials email only after the row has been written
    // so we never email a password the DB didn't persist. Fire-and-forget
    // (SMTP failure logs a warning but doesn't roll the update back).
    if (plainPasswordForEmail) {
      this.mail
        .send({
          to: updated.email,
          subject: 'Your Hecate Jyotish account is approved — credentials inside',
          html: buildAstrologerApprovedCredentialsEmailHtml({
            fullName: updated.fullName,
            displayName: updated.displayName,
            email: updated.email,
            password: plainPasswordForEmail,
            loginUrl: this.jyotishLoginUrl,
            supportEmail: this.mail.adminEmail,
          }),
        })
        .catch((err) =>
          this.logger.warn(
            `Approval credentials email failed for ${updated.email}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          ),
        );
    }

    /* ────── Notifications fan-out ──────
     * Emit in-app notifications for admin → astrologer actions so the
     * astrologer sees a bell alert without waiting for the email to
     * land. We compute deltas against the pre-update row so we only
     * fire a notification when the value actually flipped. */
    const recipient = { type: 'ASTROLOGER' as const, astrologerId: id };

    // Approval path (first-time approve+active = credentials emailed
    // above; also worth its own in-app bell).
    if (
      plainPasswordForEmail ||
      (accountData.isApproved === true && !astrologer.isApproved)
    ) {
      void this.notif.notify({
        recipient,
        kind: 'APPROVED',
        title: 'Your account has been approved',
        body: 'Your Hecate Jyotish account is live. Check your email for login credentials.',
        link: '/jyotish/astrologer-dashboard',
      });
    }

    // Active-toggle transitions.
    if (
      accountData.isActive !== undefined &&
      accountData.isActive !== astrologer.isActive
    ) {
      if (accountData.isActive) {
        void this.notif.notify({
          recipient,
          kind: 'ACTIVATED',
          title: 'Your account is active again',
          body: 'Students can now book sessions with you.',
          link: '/jyotish/astrologer-dashboard',
        });
      } else {
        void this.notif.notify({
          recipient,
          kind: 'DEACTIVATED',
          title: 'Your account has been set inactive',
          body: 'Bookings are paused until admin reactivates your account. Chat with admin if you have questions.',
          link: '/jyotish/astrologer-dashboard/admin-chat',
        });
      }
    }

    // Rejection path.
    if (accountData.isRejected === true && !astrologer.isRejected) {
      void this.notif.notify({
        recipient,
        kind: 'REJECTED',
        title: 'Your application was rejected',
        body:
          (accountData.rejectReason as string) ??
          'Admin has rejected your registration. Contact support for details.',
        link: '/jyotish/astrologer-dashboard',
      });
    }

    // Penalty additions — one notification per new penalty row.
    if (penalties?.length) {
      for (const p of penalties) {
        void this.notif.notify({
          recipient,
          kind: 'PENALTY_ADDED',
          title: `New penalty: ₹${Number(p.amount ?? 0).toLocaleString('en-IN')}`,
          body: p.reason
            ? `Reason: ${p.reason}`
            : 'Admin has logged a new penalty on your account.',
          link: '/jyotish/astrologer-dashboard/profile',
        });
      }
    }

    return updated;
  }

  async delete(id: number) {
    const astrologer = await this.prisma.astrologerAccount.findUnique({
      where: { id },
    });
    if (!astrologer) throw new NotFoundException('Astrologer not found');

    // Delete related records first
    await this.prisma.$transaction([
      this.prisma.astrologerService.deleteMany({ where: { astrologerId: id } }),
      this.prisma.astrologerVerificationDocument.deleteMany({
        where: { astrologerId: id },
      }),
      this.prisma.certificate.deleteMany({ where: { astrologerId: id } }),
      this.prisma.astrologerPenalty.deleteMany({ where: { astrologerId: id } }),
      this.prisma.astrologerExtraDocument.deleteMany({
        where: { astrologerId: id },
      }),
      this.prisma.profileEditRequest.deleteMany({
        where: { astrologerId: id },
      }),
      this.prisma.astrologerProfile.deleteMany({
        where: { astrologerId: id },
      }),
      this.prisma.astrologerAccount.delete({ where: { id } }),
    ]);

    return { deleted: true };
  }

  async login(dto: LoginAstrologerDto) {
    const astrologer = await this.prisma.astrologerAccount.findUnique({
      where: { email: dto.email },
      include: this.fullInclude,
    });

    if (!astrologer) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!astrologer.password) {
      throw new UnauthorizedException(
        'Password not set. Please contact admin.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      astrologer.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!astrologer.isApproved) {
      throw new UnauthorizedException('Account not yet approved');
    }

    if (!astrologer.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Issue a JWT so the astrologer dashboard guard can trust the browser
    // session. Payload mirrors the shopper token (id/email/name) with an
    // explicit `role: ASTROLOGER` so downstream guards can distinguish
    // astrologer tokens from regular customer ones.
    const token = this.jwt.sign({
      id: astrologer.id,
      email: astrologer.email,
      name: astrologer.displayName || astrologer.fullName,
      role: 'ASTROLOGER',
    });
    const { password, ...result } = astrologer;
    return { token, astrologer: result };
  }

  /**
   * Astrologer-controlled online toggle. Distinct from the admin's
   * `isActive` switch — an astrologer can pause their own availability
   * without the admin needing to touch anything. The public listing
   * endpoints already respect the admin `isActive`; we also factor
   * `isOnline` in so bookings only route to astrologers actually at
   * their desk.
   */
  async setOnline(id: number, online: boolean) {
    const astrologer = await this.prisma.astrologerAccount.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!astrologer) throw new NotFoundException('Astrologer not found');
    return this.prisma.astrologerAccount.update({
      where: { id },
      data: { isOnline: online },
      select: { id: true, isOnline: true },
    });
  }

  async checkDisplayName(displayName: string, ignoreId?: number) {
    if (!displayName) {
      throw new BadRequestException('displayName query parameter is required');
    }

    const existing = await this.prisma.astrologerAccount.findFirst({
      where: {
        displayName: { equals: displayName, mode: 'insensitive' },
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { id: true },
    });

    return { available: !existing, selfHit: false };
  }

  /* ────────────── Forgot-password flow ──────────────
   * Mirrors the shopper auth flow: email → 6-digit OTP → password.
   * We reuse the shared `PasswordReset` Prisma model but namespace the
   * email with an `astro:` prefix so an astrologer + shopper that share
   * an email address can't read each other's codes — each reset lives
   * in a private keyspace even when the User and AstrologerAccount
   * tables happen to use the same address.
   */

  private readonly RESET_OTP_TTL_MINUTES = 15;
  private astroResetKey(email: string): string {
    return `astro:${email.trim().toLowerCase()}`;
  }

  async forgotPassword(email: string) {
    const astrologer = await this.prisma.astrologerAccount.findUnique({
      where: { email },
    });
    if (!astrologer) {
      throw new NotFoundException('No astrologer account found for this email');
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(
      Date.now() + this.RESET_OTP_TTL_MINUTES * 60 * 1000,
    );
    const key = this.astroResetKey(email);

    await this.prisma.passwordReset.deleteMany({ where: { email: key } });
    await this.prisma.passwordReset.create({
      data: { email: key, token: otp, expires },
    });

    // Build a jyotish-specific magic link so the astrologer can skip
    // typing the OTP — lands on the themed reset page with code
    // prefilled.
    const frontend = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );
    const magicLink = `${frontend}/reset-password-jyotish?email=${encodeURIComponent(
      email,
    )}&otp=${otp}`;

    // Fire-and-forget email. Jyotish variant of the shared template so
    // the header band matches the astrologer login page visually.
    void this.mail
      .send({
        to: astrologer.email,
        subject: 'Your Hecate Jyotish password reset code',
        html: buildResetPasswordOtpEmailHtml({
          name: astrologer.displayName || astrologer.fullName,
          otp,
          expiresInMinutes: this.RESET_OTP_TTL_MINUTES,
          supportEmail: this.mail.adminEmail,
          variant: 'jyotish',
          magicLink,
        }),
      })
      .catch((err) =>
        this.logger.warn(
          `Astrologer reset OTP email failed for ${email}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ),
      );

    return {
      message: 'Password reset code sent',
      expiresInMinutes: this.RESET_OTP_TTL_MINUTES,
    };
  }

  async verifyForgotOtp(email: string, otp: string) {
    const record = await this.prisma.passwordReset.findFirst({
      where: {
        email: this.astroResetKey(email),
        token: otp,
        expires: { gte: new Date() },
      },
    });
    if (!record) {
      throw new BadRequestException('Invalid or expired code');
    }
    return { valid: true };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const key = this.astroResetKey(email);
    const record = await this.prisma.passwordReset.findFirst({
      where: { email: key, token: otp, expires: { gte: new Date() } },
    });
    if (!record) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.astrologerAccount.update({
      where: { email },
      data: { password: hashed },
    });
    await this.prisma.passwordReset.deleteMany({ where: { email: key } });

    return { message: 'Password reset successfully' };
  }
}
