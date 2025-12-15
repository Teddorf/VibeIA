import {
  Controller,
  Get,
  Delete,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { GitService } from '../git/git.service';
import { AuthService } from './auth.service';
import { CurrentUser, CurrentUserData } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { GitHubConnectionStatus } from '../git/dto/github.dto';

interface GitHubOAuthTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  avatar_url: string;
  name: string;
  email: string;
}

@Controller('api/auth/github')
export class GitHubAuthController {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;
  private readonly frontendUrl: string;
  private readonly scopes = 'repo,read:user,user:email';

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly gitService: GitService,
    private readonly authService: AuthService,
  ) {
    this.clientId = this.configService.get<string>('GITHUB_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET') || '';
    this.callbackUrl = this.configService.get<string>('GITHUB_CALLBACK_URL') || '';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /**
   * GET /api/auth/github
   * Initiates GitHub OAuth flow - redirects user to GitHub
   * @param state - CSRF state from frontend (or userId for connect flow)
   */
  @Public()
  @Get()
  async initiateOAuth(
    @Res() res: Response,
    @Query('state') state?: string,
    @Query('userId') userId?: string,
  ): Promise<void> {
    if (!this.clientId) {
      throw new BadRequestException('GitHub OAuth is not configured');
    }

    // If userId is provided (connect flow), encode it in state
    // Otherwise, pass through the state from frontend (login flow)
    let oauthState = state || '';
    if (userId) {
      oauthState = Buffer.from(JSON.stringify({ userId, type: 'connect' })).toString('base64');
    } else if (state) {
      // Wrap the frontend state to identify login flow
      oauthState = Buffer.from(JSON.stringify({ csrfState: state, type: 'login' })).toString('base64');
    }

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.callbackUrl);
    authUrl.searchParams.set('scope', this.scopes);
    if (oauthState) {
      authUrl.searchParams.set('state', oauthState);
    }

    res.redirect(authUrl.toString());
  }

  /**
   * GET /api/auth/github/callback
   * GitHub OAuth callback - exchanges code for access token
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
      const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/github`);
      errorUrl.searchParams.set('error', errorDescription || error);
      res.redirect(errorUrl.toString());
      return;
    }

    if (!code) {
      const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/github`);
      errorUrl.searchParams.set('error', 'No authorization code received');
      res.redirect(errorUrl.toString());
      return;
    }

    try {
      // Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(code);

      if (tokenResponse.error) {
        const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/github`);
        errorUrl.searchParams.set('error', tokenResponse.error_description || tokenResponse.error);
        res.redirect(errorUrl.toString());
        return;
      }

      const accessToken = tokenResponse.access_token;

      // Get GitHub user info
      const githubUser = await this.getGitHubUser(accessToken);

      // Get email if not in profile
      let email = githubUser.email;
      if (!email) {
        email = await this.getGitHubPrimaryEmail(accessToken);
      }

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

      // Connect flow - user is connecting GitHub to existing account
      if (stateData.type === 'connect' && stateData.userId) {
        await this.usersService.connectGitHub(
          stateData.userId,
          githubUser.id.toString(),
          accessToken,
          githubUser.login,
        );

        const successUrl = new URL(`${this.frontendUrl}/dashboard`);
        successUrl.searchParams.set('github_connected', 'true');
        res.redirect(successUrl.toString());
        return;
      }

      // Login/Register flow - user is logging in with GitHub
      const tokens = await this.authService.loginWithOAuth(
        'github',
        githubUser.id.toString(),
        email,
        githubUser.name || githubUser.login,
        accessToken,
        githubUser.login,
      );

      // Redirect to frontend OAuth callback page with tokens
      const successUrl = new URL(`${this.frontendUrl}/oauth/callback/github`);
      successUrl.searchParams.set('oauth_success', 'true');
      successUrl.searchParams.set('access_token', tokens.accessToken);
      successUrl.searchParams.set('refresh_token', tokens.refreshToken);
      successUrl.searchParams.set('user', Buffer.from(JSON.stringify(tokens.user)).toString('base64'));
      res.redirect(successUrl.toString());
    } catch (error: any) {
      console.error('GitHub OAuth callback error:', error);
      const errorUrl = new URL(`${this.frontendUrl}/oauth/callback/github`);
      errorUrl.searchParams.set('error', 'Failed to authenticate with GitHub');
      res.redirect(errorUrl.toString());
    }
  }

  /**
   * GET /api/auth/github/status
   * Check if user has GitHub connected
   */
  @Get('status')
  async getStatus(@CurrentUser() user: CurrentUserData): Promise<GitHubConnectionStatus> {
    const status = await this.usersService.getGitHubConnectionStatus(user.userId);

    if (status.connected) {
      // Verify the token is still valid
      const accessToken = await this.usersService.getGitHubAccessToken(user.userId);
      if (accessToken) {
        const tokenStatus = await this.gitService.verifyToken(accessToken);
        return {
          connected: tokenStatus.valid,
          username: status.username,
          connectedAt: status.connectedAt,
          scopes: tokenStatus.scopes,
        };
      }
    }

    return { connected: false };
  }

  /**
   * DELETE /api/auth/github
   * Disconnect GitHub account
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async disconnect(@CurrentUser() user: CurrentUserData): Promise<{ message: string }> {
    await this.usersService.disconnectGitHub(user.userId);
    return { message: 'GitHub account disconnected successfully' };
  }

  /**
   * GET /api/auth/github/auth-url
   * Get the GitHub OAuth URL (for client-side redirect)
   */
  @Get('auth-url')
  getAuthUrl(@CurrentUser() user: CurrentUserData): { url: string } {
    if (!this.clientId) {
      throw new BadRequestException('GitHub OAuth is not configured');
    }

    const state = Buffer.from(JSON.stringify({ userId: user.userId, type: 'connect' })).toString('base64');

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.callbackUrl);
    authUrl.searchParams.set('scope', this.scopes);
    authUrl.searchParams.set('state', state);

    return { url: authUrl.toString() };
  }

  // ============================================
  // Private helpers
  // ============================================

  private async exchangeCodeForToken(code: string): Promise<GitHubOAuthTokenResponse> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.callbackUrl,
      }),
    });

    return response.json();
  }

  private async getGitHubUser(accessToken: string): Promise<GitHubUserResponse> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to get GitHub user info');
    }

    return response.json();
  }

  private async getGitHubPrimaryEmail(accessToken: string): Promise<string> {
    try {
      const response = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (response.ok) {
        const emails = await response.json();
        const primary = emails.find((e: any) => e.primary && e.verified);
        if (primary) return primary.email;
        const verified = emails.find((e: any) => e.verified);
        if (verified) return verified.email;
        if (emails.length > 0) return emails[0].email;
      }
    } catch {
      // Ignore email fetch errors
    }
    return '';
  }
}
