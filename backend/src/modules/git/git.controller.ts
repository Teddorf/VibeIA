import {
  Controller,
  Get,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { GitService } from './git.service';
import { UsersService } from '../users/users.service';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import {
  ListReposResponse,
  RepositoryDetails,
  RepoTreeResponse,
  FileContent,
  BranchInfo,
} from './dto/github.dto';

@Controller('git')
export class GitController {
  constructor(
    private readonly gitService: GitService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Helper to get user's GitHub access token
   */
  private async getAccessToken(userId: string): Promise<string> {
    const token = await this.usersService.getGitHubAccessToken(userId);
    if (!token) {
      throw new UnauthorizedException(
        'GitHub not connected. Please connect your GitHub account first.',
      );
    }
    return token;
  }

  /**
   * GET /api/git/repos
   * List all repositories for the authenticated user
   */
  @Get('repos')
  async listRepos(@CurrentUser() user: CurrentUserData): Promise<ListReposResponse> {
    const accessToken = await this.getAccessToken(user.userId);
    return this.gitService.listUserRepos(accessToken);
  }

  /**
   * GET /api/git/repos/search
   * Search repositories for the authenticated user
   */
  @Get('repos/search')
  async searchRepos(
    @CurrentUser() user: CurrentUserData,
    @Query('q') query: string,
    @Query('language') language?: string,
  ): Promise<ListReposResponse> {
    if (!query || query.trim().length === 0) {
      throw new UnauthorizedException('Search query is required');
    }

    const accessToken = await this.getAccessToken(user.userId);
    return this.gitService.searchRepos(query, accessToken, {
      language,
      includePrivate: true,
    });
  }

  /**
   * GET /api/git/repos/:owner/:repo
   * Get details of a specific repository
   */
  @Get('repos/:owner/:repo')
  async getRepository(
    @CurrentUser() user: CurrentUserData,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
  ): Promise<RepositoryDetails> {
    const accessToken = await this.getAccessToken(user.userId);
    return this.gitService.getRepository(owner, repo, accessToken);
  }

  /**
   * GET /api/git/repos/:owner/:repo/tree
   * Get the file tree structure of a repository
   */
  @Get('repos/:owner/:repo/tree')
  async getRepositoryTree(
    @CurrentUser() user: CurrentUserData,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('branch') branch?: string,
  ): Promise<RepoTreeResponse> {
    const accessToken = await this.getAccessToken(user.userId);
    return this.gitService.getRepositoryTree(owner, repo, accessToken, branch);
  }

  /**
   * GET /api/git/repos/:owner/:repo/branches
   * List all branches of a repository
   */
  @Get('repos/:owner/:repo/branches')
  async listBranches(
    @CurrentUser() user: CurrentUserData,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
  ): Promise<BranchInfo[]> {
    const accessToken = await this.getAccessToken(user.userId);
    return this.gitService.listBranches(owner, repo, accessToken);
  }

  /**
   * GET /api/git/repos/:owner/:repo/contents/*
   * Get the content of a specific file
   * The path is captured as a wildcard to support nested paths
   */
  @Get('repos/:owner/:repo/contents/*')
  async getFileContent(
    @CurrentUser() user: CurrentUserData,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('*') path: string,
    @Query('branch') branch?: string,
  ): Promise<FileContent> {
    const accessToken = await this.getAccessToken(user.userId);
    return this.gitService.getFileContent(owner, repo, path, accessToken, branch);
  }
}
