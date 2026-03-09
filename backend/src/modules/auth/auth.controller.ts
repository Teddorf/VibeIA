import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { THROTTLER_DEFAULTS } from '../../config/defaults';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  TokenResponse,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import {
  CurrentUser,
  CurrentUserData,
} from './decorators/current-user.decorator';
import {
  setAuthCookies,
  clearAuthCookies,
  COOKIE_NAMES,
} from './utils/cookie.utils';
import { SecurityAuditService } from '../security/security-audit.service';

@Controller('api/auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: SecurityAuditService,
  ) {}

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  @Public()
  @Throttle({
    default: {
      limit: THROTTLER_DEFAULTS.auth.register.limit,
      ttl: THROTTLER_DEFAULTS.auth.register.ttl,
    },
  })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const tokens = await this.authService.register(registerDto);
    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.user.id,
    );

    // Log successful registration
    await this.auditService.logLogin(
      tokens.user.id,
      registerDto.email,
      this.getClientIp(req),
      req.headers['user-agent'],
    );

    return tokens;
  }

  @Public()
  @Throttle({
    default: {
      limit: THROTTLER_DEFAULTS.auth.login.limit,
      ttl: THROTTLER_DEFAULTS.auth.login.ttl,
    },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    try {
      const tokens = await this.authService.login(loginDto);
      setAuthCookies(
        res,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.user.id,
      );

      // Log successful login
      await this.auditService.logLogin(
        tokens.user.id,
        loginDto.email,
        ipAddress,
        userAgent,
      );

      return tokens;
    } catch (error) {
      // Log failed login attempt
      await this.auditService.logLoginFailure(
        loginDto.email,
        ipAddress,
        error instanceof Error ? error.message : 'Unknown error',
        userAgent,
      );
      throw error;
    }
  }

  @Public()
  @Throttle({
    default: {
      limit: THROTTLER_DEFAULTS.auth.refresh.limit,
      ttl: THROTTLER_DEFAULTS.auth.refresh.ttl,
    },
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: RefreshTokenDto,
  ): Promise<TokenResponse> {
    // Prefer cookies over body for security (HttpOnly cookies can't be stolen via XSS)
    const refreshToken =
      req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] || body.refreshToken;
    const userId = req.cookies?.[COOKIE_NAMES.USER_ID] || body.userId;

    if (!refreshToken || !userId) {
      throw new Error('Refresh token and user ID are required');
    }

    const tokens = await this.authService.refreshTokens(userId, refreshToken);
    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.user.id,
    );
    return tokens;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId);
    clearAuthCookies(res);

    // Log logout
    await this.auditService.logLogout(userId, this.getClientIp(req));

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };
  }

  @Public()
  @Throttle({
    default: {
      limit: THROTTLER_DEFAULTS.auth.forgotPassword.limit,
      ttl: THROTTLER_DEFAULTS.auth.forgotPassword.ttl,
    },
  })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(body.email);
    // Always return success to prevent email enumeration
    return {
      message:
        'If an account exists with that email, you will receive a password reset link.',
      // In development, return the token for testing (remove in production)
      ...(process.env.NODE_ENV !== 'production' && result
        ? { resetToken: result.token }
        : {}),
    };
  }

  @Public()
  @Throttle({
    default: {
      limit: THROTTLER_DEFAULTS.auth.resetPassword.limit,
      ttl: THROTTLER_DEFAULTS.auth.resetPassword.ttl,
    },
  })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Public()
  @Get('verify-reset-token/:token')
  async verifyResetToken(@Param('token') token: string) {
    const isValid = await this.authService.verifyResetToken(token);
    return { valid: isValid };
  }
}
