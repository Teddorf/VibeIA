import { Injectable } from '@nestjs/common';
import {
  GitProvider,
  BitbucketRepository,
  BitbucketWorkspace,
  GIT_PROVIDER_CONFIG,
} from '../dto/teams.dto';

export interface BitbucketTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scopes: string;
}

export interface BitbucketUser {
  uuid: string;
  username: string;
  display_name: string;
  account_id: string;
  links: {
    html: { href: string };
    avatar: { href: string };
  };
}

@Injectable()
export class BitbucketProvider {
  private readonly apiBaseUrl =
    GIT_PROVIDER_CONFIG[GitProvider.BITBUCKET].apiBaseUrl!;

  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
  ): Promise<BitbucketTokenResponse> {
    const clientId = process.env.BITBUCKET_CLIENT_ID;
    const clientSecret = process.env.BITBUCKET_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Bitbucket OAuth not configured');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const response = await fetch(
      GIT_PROVIDER_CONFIG[GitProvider.BITBUCKET].tokenUrl!,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bitbucket OAuth error: ${error}`);
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<BitbucketTokenResponse> {
    const clientId = process.env.BITBUCKET_CLIENT_ID;
    const clientSecret = process.env.BITBUCKET_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Bitbucket OAuth not configured');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const response = await fetch(
      GIT_PROVIDER_CONFIG[GitProvider.BITBUCKET].tokenUrl!,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bitbucket token refresh error: ${error}`);
    }

    return response.json();
  }

  async getCurrentUser(accessToken: string): Promise<BitbucketUser> {
    const response = await fetch(`${this.apiBaseUrl}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Bitbucket user');
    }

    return response.json();
  }

  async getWorkspaces(accessToken: string): Promise<BitbucketWorkspace[]> {
    const response = await fetch(`${this.apiBaseUrl}/workspaces?pagelen=100`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Bitbucket workspaces');
    }

    const data = await response.json();
    return data.values || [];
  }

  async getRepositories(
    accessToken: string,
    workspaceSlug?: string,
  ): Promise<BitbucketRepository[]> {
    const url = workspaceSlug
      ? `${this.apiBaseUrl}/repositories/${workspaceSlug}?pagelen=100`
      : `${this.apiBaseUrl}/user/permissions/repositories?pagelen=100`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Bitbucket repositories');
    }

    const data = await response.json();
    // For user/permissions endpoint, repos are nested under 'repository'
    if (!workspaceSlug) {
      return (data.values || []).map((item: any) => item.repository);
    }
    return data.values || [];
  }

  async getRepository(
    accessToken: string,
    workspace: string,
    repoSlug: string,
  ): Promise<BitbucketRepository> {
    const response = await fetch(
      `${this.apiBaseUrl}/repositories/${workspace}/${repoSlug}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to get Bitbucket repository');
    }

    return response.json();
  }

  async createRepository(
    accessToken: string,
    workspace: string,
    name: string,
    description?: string,
    isPrivate: boolean = true,
  ): Promise<BitbucketRepository> {
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const response = await fetch(
      `${this.apiBaseUrl}/repositories/${workspace}/${slug}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scm: 'git',
          name,
          description,
          is_private: isPrivate,
          project: undefined,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Bitbucket repository: ${error}`);
    }

    return response.json();
  }

  async createBranch(
    accessToken: string,
    workspace: string,
    repoSlug: string,
    branchName: string,
    targetCommit: string,
  ): Promise<{ name: string; target: { hash: string } }> {
    const response = await fetch(
      `${this.apiBaseUrl}/repositories/${workspace}/${repoSlug}/refs/branches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: branchName,
          target: { hash: targetCommit },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Bitbucket branch: ${error}`);
    }

    return response.json();
  }

  async createCommit(
    accessToken: string,
    workspace: string,
    repoSlug: string,
    branch: string,
    files: { path: string; content: string }[],
    message: string,
  ): Promise<{ hash: string }> {
    // Bitbucket uses form-data for commits
    const formData = new FormData();
    formData.append('message', message);
    formData.append('branch', branch);

    for (const file of files) {
      formData.append(file.path, new Blob([file.content]), file.path);
    }

    const response = await fetch(
      `${this.apiBaseUrl}/repositories/${workspace}/${repoSlug}/src`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Bitbucket commit: ${error}`);
    }

    // Get the latest commit to return its hash
    const mainBranch = await this.getMainBranch(
      accessToken,
      workspace,
      repoSlug,
    );
    return { hash: mainBranch?.target?.hash || 'unknown' };
  }

  async getFile(
    accessToken: string,
    workspace: string,
    repoSlug: string,
    filePath: string,
    ref: string = 'main',
  ): Promise<string> {
    const encodedPath = encodeURIComponent(filePath);

    const response = await fetch(
      `${this.apiBaseUrl}/repositories/${workspace}/${repoSlug}/src/${ref}/${encodedPath}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to get Bitbucket file');
    }

    return response.text();
  }

  async getBranches(
    accessToken: string,
    workspace: string,
    repoSlug: string,
  ): Promise<Array<{ name: string; target: { hash: string } }>> {
    const response = await fetch(
      `${this.apiBaseUrl}/repositories/${workspace}/${repoSlug}/refs/branches?pagelen=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to get Bitbucket branches');
    }

    const data = await response.json();
    return data.values || [];
  }

  async getMainBranch(
    accessToken: string,
    workspace: string,
    repoSlug: string,
  ): Promise<{ name: string; target: { hash: string } } | null> {
    const repo = await this.getRepository(accessToken, workspace, repoSlug);
    if (!repo.mainbranch) return null;

    const branches = await this.getBranches(accessToken, workspace, repoSlug);
    return branches.find((b) => b.name === repo.mainbranch!.name) || null;
  }

  async createPullRequest(
    accessToken: string,
    workspace: string,
    repoSlug: string,
    sourceBranch: string,
    destinationBranch: string,
    title: string,
    description?: string,
  ): Promise<{ id: number; links: { html: { href: string } } }> {
    const response = await fetch(
      `${this.apiBaseUrl}/repositories/${workspace}/${repoSlug}/pullrequests`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          source: { branch: { name: sourceBranch } },
          destination: { branch: { name: destinationBranch } },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Bitbucket pull request: ${error}`);
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
    const clientId = process.env.BITBUCKET_CLIENT_ID;
    if (!clientId) {
      throw new Error('Bitbucket OAuth not configured');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
    });

    return `${GIT_PROVIDER_CONFIG[GitProvider.BITBUCKET].authorizationUrl}?${params}`;
  }
}
