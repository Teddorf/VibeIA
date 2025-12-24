import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // JWT_SECRET is validated at startup by config.validation.ts
    // If we reach here, it's guaranteed to exist
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be configured - this should have been caught at startup');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
