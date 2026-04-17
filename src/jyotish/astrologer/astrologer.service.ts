import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterAstrologerDto } from './dto/register-astrologer.dto';
import { UpdateAstrologerDto } from './dto/update-astrologer.dto';
import { LoginAstrologerDto } from './dto/login-astrologer.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AstrologerService {
  constructor(private prisma: PrismaService) {}

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
    if (query.id) {
      const astrologer = await this.prisma.astrologerAccount.findUnique({
        where: { id: query.id },
        include: this.fullInclude,
      });
      if (!astrologer) throw new NotFoundException('Astrologer not found');
      return astrologer;
    }

    const where =
      query.public === 'true'
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

    return this.prisma.astrologerAccount.create({
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
  }

  async update(dto: UpdateAstrologerDto) {
    const { id, services, penalties, extraDocuments, ...data } = dto;

    const astrologer = await this.prisma.astrologerAccount.findUnique({
      where: { id },
    });
    if (!astrologer) throw new NotFoundException('Astrologer not found');

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

    return this.prisma.astrologerAccount.update({
      where: { id },
      data: accountData,
      include: this.fullInclude,
    });
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

    const { password, ...result } = astrologer;
    return result;
  }

  async checkDisplayName(displayName: string) {
    if (!displayName) {
      throw new BadRequestException('displayName query parameter is required');
    }

    const existing = await this.prisma.astrologerAccount.findFirst({
      where: { displayName: { equals: displayName, mode: 'insensitive' } },
    });

    return { available: !existing };
  }
}
