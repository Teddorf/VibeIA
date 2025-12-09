import { Injectable, NotFoundException } from '@nestjs/common';
import { GitService } from '../git/git.service';
import { StructureAnalyzer } from './analyzers/structure.analyzer';
import { TechStackAnalyzer } from './analyzers/tech-stack.analyzer';
import { DependenciesAnalyzer } from './analyzers/dependencies.analyzer';
import { CodeQualityAnalyzer } from './analyzers/code-quality.analyzer';
import { CodebaseAnalysis } from './dto/analysis-result.dto';

@Injectable()
export class CodebaseAnalysisService {
  // Simple in-memory cache (in production, use Redis)
  private cache: Map<string, { analysis: CodebaseAnalysis; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly gitService: GitService,
    private readonly structureAnalyzer: StructureAnalyzer,
    private readonly techStackAnalyzer: TechStackAnalyzer,
    private readonly dependenciesAnalyzer: DependenciesAnalyzer,
    private readonly codeQualityAnalyzer: CodeQualityAnalyzer,
  ) {}

  async analyzeRepository(
    owner: string,
    repo: string,
    accessToken: string,
    branch?: string,
  ): Promise<CodebaseAnalysis> {
    // Check cache first
    const cacheKey = `${owner}/${repo}/${branch || 'default'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.analysis;
    }

    // Get repository info
    const repoInfo = await this.gitService.getRepository(owner, repo, accessToken);
    const targetBranch = branch || repoInfo.default_branch;

    // Get repository tree
    const treeResult = await this.gitService.getRepositoryTree(
      owner,
      repo,
      accessToken,
      targetBranch,
    );

    // Fetch key configuration files
    const packageJson = await this.fetchJsonFile(
      owner,
      repo,
      'package.json',
      accessToken,
      targetBranch,
    );
    const requirementsTxt = await this.fetchTextFile(
      owner,
      repo,
      'requirements.txt',
      accessToken,
      targetBranch,
    );
    const goMod = await this.fetchTextFile(
      owner,
      repo,
      'go.mod',
      accessToken,
      targetBranch,
    );
    const cargoToml = await this.fetchTextFile(
      owner,
      repo,
      'Cargo.toml',
      accessToken,
      targetBranch,
    );

    // Run all analyzers
    const structure = this.structureAnalyzer.analyze(treeResult.tree);
    const techStack = this.techStackAnalyzer.analyze(
      treeResult.tree,
      packageJson,
      requirementsTxt,
      goMod,
    );
    const dependencies = this.dependenciesAnalyzer.analyze(
      packageJson,
      requirementsTxt,
      goMod,
      cargoToml,
    );
    const codeQuality = this.codeQualityAnalyzer.analyze(treeResult.tree, packageJson);

    // Generate suggestions based on analysis
    const suggestions = this.generateSuggestions(structure, techStack, codeQuality);

    const analysis: CodebaseAnalysis = {
      structure,
      techStack,
      dependencies,
      codeQuality,
      suggestions,
      analyzedAt: new Date(),
      repositoryInfo: {
        owner,
        repo,
        branch: targetBranch,
        defaultBranch: repoInfo.default_branch,
      },
    };

    // Cache the result
    this.cache.set(cacheKey, {
      analysis,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return analysis;
  }

  private async fetchJsonFile(
    owner: string,
    repo: string,
    path: string,
    accessToken: string,
    branch?: string,
  ): Promise<Record<string, any> | undefined> {
    try {
      const content = await this.gitService.getFileContent(
        owner,
        repo,
        path,
        accessToken,
        branch,
      );
      return JSON.parse(content.content);
    } catch {
      return undefined;
    }
  }

  private async fetchTextFile(
    owner: string,
    repo: string,
    path: string,
    accessToken: string,
    branch?: string,
  ): Promise<string | undefined> {
    try {
      const content = await this.gitService.getFileContent(
        owner,
        repo,
        path,
        accessToken,
        branch,
      );
      return content.content;
    } catch {
      return undefined;
    }
  }

  private generateSuggestions(
    structure: CodebaseAnalysis['structure'],
    techStack: CodebaseAnalysis['techStack'],
    codeQuality: CodebaseAnalysis['codeQuality'],
  ): string[] {
    const suggestions: string[] = [];

    // Code quality suggestions
    if (!codeQuality.hasLinting) {
      suggestions.push(
        'Add linting configuration (ESLint, Prettier) to maintain code consistency',
      );
    }

    if (!codeQuality.hasTypeScript && techStack.languages.some((l) => l.name === 'JavaScript')) {
      suggestions.push(
        'Consider migrating to TypeScript for better type safety and developer experience',
      );
    }

    if (!codeQuality.hasTests) {
      suggestions.push(
        'Add unit tests to improve code reliability and enable safe refactoring',
      );
    }

    if (!codeQuality.hasCI) {
      suggestions.push(
        'Set up CI/CD pipeline (GitHub Actions recommended) for automated testing and deployment',
      );
    }

    if (!codeQuality.hasReadme) {
      suggestions.push(
        'Add a README.md with project description, setup instructions, and usage examples',
      );
    }

    if (!codeQuality.hasLicense) {
      suggestions.push(
        'Add a LICENSE file to clearly define how others can use your code',
      );
    }

    // Architecture suggestions
    if (structure.hasBackend && structure.hasFrontend && !structure.isMonorepo) {
      suggestions.push(
        'Consider organizing as a monorepo for better code sharing between frontend and backend',
      );
    }

    // Database suggestions
    if (techStack.databases.length === 0 && structure.hasBackend) {
      suggestions.push(
        'No database detected. Consider adding a database for data persistence',
      );
    }

    // Security suggestions
    if (
      techStack.frameworks.some((f) => f.name === 'Express') &&
      !structure.rootFiles.some((f) => f.includes('helmet') || f.includes('cors'))
    ) {
      suggestions.push(
        'Consider adding security middleware (helmet, cors) for Express applications',
      );
    }

    return suggestions;
  }

  // Clear cache for a specific repository (useful when repo is updated)
  clearCache(owner: string, repo: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${owner}/${repo}/`)) {
        this.cache.delete(key);
      }
    }
  }

  // Clear all expired cache entries
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }
}
