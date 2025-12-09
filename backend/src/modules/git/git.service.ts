import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import {
  GitHubRepository,
  RepositoryDetails,
  TreeNode,
  FileContent,
  BranchInfo,
  ListReposResponse,
  RepoTreeResponse,
} from './dto/github.dto';

@Injectable()
export class GitService {
  private defaultOctokit: Octokit;

  constructor() {
    // Default Octokit for server-level operations (if configured)
    if (process.env.GITHUB_ACCESS_TOKEN) {
      this.defaultOctokit = new Octokit({
        auth: process.env.GITHUB_ACCESS_TOKEN,
      });
    }
  }

  /**
   * Create an Octokit instance with user's access token
   */
  private getOctokitForUser(accessToken: string): Octokit {
    if (!accessToken) {
      throw new UnauthorizedException('GitHub access token is required');
    }
    return new Octokit({ auth: accessToken });
  }

  /**
   * List all repositories for the authenticated user
   */
  async listUserRepos(accessToken: string): Promise<ListReposResponse> {
    const octokit = this.getOctokitForUser(accessToken);

    try {
      const repos: GitHubRepository[] = [];
      let page = 1;
      const perPage = 100;

      // Paginate through all repos
      while (true) {
        const { data } = await octokit.repos.listForAuthenticatedUser({
          sort: 'updated',
          direction: 'desc',
          per_page: perPage,
          page,
          affiliation: 'owner,collaborator,organization_member',
        });

        if (data.length === 0) break;

        repos.push(
          ...data.map((repo) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            private: repo.private,
            default_branch: repo.default_branch,
            language: repo.language,
            html_url: repo.html_url,
            clone_url: repo.clone_url,
            updated_at: repo.updated_at,
            pushed_at: repo.pushed_at,
            size: repo.size,
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count,
            open_issues_count: repo.open_issues_count,
            owner: {
              login: repo.owner.login,
              avatar_url: repo.owner.avatar_url,
            },
          })),
        );

        if (data.length < perPage) break;
        page++;
      }

