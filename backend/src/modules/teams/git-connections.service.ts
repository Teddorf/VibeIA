import { Injectable, Inject } from '@nestjs/common';
import {
  GitConnection,
  GitConnectionDocument,
} from './schemas/git-connection.schema';
import { GitProvider, ConnectGitProviderDto } from './dto/teams.dto';
import { GitLabProvider } from './git-providers/gitlab.provider';
import { BitbucketProvider } from './git-providers/bitbucket.provider';
import { TokenEncryptionService } from '../security/token-encryption.service';
import { IRepository } from '../../providers/interfaces/database-provider.interface';
import { GIT_CONNECTION_REPOSITORY } from '../../providers/repository-tokens';

@Injectable()
export class GitConnectionsService {
  constructor(
    @Inject(GIT_CONNECTION_REPOSITORY)
    private readonly connectionRepo: IRepository<GitConnectionDocument>,
    private readonly gitlabProvider: GitLabProvider,
    private readonly bitbucketProvider: BitbucketProvider,
    private readonly tokenEncryption: TokenEncryptionService,
  ) {}

  async connectProvider(
    teamId: string,
    dto: ConnectGitProviderDto,
  ): Promise<GitConnectionDocument> {
    let tokenData: any;
    let organizationName: string | undefined;

    switch (dto.provider) {
      case GitProvider.GITLAB:
        tokenData = await this.gitlabProvider.exchangeCodeForToken(
          dto.code,
          dto.redirectUri,
        );
        if (dto.organizationId) {
          const groups = await this.gitlabProvider.getGroups(
            tokenData.access_token,
          );
          const group = groups.find(
            (g) => g.id.toString() === dto.organizationId,
          );
          organizationName = group?.name;
        }
        break;

      case GitProvider.BITBUCKET:
        tokenData = await this.bitbucketProvider.exchangeCodeForToken(
          dto.code,
          dto.redirectUri,
        );
        if (dto.organizationId) {
          const workspaces = await this.bitbucketProvider.getWorkspaces(
            tokenData.access_token,
          );
          const workspace = workspaces.find(
            (w) =>
              w.uuid === dto.organizationId || w.slug === dto.organizationId,
          );
          organizationName = workspace?.name;
        }
        break;

      case GitProvider.GITHUB:
        // GitHub handled by existing GitService
        throw new Error('Use GitService for GitHub connections');
    }

    // If this is set as default, unset other defaults for same provider
    if (dto.isDefault) {
      await this.unsetDefaultForProvider(teamId, dto.provider);
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = this.tokenEncryption.encrypt(
      tokenData.access_token,
    );
    const encryptedRefreshToken = tokenData.refresh_token
      ? this.tokenEncryption.encrypt(tokenData.refresh_token)
      : undefined;

    const saved = await this.connectionRepo.create({
      teamId,
      provider: dto.provider,
      name: organizationName || `${dto.provider} Connection`,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined,
      organizationId: dto.organizationId,
      organizationName,
      isDefault: dto.isDefault ?? false,
    } as any);

    return this.sanitizeConnection(saved);
  }

  async getConnection(
    connectionId: string,
  ): Promise<GitConnectionDocument | null> {
    try {
      const connection = await this.connectionRepo.findById(connectionId);
      return connection ? this.sanitizeConnection(connection) : null;
    } catch {
      return null;
    }
  }

  async getConnectionWithToken(
    connectionId: string,
  ): Promise<GitConnectionDocument | null> {
    try {
      return await this.connectionRepo.findById(connectionId);
    } catch {
      return null;
    }
  }

  async getTeamConnections(teamId: string): Promise<GitConnectionDocument[]> {
    const connections = await this.connectionRepo.find({ teamId });
    return connections.map((c) => this.sanitizeConnection(c));
  }

  async getTeamConnectionsByProvider(
    teamId: string,
    provider: GitProvider,
  ): Promise<GitConnectionDocument[]> {
    const connections = await this.connectionRepo.find({ teamId, provider });
    return connections.map((c) => this.sanitizeConnection(c));
  }

  async getDefaultConnection(
    teamId: string,
    provider?: GitProvider,
  ): Promise<GitConnectionDocument | null> {
    const query: Record<string, any> = { teamId, isDefault: true };
    if (provider) {
      query.provider = provider;
    }

    const connection = await this.connectionRepo.findOne(query);
    return connection ? this.sanitizeConnection(connection) : null;
  }

  async setDefault(teamId: string, connectionId: string): Promise<boolean> {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection) return false;

    // Verify connection belongs to team
    if (connection.teamId !== teamId) return false;

    // Unset other defaults for same provider
    await this.unsetDefaultForProvider(
      teamId,
      connection.provider as GitProvider,
    );

    // Set this as default
    await this.connectionRepo.update(connectionId, { isDefault: true });

    return true;
  }

