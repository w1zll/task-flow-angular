import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['access_token'] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; sid?: string }) {
    const user = await this.authService.validateSession(
      payload.sub,
      payload.sid ?? '',
    );
    if (!user) throw new UnauthorizedException();
    Object.defineProperty(user, 'sessionId', {
      value: payload.sid,
      enumerable: false,
      configurable: true,
    });
    return user;
  }
}