      return {
        repositories: repos,
        total: repos.length,
      };
    } catch (error: any) {
      if (error.status === 401) {
        throw new UnauthorizedException('GitHub token is invalid or expired');
      }
      throw error;
    }
  }

  /**
   * Get detailed information about a specific repository
   */
  async getRepository(
    owner: string,
    repo: string,
    accessToken: string,
  ): Promise<RepositoryDetails> {
    const octokit = this.getOctokitForUser(accessToken);

    try {
      const { data } = await octokit.repos.get({ owner, repo });

      return {
        id: data.id,
        name: data.name,
        full_name: data.full_name,
        description: data.description,
        private: data.private,
        default_branch: data.default_branch,
        language: data.language,
        html_url: data.html_url,
        clone_url: data.clone_url,
        updated_at: data.updated_at,
        pushed_at: data.pushed_at,
        size: data.size,
        stargazers_count: data.stargazers_count,
        forks_count: data.forks_count,
        open_issues_count: data.open_issues_count,
        owner: {
          login: data.owner.login,
          avatar_url: data.owner.avatar_url,
        },
        topics: data.topics || [],
        has_wiki: data.has_wiki,
        has_issues: data.has_issues,
        has_projects: data.has_projects,
        license: data.license
          ? { key: data.license.key, name: data.license.name }
          : null,
      };
    } catch (error: any) {
      if (error.status === 404) {
        throw new NotFoundException(`Repository ${owner}/${repo} not found`);
      }
      if (error.status === 401) {
        throw new UnauthorizedException('GitHub token is invalid or expired');
      }
      throw error;
    }
  }

  /**
   * Get the file tree structure of a repository
   */
  async getRepositoryTree(
    owner: string,
    repo: string,
    accessToken: string,
    branch?: string,
  ): Promise<RepoTreeResponse> {
    const octokit = this.getOctokitForUser(accessToken);

    try {
      // Get default branch if not specified
      let targetBranch = branch;
      if (!targetBranch) {
        const { data: repoData } = await octokit.repos.get({ owner, repo });
        targetBranch = repoData.default_branch;
      }

      // Get the tree recursively
      const { data } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: targetBranch,
        recursive: 'true',
      });

      const tree: TreeNode[] = data.tree.map((item) => ({
        path: item.path,
        type: item.type === 'blob' ? 'file' : 'dir',
        size: item.size,
        sha: item.sha,
      }));

      return {
        tree,
        truncated: data.truncated,
        sha: data.sha,
      };
    } catch (error: any) {
      if (error.status === 404) {
        throw new NotFoundException(
          `Repository ${owner}/${repo} or branch not found`,
        );
      }
      if (error.status === 401) {
        throw new UnauthorizedException('GitHub token is invalid or expired');
      }
      throw error;
    }
  }

  /**
   * Get the content of a specific file
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    accessToken: string,
    branch?: string,
  ): Promise<FileContent> {
    const octokit = this.getOctokitForUser(accessToken);

    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      // Ensure it's a file, not a directory
      if (Array.isArray(data)) {
        throw new BadRequestException(`Path ${path} is a directory, not a file`);
      }

      if (data.type !== 'file') {
        throw new BadRequestException(`Path ${path} is not a file`);
      }

      // Decode base64 content
      const content =
        data.encoding === 'base64'
          ? Buffer.from(data.content, 'base64').toString('utf-8')
          : data.content;

      return {
        content,
        encoding: data.encoding,
        size: data.size,
        sha: data.sha,
        path: data.path,
      };
    } catch (error: any) {
      if (error.status === 404) {
        throw new NotFoundException(`File ${path} not found in ${owner}/${repo}`);
      }
      if (error.status === 401) {
        throw new UnauthorizedException('GitHub token is invalid or expired');
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Search repositories for the authenticated user
   */
  async searchRepos(
    query: string,
    accessToken: string,
    options?: { language?: string; includePrivate?: boolean },
  ): Promise<ListReposResponse> {
    const octokit = this.getOctokitForUser(accessToken);

    try {
      // Get authenticated user
      const { data: user } = await octokit.users.getAuthenticated();

      // Build search query
      let searchQuery = `${query} user:${user.login}`;
      if (options?.language) {
        searchQuery += ` language:${options.language}`;
      }

      const { data } = await octokit.search.repos({
        q: searchQuery,
        sort: 'updated',
        order: 'desc',
        per_page: 50,
      });

      const repos: GitHubRepository[] = data.items
        .filter((repo) => (options?.includePrivate ? true : !repo.private))
        .filter((repo): repo is typeof repo & { owner: NonNullable<typeof repo.owner> } => repo.owner !== null)
        .map((repo) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          private: repo.private,
          default_branch: repo.default_branch,
          language: repo.language,
          html_url: repo.html_url,
          clone_url: repo.clone_url,
          updated_at: repo.updated_at,
          pushed_at: repo.pushed_at,
          size: repo.size,
          stargazers_count: repo.stargazers_count,
          forks_count: repo.forks_count,
          open_issues_count: repo.open_issues_count,
          owner: {
            login: repo.owner.login,
            avatar_url: repo.owner.avatar_url,
          },
        }));

      return {
        repositories: repos,
        total: repos.length,
      };
    } catch (error: any) {
      if (error.status === 401) {
        throw new UnauthorizedException('GitHub token is invalid or expired');
      }
      throw error;
    }
  }

  /**
   * List branches for a repository
   */
  async listBranches(
    owner: string,
    repo: string,
    accessToken: string,
  ): Promise<BranchInfo[]> {
    const octokit = this.getOctokitForUser(accessToken);

    try {
      const { data } = await octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      return data.map((branch) => ({
        name: branch.name,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url,
        },
        protected: branch.protected,
      }));
    } catch (error: any) {
      if (error.status === 404) {
        throw new NotFoundException(`Repository ${owner}/${repo} not found`);
      }
      if (error.status === 401) {
        throw new UnauthorizedException('GitHub token is invalid or expired');
      }
      throw error;
    }
  }

  /**
   * Verify if a GitHub access token is valid
   */
  async verifyToken(accessToken: string): Promise<{ valid: boolean; username?: string; scopes?: string[] }> {
    try {
      const octokit = this.getOctokitForUser(accessToken);
      const { data, headers } = await octokit.users.getAuthenticated();

      // Extract scopes from headers
      const scopes = headers['x-oauth-scopes']?.split(', ') || [];

      return {
        valid: true,
        username: data.login,
        scopes,
      };
    } catch (error: any) {
      return {
        valid: false,
      };
    }
  }

  // ============================================
  // Legacy methods (using server-level token)
  // These methods are used for creating new repos
  // ============================================

  /**
   * Get Octokit instance - uses default token or user token
   */
  private getOctokit(userAccessToken?: string): Octokit {
    if (userAccessToken) {
      return new Octokit({ auth: userAccessToken });
    }
    if (!this.defaultOctokit) {
      throw new UnauthorizedException('No GitHub access token configured');
    }
    return this.defaultOctokit;
  }

  async createRepository(name: string, description: string, privateRepo = true, userAccessToken?: string) {
    const octokit = this.getOctokit(userAccessToken);
    try {
      const response = await octokit.repos.createForAuthenticatedUser({
        name,
        description,
        private: privateRepo,
        auto_init: true, // Initialize with README
      });
      return response.data;
    } catch (error) {
      console.error('Error creating repository:', error);
      throw error;
    }
  }

  async createBranch(owner: string, repo: string, branchName: string, fromBranch = 'main', userAccessToken?: string) {
    const octokit = this.getOctokit(userAccessToken);
    try {
      // Get SHA of fromBranch
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${fromBranch}`,
      });

      // Create new branch
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      });

      return { success: true, branch: branchName };
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }

  async createCommit(
    owner: string,
    repo: string,
    branch: string,
    files: { path: string; content: string }[],
    message: string,
    userAccessToken?: string,
  ) {
    const octokit = this.getOctokit(userAccessToken);
    try {
      // 1. Get current commit SHA
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      const latestCommitSha = refData.object.sha;

      // 2. Get tree SHA
      const { data: commitData } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: latestCommitSha,
      });
      const baseTreeSha = commitData.tree.sha;

      // 3. Create blobs for each file
      const treeItems: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
      for (const file of files) {
        const { data: blobData } = await octokit.git.createBlob({
          owner,
          repo,
          content: file.content,
          encoding: 'utf-8',
        });

        treeItems.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        });
      }

      // 4. Create new tree
      const { data: treeData } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: baseTreeSha,
        tree: treeItems,
      });

      // 5. Create commit
      const { data: newCommitData } = await octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: treeData.sha,
        parents: [latestCommitSha],
      });

      // 6. Update reference
      await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommitData.sha,
      });

      return newCommitData;
    } catch (error) {
      console.error('Error creating commit:', error);
      throw error;
    }
  }
}