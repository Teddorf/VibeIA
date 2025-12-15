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
import { CurrentUser, CurrentUserData } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

interface GitLabOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
  error?: string;
  error_description?: string;
}

interface GitLabUserResponse {
  id: number;
  username: string;
  email: string;
  name: string;
  avatar_url: string;
  web_url: string;
}

export interface GitLabConnectionStatus {
  connected: boolean;
  username?: string;
  email?: string;
  connectedAt?: Date;
}

@Controller('api/auth/gitlab')
export class GitLabAuthController {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;
  private readonly frontendUrl: string;
  private readonly scopes = 'read_user api read_repository';

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {
    this.clientId = this.configService.get<string>('GITLAB_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('GITLAB_CLIENT_SECRET') || '';
    this.callbackUrl = this.configService.get<string>('GITLAB_CALLBACK_URL') || '';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /**
   * GET /api/auth/gitlab
   * Initiates GitLab OAuth flow - redirects user to GitLab
   * @param state - CSRF state from frontend (for login flow)
   * @param userId - User ID (for connect flow)
   */
  @Public()
  @Get()
  async initiateOAuth(
    @Res() res: Response,
    @Query('state') state?: string,
    @Query('userId') userId?: string,
  ): Promise<void> {
    if (!this.clientId) {
      throw new BadRequestException('GitLab OAuth is not configured');
    }

    // If userId is provided (connect flow), encode it in state
    // Otherwise, pass through the state from frontend (login flow)
    let oauthState = '';
    if (userId) {
      oauthState = Buffer.from(JSON.stringify({ userId, type: 'connect' })).toString('base64');
    } else if (state) {
      // Wrap the frontend state to identify login flow
      oauthState = Buffer.from(JSON.stringify({ csrfState: state, type: 'login' })).toString('base64');
    }

    const authUrl = new URL('https://gitlab.com/oauth/authorize');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.scopes);
    if (oauthState) {
      authUrl.searchParams.set('state', oauthState);
    }

    res.redirect(authUrl.toString());
  }

  /**
   * GET /api/auth/gitlab/callback
   * GitLab OAuth callback - exchanges code for access token
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
      const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/gitlab`);
      errorUrl.searchParams.set('error', errorDescription || error);
      res.redirect(errorUrl.toString());
      return;
    }

    if (!code) {
      const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/gitlab`);
      errorUrl.searchParams.set('error', 'No authorization code received');
      res.redirect(errorUrl.toString());
      return;
    }

    try {
      // Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(code);

      if (tokenResponse.error) {
        const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/gitlab`);
        errorUrl.searchParams.set('error', tokenResponse.error_description || tokenResponse.error);
        res.redirect(errorUrl.toString());
        return;
      }

      const accessToken = tokenResponse.access_token;

      // Get GitLab user info
      const gitlabUser = await this.getGitLabUser(accessToken);

      // Parse state to determine flow type
      let stateData: { userId?: string; csrfState?: string; type?: string } = {};
      if (state) {
        try {
          stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        } catch {
          // If state is not base64 JSON, it might be a plain CSRF token
          stateData = { csrfState: state, type: 'login' };
        }
      }

      // Connect flow - user is connecting GitLab to existing account
      if (stateData.type === 'connect' && stateData.userId) {
        await this.usersService.connectGitLab(
          stateData.userId,
          gitlabUser.id.toString(),
          accessToken,
          gitlabUser.username,
          gitlabUser.email,
        );

        const successUrl = new URL(`${this.frontendUrl}/dashboard`);
        successUrl.searchParams.set('gitlab_connected', 'true');
        res.redirect(successUrl.toString());
        return;
      }

      // Login/Register flow - user is logging in with GitLab
      const tokens = await this.authService.loginWithOAuth(
        'gitlab',
        gitlabUser.id.toString(),
        gitlabUser.email,
        gitlabUser.name || gitlabUser.username,
        accessToken,
        gitlabUser.username,
      );

      // Redirect to frontend OAuth callback page with tokens
      const successUrl = new URL(`${this.frontendUrl}/oauth/callback/gitlab`);
      successUrl.searchParams.set('oauth_success', 'true');
      successUrl.searchParams.set('access_token', tokens.accessToken);
      successUrl.searchParams.set('refresh_token', tokens.refreshToken);
      successUrl.searchParams.set('user', Buffer.from(JSON.stringify(tokens.user)).toString('base64'));
      res.redirect(successUrl.toString());
    } catch (error: any) {
      console.error('GitLab OAuth callback error:', error);
      const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/gitlab`);
      errorUrl.searchParams.set('error', 'Failed to authenticate with GitLab');
      res.redirect(errorUrl.toString());
    }
  }

  /**
   * GET /api/auth/gitlab/status
   * Check if user has GitLab connected
   */
  @Get('status')
  async getStatus(@CurrentUser() user: CurrentUserData): Promise<GitLabConnectionStatus> {
    const status = await this.usersService.getGitLabConnectionStatus(user.userId);
    return status;
  }

  /**
   * DELETE /api/auth/gitlab
   * Disconnect GitLab account
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async disconnect(@CurrentUser() user: CurrentUserData): Promise<{ message: string }> {
    await this.usersService.disconnectGitLab(user.userId);
    return { message: 'GitLab account disconnected successfully' };
  }

  /**
   * GET /api/auth/gitlab/auth-url
   * Get the GitLab OAuth URL (for client-side redirect)
   */
  @Get('auth-url')
  getAuthUrl(@CurrentUser() user: CurrentUserData): { url: string } {
    if (!this.clientId) {
      throw new BadRequestException('GitLab OAuth is not configured');
    }

    const state = Buffer.from(JSON.stringify({ userId: user.userId })).toString('base64');

    const authUrl = new URL('https://gitlab.com/oauth/authorize');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', this.scopes);
    authUrl.searchParams.set('state', state);

    return { url: authUrl.toString() };
  }

  // ============================================
  // Private helpers
  // ============================================

  private async exchangeCodeForToken(code: string): Promise<GitLabOAuthTokenResponse> {
    const response = await fetch('https://gitlab.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.callbackUrl,
      }),
    });

    return response.json();
  }

  private async getGitLabUser(accessToken: string): Promise<GitLabUserResponse> {
    const response = await fetch('https://gitlab.com/api/v4/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to get GitLab user info');
    }

    return response.json();
  }
}