  async refreshConnectionToken(connectionId: string): Promise<boolean> {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection || !connection.refreshToken) return false;

    try {
      // Decrypt the refresh token
      const decryptedRefreshToken = this.decryptToken(connection.refreshToken);
      if (!decryptedRefreshToken) return false;

      let tokenData: any;

      switch (connection.provider) {
        case GitProvider.GITLAB:
          tokenData = await this.gitlabProvider.refreshToken(
            decryptedRefreshToken,
          );
          break;

        case GitProvider.BITBUCKET:
          tokenData = await this.bitbucketProvider.refreshToken(
            decryptedRefreshToken,
          );
          break;

        default:
          return false;
      }

      // Encrypt new tokens before storing
      const encryptedAccessToken = this.tokenEncryption.encrypt(
        tokenData.access_token,
      );
      const encryptedRefreshToken = tokenData.refresh_token
        ? this.tokenEncryption.encrypt(tokenData.refresh_token)
        : undefined;

      await this.connectionRepo.update(connectionId, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : undefined,
      });

      return true;
    } catch {
      return false;
    }
  }

  async validateConnection(connectionId: string): Promise<boolean> {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection || !connection.accessToken) return false;

    // Check if token is expired
    if (connection.expiresAt && connection.expiresAt < new Date()) {
      // Try to refresh
      const refreshed = await this.refreshConnectionToken(connectionId);
      if (!refreshed) return false;
      // Reload connection with new token
      const refreshedConnection =
        await this.connectionRepo.findById(connectionId);
      if (!refreshedConnection) return false;
      connection.accessToken = refreshedConnection.accessToken;
    }

    // Decrypt the access token
    const decryptedAccessToken = this.decryptToken(connection.accessToken);
    if (!decryptedAccessToken) return false;

    try {
      switch (connection.provider) {
        case GitProvider.GITLAB:
          return await this.gitlabProvider.validateToken(decryptedAccessToken);

        case GitProvider.BITBUCKET:
          return await this.bitbucketProvider.validateToken(
            decryptedAccessToken,
          );

        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  async updateLastUsed(connectionId: string): Promise<void> {
    await this.connectionRepo.update(connectionId, { lastUsedAt: new Date() });
  }

  async disconnectProvider(
    teamId: string,
    connectionId: string,
  ): Promise<boolean> {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection) return false;

    // Verify connection belongs to team
    if (connection.teamId !== teamId) return false;

    await this.connectionRepo.delete(connectionId);

    return true;
  }

  async clearTeamConnections(teamId: string): Promise<void> {
    await this.connectionRepo.deleteMany({ teamId });
  }

  getOAuthUrl(
    provider: GitProvider,
    redirectUri: string,
    state: string,
  ): string {
    switch (provider) {
      case GitProvider.GITLAB:
        return this.gitlabProvider.getOAuthUrl(redirectUri, state);

      case GitProvider.BITBUCKET:
        return this.bitbucketProvider.getOAuthUrl(redirectUri, state);

      case GitProvider.GITHUB:
        // GitHub OAuth URL generation
        const clientId = process.env.GITHUB_CLIENT_ID;
        if (!clientId) throw new Error('GitHub OAuth not configured');
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: 'repo read:user read:org',
          state,
        });
        return `https://github.com/login/oauth/authorize?${params}`;
    }
  }

  private async unsetDefaultForProvider(
    teamId: string,
    provider: GitProvider,
  ): Promise<void> {
    await this.connectionRepo.updateMany(
      { teamId, provider, isDefault: true },
      { isDefault: false },
    );
  }

  private sanitizeConnection(
    connection: GitConnectionDocument,
  ): GitConnectionDocument {
    const sanitized = (connection as any).toObject?.()
      ? (connection as any).toObject()
      : { ...connection };
    sanitized.accessToken = undefined;
    sanitized.refreshToken = undefined;
    sanitized.webhookSecret = undefined;
    return sanitized as GitConnectionDocument;
  }

  /**
   * Decrypt a token, handling both encrypted and plaintext formats
   * for backward compatibility with existing data
   */
  private decryptToken(token: string): string | null {
    if (!token) return null;

    try {
      // Check if token appears to be encrypted
      if (this.tokenEncryption.isEncrypted(token)) {
        return this.tokenEncryption.decrypt(token);
      }
      // Token is plaintext (legacy data), return as-is
      return token;
    } catch {
      // Decryption failed, might be corrupted or invalid
      return null;
    }
  }

  /**
   * Get the decrypted access token for a connection
   * Used by external services that need to make API calls
   */
  async getDecryptedAccessToken(connectionId: string): Promise<string | null> {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection || !connection.accessToken) return null;

    return this.decryptToken(connection.accessToken);
  }
}
