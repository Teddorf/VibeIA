import { Injectable } from '@nestjs/common';
import {
  GitProvider,
  GitLabProject,
  GitLabGroup,
  GIT_PROVIDER_CONFIG,
} from '../dto/teams.dto';

export interface GitLabTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
}

export interface GitLabUser {
  id: number;
  username: string;
  email: string;
  name: string;
  avatar_url: string;
  web_url: string;
}

@Injectable()
export class GitLabProvider {
  private readonly apiBaseUrl =
    GIT_PROVIDER_CONFIG[GitProvider.GITLAB].apiBaseUrl!;

  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
  ): Promise<GitLabTokenResponse> {
    const clientId = process.env.GITLAB_CLIENT_ID;
    const clientSecret = process.env.GITLAB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GitLab OAuth not configured');
    }

    const response = await fetch(
      GIT_PROVIDER_CONFIG[GitProvider.GITLAB].tokenUrl!,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitLab OAuth error: ${error}`);
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<GitLabTokenResponse> {
    const clientId = process.env.GITLAB_CLIENT_ID;
    const clientSecret = process.env.GITLAB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GitLab OAuth not configured');
    }

    const response = await fetch(
      GIT_PROVIDER_CONFIG[GitProvider.GITLAB].tokenUrl!,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitLab token refresh error: ${error}`);
    }

    return response.json();
  }

  async getCurrentUser(accessToken: string): Promise<GitLabUser> {
    const response = await fetch(`${this.apiBaseUrl}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get GitLab user');
    }

    return response.json();
  }

  async getGroups(accessToken: string): Promise<GitLabGroup[]> {
    const response = await fetch(
      `${this.apiBaseUrl}/groups?per_page=100&min_access_level=30`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to get GitLab groups');
    }

    return response.json();
  }

  async getProjects(
    accessToken: string,
    groupId?: number,
  ): Promise<GitLabProject[]> {
    const url = groupId
      ? `${this.apiBaseUrl}/groups/${groupId}/projects?per_page=100`
      : `${this.apiBaseUrl}/projects?membership=true&per_page=100`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get GitLab projects');
    }

    return response.json();
  }

  async getProject(
    accessToken: string,
    projectId: number | string,
  ): Promise<GitLabProject> {
    const encodedId =
      typeof projectId === 'string'
        ? encodeURIComponent(projectId)
        : projectId;

    const response = await fetch(`${this.apiBaseUrl}/projects/${encodedId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get GitLab project');
    }

    return response.json();
  }

  async createProject(
    accessToken: string,
    name: string,
    description?: string,
    visibility: 'private' | 'internal' | 'public' = 'private',
    namespaceId?: number,
  ): Promise<GitLabProject> {
    const response = await fetch(`${this.apiBaseUrl}/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        visibility,
        namespace_id: namespaceId,
        initialize_with_readme: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create GitLab project: ${error}`);
    }

    return response.json();
  }

  async createBranch(
    accessToken: string,
    projectId: number | string,
    branchName: string,
    ref: string = 'main',
  ): Promise<{ name: string; commit: { id: string } }> {
    const encodedId =
      typeof projectId === 'string'
        ? encodeURIComponent(projectId)
        : projectId;

    const response = await fetch(
      `${this.apiBaseUrl}/projects/${encodedId}/repository/branches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: branchName,
          ref,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create GitLab branch: ${error}`);
    }

    return response.json();
  }

  async createCommit(
    accessToken: string,
    projectId: number | string,
    branch: string,
    files: { path: string; content: string }[],
    commitMessage: string,
  ): Promise<{ id: string; message: string; web_url: string }> {
    const encodedId =
      typeof projectId === 'string'
        ? encodeURIComponent(projectId)
        : projectId;

    const actions = files.map((file) => ({
      action: 'create' as const,
      file_path: file.path,
      content: file.content,
    }));

    const response = await fetch(
      `${this.apiBaseUrl}/projects/${encodedId}/repository/commits`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch,
          commit_message: commitMessage,
          actions,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create GitLab commit: ${error}`);
    }

    return response.json();
  }

  async updateFile(
    accessToken: string,
    projectId: number | string,
    branch: string,
    filePath: string,
    content: string,
    commitMessage: string,
  ): Promise<{ file_path: string; branch: string }> {
    const encodedId =
      typeof projectId === 'string'
        ? encodeURIComponent(projectId)
        : projectId;
    const encodedPath = encodeURIComponent(filePath);

    const response = await fetch(
      `${this.apiBaseUrl}/projects/${encodedId}/repository/files/${encodedPath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch,
          content,
          commit_message: commitMessage,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update GitLab file: ${error}`);
    }

    return response.json();
  }

  async createMergeRequest(
    accessToken: string,
    projectId: number | string,
    sourceBranch: string,
    targetBranch: string,
    title: string,
    description?: string,
  ): Promise<{ id: number; iid: number; web_url: string }> {
    const encodedId =
      typeof projectId === 'string'
        ? encodeURIComponent(projectId)
        : projectId;

    const response = await fetch(
      `${this.apiBaseUrl}/projects/${encodedId}/merge_requests`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_branch: sourceBranch,
          target_branch: targetBranch,
          title,
          description,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create GitLab merge request: ${error}`);
    }

    return response.json();
  }

  async getFile(
    accessToken: string,
    projectId: number | string,
    filePath: string,
    ref: string = 'main',
  ): Promise<{ content: string; encoding: string }> {
    const encodedId =
      typeof projectId === 'string'
        ? encodeURIComponent(projectId)
        : projectId;
    const encodedPath = encodeURIComponent(filePath);

    const response = await fetch(
      `${this.apiBaseUrl}/projects/${encodedId}/repository/files/${encodedPath}?ref=${ref}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to get GitLab file');
    }

    return response.json();
  }

  async getBranches(
    accessToken: string,
    projectId: number | string,
  ): Promise<Array<{ name: string; default: boolean }>> {
    const encodedId =
      typeof projectId === 'string'
        ? encodeURIComponent(projectId)
        : projectId;

    const response = await fetch(
      `${this.apiBaseUrl}/projects/${encodedId}/repository/branches`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to get GitLab branches');
    }

    return response.json();
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getCurrentUser(accessToken);
      return true;
    } catch {
      return false;
    }
  }

  getOAuthUrl(redirectUri: string, state: string): string {
    const clientId = process.env.GITLAB_CLIENT_ID;
    if (!clientId) {
      throw new Error('GitLab OAuth not configured');
    }

    const scopes = GIT_PROVIDER_CONFIG[GitProvider.GITLAB].scopes!.join(' ');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state,
    });

    return `${GIT_PROVIDER_CONFIG[GitProvider.GITLAB].authorizationUrl}?${params}`;
  }
}
