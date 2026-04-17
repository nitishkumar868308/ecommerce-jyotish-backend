import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Try Bearer token from Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // 2. Try session cookie
        (req: Request) => req?.cookies?.session || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
    });
  }

  async validate(payload: any) {
    if (!payload?.id) {
      throw new UnauthorizedException('Invalid token');
    }
    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      gender: payload.gender,
      phone: payload.phone,
    };
  }
}
