import { Injectable } from '@nestjs/common';
import { TreeNode } from '../../git/dto/github.dto';
import { CodeQuality } from '../dto/analysis-result.dto';

@Injectable()
export class CodeQualityAnalyzer {
  analyze(tree: TreeNode[], packageJson?: Record<string, any>): CodeQuality {
    const paths = tree.map((t) => t.path);
    const allDeps = this.getAllDependencies(packageJson);

    return {
      hasLinting: this.detectLinting(paths, allDeps),
      lintConfig: this.detectLintConfig(paths),
      hasTypeScript: this.detectTypeScript(paths, allDeps),
      tsConfig: this.detectTsConfig(paths),
      hasTests: this.detectTests(paths),
      testFramework: this.detectTestFramework(allDeps),
      hasDocumentation: this.detectDocumentation(paths),
      hasReadme: paths.some((p) => p.toLowerCase() === 'readme.md'),
      hasContributing: paths.some(
        (p) => p.toLowerCase() === 'contributing.md',
      ),
      hasLicense: paths.some(
        (p) => p.toLowerCase() === 'license' || p.toLowerCase() === 'license.md',
      ),
      hasCI: this.detectCI(paths),
      ciPlatform: this.detectCIPlatform(paths),
    };
  }

  private detectLinting(paths: string[], deps: Record<string, string>): boolean {
    const lintFiles = [
      '.eslintrc',
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yml',
      'eslint.config.js',
      'eslint.config.mjs',
      '.prettierrc',
      '.prettierrc.js',
      '.prettierrc.json',
      'prettier.config.js',
      '.stylelintrc',
      '.pylintrc',
      'setup.cfg',
      '.rubocop.yml',
      '.golangci.yml',
    ];

    const hasLintConfig = paths.some((p) =>
      lintFiles.some((f) => p.toLowerCase().endsWith(f.toLowerCase())),
    );

    const hasLintDeps =
      deps['eslint'] ||
      deps['prettier'] ||
      deps['stylelint'] ||
      deps['tslint'] ||
      deps['biome'] ||
      deps['@biomejs/biome'];

    return hasLintConfig || !!hasLintDeps;
  }

  private detectLintConfig(paths: string[]): string | undefined {
    const configs: Record<string, string[]> = {
      ESLint: ['.eslintrc', 'eslint.config'],
      Prettier: ['.prettierrc', 'prettier.config'],
      Biome: ['biome.json'],
      Stylelint: ['.stylelintrc'],
      TSLint: ['tslint.json'],
      Pylint: ['.pylintrc'],
      RuboCop: ['.rubocop.yml'],
      GolangCI: ['.golangci.yml'],
    };

    for (const [tool, patterns] of Object.entries(configs)) {
      if (paths.some((p) => patterns.some((pattern) => p.includes(pattern)))) {
        return tool;
      }
    }

    return undefined;
  }

  private detectTypeScript(paths: string[], deps: Record<string, string>): boolean {
    const hasTsConfig = paths.some(
      (p) => p === 'tsconfig.json' || p.includes('tsconfig'),
    );
    const hasTsDeps = !!deps['typescript'];
    const hasTsFiles = paths.some((p) => p.endsWith('.ts') || p.endsWith('.tsx'));

    return hasTsConfig || hasTsDeps || hasTsFiles;
  }

  private detectTsConfig(paths: string[]): string | undefined {
    if (paths.some((p) => p === 'tsconfig.json')) {
      return 'tsconfig.json';
    }
    const tsConfig = paths.find((p) => p.includes('tsconfig') && p.endsWith('.json'));
    return tsConfig;
  }

  private detectTests(paths: string[]): boolean {
    const testIndicators = [
      '__tests__/',
      'test/',
      'tests/',
      'spec/',
      '.spec.',
      '.test.',
      '_test.go',
      '_test.py',
      'test_',
    ];

    return paths.some((p) =>
      testIndicators.some((indicator) => p.toLowerCase().includes(indicator)),
    );
  }

  private detectTestFramework(deps: Record<string, string>): string | undefined {
    const frameworks: Record<string, string[]> = {
      Jest: ['jest', '@jest/core'],
      Vitest: ['vitest'],
      Mocha: ['mocha'],
      Jasmine: ['jasmine'],
      AVA: ['ava'],
      Tape: ['tape'],
      Pytest: ['pytest'],
      Unittest: ['unittest'],
      RSpec: ['rspec'],
      JUnit: ['junit'],
      GoTest: ['testing'],
    };

    for (const [framework, packages] of Object.entries(frameworks)) {
      if (packages.some((pkg) => deps[pkg])) {
        return framework;
      }
    }

    return undefined;
  }

  private detectDocumentation(paths: string[]): boolean {
    const docIndicators = [
      'docs/',
      'documentation/',
      'doc/',
      'wiki/',
      'api-docs/',
      '.storybook/',
      'typedoc.json',
      'jsdoc.json',
    ];

    return paths.some((p) =>
      docIndicators.some((indicator) => p.toLowerCase().includes(indicator)),
    );
  }

  private detectCI(paths: string[]): boolean {
    const ciIndicators = [
      '.github/workflows/',
      '.gitlab-ci.yml',
      '.circleci/',
      'Jenkinsfile',
      '.travis.yml',
      'azure-pipelines.yml',
      'bitbucket-pipelines.yml',
      '.drone.yml',
      'cloudbuild.yaml',
    ];

    return paths.some((p) =>
      ciIndicators.some((indicator) => p.toLowerCase().includes(indicator.toLowerCase())),
    );
  }

  private detectCIPlatform(paths: string[]): string | undefined {
    const platforms: Record<string, string[]> = {
      'GitHub Actions': ['.github/workflows/'],
      'GitLab CI': ['.gitlab-ci.yml'],
      CircleCI: ['.circleci/'],
      Jenkins: ['Jenkinsfile'],
      'Travis CI': ['.travis.yml'],
      'Azure Pipelines': ['azure-pipelines.yml'],
      'Bitbucket Pipelines': ['bitbucket-pipelines.yml'],
      Drone: ['.drone.yml'],
      'Google Cloud Build': ['cloudbuild.yaml'],
    };

    for (const [platform, patterns] of Object.entries(platforms)) {
      if (paths.some((p) => patterns.some((pattern) => p.includes(pattern)))) {
        return platform;
      }
    }

    return undefined;
  }

  private getAllDependencies(packageJson?: Record<string, any>): Record<string, string> {
    if (!packageJson) return {};

    return {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
      ...(packageJson.peerDependencies || {}),
    };
  }
}
