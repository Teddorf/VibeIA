import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Delete,
  UnauthorizedException,
} from '@nestjs/common';
import { CodebaseAnalysisService } from './codebase-analysis.service';
import { UsersService } from '../users/users.service';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { CodebaseAnalysis } from './dto/analysis-result.dto';

@Controller('api/codebase-analysis')
export class CodebaseAnalysisController {
  constructor(
    private readonly analysisService: CodebaseAnalysisService,
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
   * POST /api/codebase-analysis/:owner/:repo
   * Analyze a repository and return comprehensive analysis
   */
  @Post(':owner/:repo')
  async analyzeRepository(
    @CurrentUser() user: CurrentUserData,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('branch') branch?: string,
  ): Promise<CodebaseAnalysis> {
    const accessToken = await this.getAccessToken(user.userId);
    return this.analysisService.analyzeRepository(owner, repo, accessToken, branch);
  }

  /**
   * GET /api/codebase-analysis/:owner/:repo
   * Get cached analysis for a repository (if available)
   * This is useful for quick lookups without re-analyzing
   */
  @Get(':owner/:repo')
  async getAnalysis(
    @CurrentUser() user: CurrentUserData,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('branch') branch?: string,
  ): Promise<CodebaseAnalysis> {
    const accessToken = await this.getAccessToken(user.userId);
    // This will return cached if available, or analyze if not
    return this.analysisService.analyzeRepository(owner, repo, accessToken, branch);
  }

  /**
   * DELETE /api/codebase-analysis/:owner/:repo/cache
   * Clear the cache for a specific repository
   */
  @Delete(':owner/:repo/cache')
  async clearCache(
    @CurrentUser() user: CurrentUserData,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
  ): Promise<{ message: string }> {
    // Verify user has GitHub connected (ownership verification would need additional logic)
    await this.getAccessToken(user.userId);
    this.analysisService.clearCache(owner, repo);
    return { message: `Cache cleared for ${owner}/${repo}` };
  }
}
