import {
  Controller,
  Get,
  Delete,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { OAuthStateService } from './services/oauth-state.service';
import { CurrentUser, CurrentUserData } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { setAuthCookies } from './utils/cookie.utils';

interface GoogleOAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserResponse {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export interface GoogleConnectionStatus {
  connected: boolean;
  email?: string;
  name?: string;
  connectedAt?: Date;
}

@Controller('api/auth/google')
export class GoogleAuthController {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;
  private readonly frontendUrl: string;
  private readonly scopes = 'openid email profile';

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly oauthStateService: OAuthStateService,
  ) {
    this.clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET') || '';
    this.callbackUrl = this.configService.get<string>('GOOGLE_CALLBACK_URL') || '';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /**
   * GET /api/auth/google
   * Initiates Google OAuth flow - redirects user to Google
   * @param type - Flow type: 'login', 'register', or 'connect'
   * @param userId - User ID (required for connect flow)
   */
  @Public()
  @Get()
  async initiateOAuth(
    @Res() res: Response,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
  ): Promise<void> {
    if (!this.clientId) {
      throw new BadRequestException('Google OAuth is not configured');
    }

    // Determine flow type
    const flowType = (type === 'connect' || type === 'register') ? type : 'login';

    // Generate secure state with nonce (prevents CSRF and account takeover)
    const oauthState = this.oauthStateService.generateState(flowType, userId);

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', oauthState);

    res.redirect(authUrl.toString());
  }

  /**
   * GET /api/auth/google/callback
   * Google OAuth callback - exchanges code for access token
   */
  @Public()
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ): Promise<void> {
    // Handle OAuth errors
    if (error) {
      const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/google`);
      errorUrl.searchParams.set('error', errorDescription || error);
      res.redirect(errorUrl.toString());
      return;
    }

    if (!code) {
      const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/google`);
      errorUrl.searchParams.set('error', 'No authorization code received');
      res.redirect(errorUrl.toString());
      return;
    }

    // SECURITY: Validate and consume state (prevents CSRF and account takeover)
    if (!state) {
      const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/google`);
      errorUrl.searchParams.set('error', 'Missing OAuth state parameter');
      res.redirect(errorUrl.toString());
      return;
    }

    const validatedState = await this.oauthStateService.validateAndConsumeState(state);
    if (!validatedState) {
      const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/google`);
      errorUrl.searchParams.set('error', 'Invalid or expired OAuth state');
      res.redirect(errorUrl.toString());
      return;
    }

    try {
      // Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(code);

      if (tokenResponse.error) {
        const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/google`);
        errorUrl.searchParams.set('error', tokenResponse.error_description || tokenResponse.error);
        res.redirect(errorUrl.toString());
        return;
      }

      const accessToken = tokenResponse.access_token;

      // Get Google user info
      const googleUser = await this.getGoogleUser(accessToken);

      // Connect flow - user is connecting Google to existing account
      if (validatedState.type === 'connect' && validatedState.userId) {
        await this.usersService.connectGoogle(
          validatedState.userId,
          googleUser.id,
          accessToken,
          googleUser.email,
          googleUser.name,
        );

        const successUrl = new URL(`${this.frontendUrl}/dashboard`);
        successUrl.searchParams.set('google_connected', 'true');
        res.redirect(successUrl.toString());
        return;
      }

      // Login/Register flow - user is logging in with Google
      const tokens = await this.authService.loginWithOAuth(
        'google',
        googleUser.id,
        googleUser.email,
        googleUser.name,
        accessToken,
      );

      // Set HttpOnly cookies (secure - can't be stolen via XSS)
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken, tokens.user.id);

      // Redirect to frontend OAuth callback page (tokens are in HttpOnly cookies, not URL)
      const successUrl = new URL(`${this.frontendUrl}/oauth/callback/google`);
      successUrl.searchParams.set('oauth_success', 'true');
      res.redirect(successUrl.toString());
    } catch (error: any) {
      console.error('Google OAuth callback error:', error);
      const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/google`);
      errorUrl.searchParams.set('error', 'Failed to authenticate with Google');
      res.redirect(errorUrl.toString());
    }
  }

  /**
   * GET /api/auth/google/status
   * Check if user has Google connected
   */
  @Get('status')
  async getStatus(@CurrentUser() user: CurrentUserData): Promise<GoogleConnectionStatus> {
    const status = await this.usersService.getGoogleConnectionStatus(user.userId);
    return status;
  }

  /**
   * DELETE /api/auth/google
   * Disconnect Google account
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async disconnect(@CurrentUser() user: CurrentUserData): Promise<{ message: string }> {
    await this.usersService.disconnectGoogle(user.userId);
    return { message: 'Google account disconnected successfully' };
  }

  /**
   * GET /api/auth/google/auth-url
   * Get the Google OAuth URL (for client-side redirect)
   */
  @Get('auth-url')
  getAuthUrl(@CurrentUser() user: CurrentUserData): { url: string } {
    if (!this.clientId) {
      throw new BadRequestException('Google OAuth is not configured');
    }

    // Generate secure state with nonce (prevents CSRF and account takeover)
    const state = this.oauthStateService.generateState('connect', user.userId);

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('state', state);

    return { url: authUrl.toString() };
  }

  // ============================================
  // Private helpers
  // ============================================

  private async exchangeCodeForToken(code: string): Promise<GoogleOAuthTokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.callbackUrl,
      }).toString(),
    });

    return response.json();
  }

  private async getGoogleUser(accessToken: string): Promise<GoogleUserResponse> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to get Google user info');
    }

    return response.json();
  }
}
