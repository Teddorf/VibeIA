import { Injectable } from '@nestjs/common';
import { GitService } from '../../modules/git/git.service';
import {
  IGitHostProvider,
  IGitHostRepo,
  IGitHostTreeNode,
  IGitHostFileContent,
  IGitHostBranch,
} from '../interfaces/git-host-provider.interface';

@Injectable()
export class GitHubHostAdapter implements IGitHostProvider {
  constructor(private readonly gitService: GitService) {}

  async listRepos(accessToken: string): Promise<IGitHostRepo[]> {
    const result = await this.gitService.listUserRepos(accessToken);
    return result.repositories.map((r) => this.mapRepo(r));
  }

  async getRepo(
    owner: string,
    repo: string,
    accessToken: string,
  ): Promise<IGitHostRepo> {
    const details = await this.gitService.getRepository(
      owner,
      repo,
      accessToken,
    );
    return this.mapRepo(details);
  }

  async getTree(
    owner: string,
    repo: string,
    accessToken: string,
    branch?: string,
  ): Promise<{ tree: IGitHostTreeNode[]; truncated: boolean; sha: string }> {
    const result = await this.gitService.getRepositoryTree(
      owner,
      repo,
      accessToken,
      branch,
    );
    return {
      tree: result.tree.map((node) => ({
        path: node.path,
        type: node.type as 'file' | 'dir',
        size: node.size,
        sha: node.sha,
      })),
      truncated: result.truncated,
      sha: result.sha,
    };
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    accessToken: string,
    branch?: string,
  ): Promise<IGitHostFileContent> {
    const content = await this.gitService.getFileContent(
      owner,
      repo,
      path,
      accessToken,
      branch,
    );
    return {
      content: content.content,
      encoding: content.encoding,
      size: content.size,
      sha: content.sha,
      path: content.path,
    };
  }

  async listBranches(
    owner: string,
    repo: string,
    accessToken: string,
  ): Promise<IGitHostBranch[]> {
    const branches = await this.gitService.listBranches(
      owner,
      repo,
      accessToken,
    );
    return branches.map((b) => ({
      name: b.name,
      commit: { sha: b.commit.sha, url: b.commit.url },
      protected: b.protected,
    }));
  }

  async createRepo(
    name: string,
    description: string,
    isPrivate: boolean,
    accessToken?: string,
  ): Promise<IGitHostRepo> {
    const repo = await this.gitService.createRepository(
      name,
      description,
      isPrivate,
      accessToken,
    );
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      defaultBranch: repo.default_branch,
      language: repo.language,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      updatedAt: repo.updated_at,
      size: repo.size,
      owner: {
        login: repo.owner.login,
        avatarUrl: repo.owner.avatar_url,
      },
    };
  }

  private mapRepo(r: any): IGitHostRepo {
    return {
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      private: r.private,
      defaultBranch: r.default_branch,
      language: r.language,
      htmlUrl: r.html_url,
      cloneUrl: r.clone_url,
      updatedAt: r.updated_at,
      size: r.size,
      owner: {
        login: r.owner?.login,
        avatarUrl: r.owner?.avatar_url,
      },
    };
  }
}
