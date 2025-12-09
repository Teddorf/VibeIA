import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService, LoginDto, RegisterDto, TokenResponse } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser, CurrentUserData } from './decorators/current-user.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<TokenResponse> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<TokenResponse> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: { userId: string; refreshToken: string }
  ): Promise<TokenResponse> {
    return this.authService.refreshTokens(body.userId, body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('userId') userId: string): Promise<{ message: string }> {
    await this.authService.logout(userId);
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
}
