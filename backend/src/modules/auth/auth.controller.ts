import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus, Param, Res, Req } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Response, Request } from 'express';
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
import { CurrentUser, CurrentUserData } from './decorators/current-user.decorator';
import { setAuthCookies, clearAuthCookies, COOKIE_NAMES } from './utils/cookie.utils';

@Controller('api/auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 requests per 15 minutes
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const tokens = await this.authService.register(registerDto);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.user.id);
    return tokens;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 900000 } }) // 10 requests per 15 minutes
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponse> {
    const tokens = await this.authService.login(loginDto);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.user.id);
    return tokens;
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 900000 } }) // 20 requests per 15 minutes
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: RefreshTokenDto,
  ): Promise<TokenResponse> {
    // Prefer cookies over body for security (HttpOnly cookies can't be stolen via XSS)
    const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] || body.refreshToken;
    const userId = req.cookies?.[COOKIE_NAMES.USER_ID] || body.userId;

    if (!refreshToken || !userId) {
      throw new Error('Refresh token and user ID are required');
    }

    const tokens = await this.authService.refreshTokens(userId, refreshToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.user.id);
    return tokens;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('userId') userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId);
    clearAuthCookies(res);
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
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 requests per 15 minutes
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(body.email);
    // Always return success to prevent email enumeration
    return {
      message: 'If an account exists with that email, you will receive a password reset link.',
      // In development, return the token for testing (remove in production)
      ...(process.env.NODE_ENV !== 'production' && result ? { resetToken: result.token } : {}),
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 requests per 15 minutes
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
