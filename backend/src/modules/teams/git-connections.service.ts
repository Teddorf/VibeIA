import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  GitConnection,
  GitProvider,
  ConnectGitProviderDto,
} from './dto/teams.dto';
import { GitLabProvider } from './git-providers/gitlab.provider';
import { BitbucketProvider } from './git-providers/bitbucket.provider';

@Injectable()
export class GitConnectionsService {
  private connections: Map<string, GitConnection> = new Map();
  private teamConnectionIndex: Map<string, Set<string>> = new Map();

  constructor(
    private readonly gitlabProvider: GitLabProvider,
    private readonly bitbucketProvider: BitbucketProvider,
  ) {}

  async connectProvider(
    teamId: string,
    dto: ConnectGitProviderDto,
  ): Promise<GitConnection> {
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

    const id = randomUUID();
    const connection: GitConnection = {
      id,
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
      createdAt: new Date(),
    };

    // If this is set as default, unset other defaults for same provider
    if (connection.isDefault) {
      await this.unsetDefaultForProvider(teamId, dto.provider);
    }

    this.connections.set(id, connection);

    // Update team index
    if (!this.teamConnectionIndex.has(teamId)) {
      this.teamConnectionIndex.set(teamId, new Set());
    }
    this.teamConnectionIndex.get(teamId)!.add(id);

    return this.sanitizeConnection(connection);
  }

  async getConnection(connectionId: string): Promise<GitConnection | null> {
    const connection = this.connections.get(connectionId);
    return connection ? this.sanitizeConnection(connection) : null;
  }

  async getConnectionWithToken(connectionId: string): Promise<GitConnection | null> {
    return this.connections.get(connectionId) || null;
  }

  async getTeamConnections(teamId: string): Promise<GitConnection[]> {
    const connectionIds = this.teamConnectionIndex.get(teamId);
    if (!connectionIds) return [];

    const connections: GitConnection[] = [];
    for (const id of connectionIds) {
      const connection = this.connections.get(id);
      if (connection) {
        connections.push(this.sanitizeConnection(connection));
      }
    }

    return connections;
  }

  async getTeamConnectionsByProvider(
    teamId: string,
    provider: GitProvider,
  ): Promise<GitConnection[]> {
    const connections = await this.getTeamConnections(teamId);
    return connections.filter((c) => c.provider === provider);
  }

  async getDefaultConnection(
    teamId: string,
    provider?: GitProvider,
  ): Promise<GitConnection | null> {
    const connectionIds = this.teamConnectionIndex.get(teamId);
    if (!connectionIds) return null;

    for (const id of connectionIds) {
      const connection = this.connections.get(id);
      if (
        connection &&
        connection.isDefault &&
        (!provider || connection.provider === provider)
      ) {
        return this.sanitizeConnection(connection);
      }
    }

    return null;
  }

  async setDefault(teamId: string, connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    // Verify connection belongs to team
    const teamConnections = this.teamConnectionIndex.get(teamId);
    if (!teamConnections?.has(connectionId)) return false;

    // Unset other defaults for same provider
    await this.unsetDefaultForProvider(teamId, connection.provider);

    // Set this as default
    connection.isDefault = true;
    this.connections.set(connectionId, connection);

    return true;
  }

  async refreshConnectionToken(connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
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

      connection.accessToken = tokenData.access_token;
      connection.refreshToken = tokenData.refresh_token;
      connection.expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined;

      this.connections.set(connectionId, connection);

      return true;
    } catch {
      return false;
    }
  }

  async validateConnection(connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
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
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastUsedAt = new Date();
      this.connections.set(connectionId, connection);
    }
  }

  async disconnectProvider(
    teamId: string,
    connectionId: string,
  ): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    // Verify connection belongs to team
    const teamConnections = this.teamConnectionIndex.get(teamId);
    if (!teamConnections?.has(connectionId)) return false;

    // Remove from indexes
    teamConnections.delete(connectionId);
    this.connections.delete(connectionId);

    return true;
  }

  async clearTeamConnections(teamId: string): Promise<void> {
    const connectionIds = this.teamConnectionIndex.get(teamId);
    if (!connectionIds) return;

    for (const id of connectionIds) {
      this.connections.delete(id);
    }

    this.teamConnectionIndex.delete(teamId);
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
    const connectionIds = this.teamConnectionIndex.get(teamId);
    if (!connectionIds) return;

    for (const id of connectionIds) {
      const connection = this.connections.get(id);
      if (connection && connection.provider === provider && connection.isDefault) {
        connection.isDefault = false;
        this.connections.set(id, connection);
      }
    }
  }

  private sanitizeConnection(connection: GitConnection): GitConnection {
    return {
      ...connection,
      accessToken: undefined,
      refreshToken: undefined,
      webhookSecret: undefined,
    };
  }
}
