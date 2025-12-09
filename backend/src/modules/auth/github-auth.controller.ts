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
  ) {
    this.clientId = this.configService.get<string>('GITHUB_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET') || '';
    this.callbackUrl = this.configService.get<string>('GITHUB_CALLBACK_URL') || '';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /**
   * GET /api/auth/github
   * Initiates GitHub OAuth flow - redirects user to GitHub
   */
  @Public()
  @Get()
  async initiateOAuth(@Res() res: Response, @Query('userId') userId?: string): Promise<void> {
    if (!this.clientId) {
      throw new BadRequestException('GitHub OAuth is not configured');
    }

    // Store userId in state for the callback
    const state = userId ? Buffer.from(JSON.stringify({ userId })).toString('base64') : '';

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.callbackUrl);
    authUrl.searchParams.set('scope', this.scopes);
    if (state) {
      authUrl.searchParams.set('state', state);
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
      const errorUrl = new URL(`${this.frontendUrl}/settings/github`);
      errorUrl.searchParams.set('error', errorDescription || error);
      res.redirect(errorUrl.toString());
      return;
    }

    if (!code) {
      const errorUrl = new URL(`${this.frontendUrl}/settings/github`);
      errorUrl.searchParams.set('error', 'No authorization code received');
      res.redirect(errorUrl.toString());
      return;
    }

    try {
      // Parse state to get userId
      let userId: string | undefined;
      if (state) {
        try {
          const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
          userId = stateData.userId;
        } catch {
          // Ignore state parsing errors
        }
      }

      if (!userId) {
        const errorUrl = new URL(`${this.frontendUrl}/settings/github`);
        errorUrl.searchParams.set('error', 'Invalid OAuth state - please try again');
        res.redirect(errorUrl.toString());
        return;
      }

      // Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(code);

      if (tokenResponse.error) {
        const errorUrl = new URL(`${this.frontendUrl}/settings/github`);
        errorUrl.searchParams.set('error', tokenResponse.error_description || tokenResponse.error);
        res.redirect(errorUrl.toString());
        return;
      }

      const accessToken = tokenResponse.access_token;

      // Get GitHub user info
      const githubUser = await this.getGitHubUser(accessToken);

      // Store the GitHub connection
      await this.usersService.connectGitHub(
        userId,
        githubUser.id.toString(),
        accessToken,
        githubUser.login,
      );

      // Redirect to success page
      const successUrl = new URL(`${this.frontendUrl}/settings/github`);
      successUrl.searchParams.set('success', 'true');
      successUrl.searchParams.set('username', githubUser.login);
      res.redirect(successUrl.toString());
    } catch (error: any) {
      console.error('GitHub OAuth callback error:', error);
      const errorUrl = new URL(`${this.frontendUrl}/settings/github`);
      errorUrl.searchParams.set('error', 'Failed to connect GitHub account');
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

    const state = Buffer.from(JSON.stringify({ userId: user.userId })).toString('base64');

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
}
