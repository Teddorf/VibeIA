import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GitConnection, GitConnectionDocument } from './schemas/git-connection.schema';
import {
  GitProvider,
  ConnectGitProviderDto,
} from './dto/teams.dto';
import { GitLabProvider } from './git-providers/gitlab.provider';
import { BitbucketProvider } from './git-providers/bitbucket.provider';

@Injectable()
export class GitConnectionsService {
  constructor(
    @InjectModel(GitConnection.name) private connectionModel: Model<GitConnectionDocument>,
    private readonly gitlabProvider: GitLabProvider,
    private readonly bitbucketProvider: BitbucketProvider,
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
            (w) => w.uuid === dto.organizationId || w.slug === dto.organizationId,
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

    const connection = new this.connectionModel({
      teamId,
      provider: dto.provider,
      name: organizationName || `${dto.provider} Connection`,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined,
      organizationId: dto.organizationId,
      organizationName,
      isDefault: dto.isDefault ?? false,
    });

    const saved = await connection.save();
    return this.sanitizeConnection(saved);
  }

  async getConnection(connectionId: string): Promise<GitConnectionDocument | null> {
    try {
      const connection = await this.connectionModel.findById(connectionId).exec();
      return connection ? this.sanitizeConnection(connection) : null;
    } catch {
      return null;
    }
  }

  async getConnectionWithToken(connectionId: string): Promise<GitConnectionDocument | null> {
    try {
      return await this.connectionModel.findById(connectionId).exec();
    } catch {
      return null;
    }
  }

  async getTeamConnections(teamId: string): Promise<GitConnectionDocument[]> {
    const connections = await this.connectionModel.find({ teamId }).exec();
    return connections.map((c) => this.sanitizeConnection(c));
  }

  async getTeamConnectionsByProvider(
    teamId: string,
    provider: GitProvider,
  ): Promise<GitConnectionDocument[]> {
    const connections = await this.connectionModel
      .find({ teamId, provider })
      .exec();
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

    const connection = await this.connectionModel.findOne(query).exec();
    return connection ? this.sanitizeConnection(connection) : null;
  }

  async setDefault(teamId: string, connectionId: string): Promise<boolean> {
    const connection = await this.connectionModel.findById(connectionId).exec();
    if (!connection) return false;

    // Verify connection belongs to team
    if (connection.teamId !== teamId) return false;

    // Unset other defaults for same provider
    await this.unsetDefaultForProvider(teamId, connection.provider as GitProvider);

    // Set this as default
    await this.connectionModel
      .findByIdAndUpdate(connectionId, { isDefault: true })
      .exec();

    return true;
  }

  async refreshConnectionToken(connectionId: string): Promise<boolean> {
    const connection = await this.connectionModel.findById(connectionId).exec();
    if (!connection || !connection.refreshToken) return false;

    try {
      let tokenData: any;

      switch (connection.provider) {
        case GitProvider.GITLAB:
          tokenData = await this.gitlabProvider.refreshToken(
            connection.refreshToken,
          );
          break;

        case GitProvider.BITBUCKET:
          tokenData = await this.bitbucketProvider.refreshToken(
            connection.refreshToken,
          );
          break;

        default:
          return false;
      }

      await this.connectionModel
        .findByIdAndUpdate(connectionId, {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : undefined,
        })
        .exec();

      return true;
    } catch {
      return false;
    }
  }

  async validateConnection(connectionId: string): Promise<boolean> {
    const connection = await this.connectionModel.findById(connectionId).exec();
    if (!connection || !connection.accessToken) return false;

    // Check if token is expired
    if (connection.expiresAt && connection.expiresAt < new Date()) {
      // Try to refresh
      const refreshed = await this.refreshConnectionToken(connectionId);
      if (!refreshed) return false;
    }

    try {
      switch (connection.provider) {
        case GitProvider.GITLAB:
          return await this.gitlabProvider.validateToken(connection.accessToken);

        case GitProvider.BITBUCKET:
          return await this.bitbucketProvider.validateToken(
            connection.accessToken,
          );

        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  async updateLastUsed(connectionId: string): Promise<void> {
    await this.connectionModel
      .findByIdAndUpdate(connectionId, { lastUsedAt: new Date() })
      .exec();
  }

  async disconnectProvider(
    teamId: string,
    connectionId: string,
  ): Promise<boolean> {
    const connection = await this.connectionModel.findById(connectionId).exec();
    if (!connection) return false;

    // Verify connection belongs to team
    if (connection.teamId !== teamId) return false;

    await this.connectionModel.findByIdAndDelete(connectionId).exec();

    return true;
  }

  async clearTeamConnections(teamId: string): Promise<void> {
    await this.connectionModel.deleteMany({ teamId }).exec();
  }

  getOAuthUrl(provider: GitProvider, redirectUri: string, state: string): string {
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
    await this.connectionModel
      .updateMany(
        { teamId, provider, isDefault: true },
        { isDefault: false },
      )
      .exec();
  }

  private sanitizeConnection(connection: GitConnectionDocument): GitConnectionDocument {
    const sanitized = connection.toObject();
    sanitized.accessToken = undefined;
    sanitized.refreshToken = undefined;
    sanitized.webhookSecret = undefined;
    return sanitized as GitConnectionDocument;
  }
}
