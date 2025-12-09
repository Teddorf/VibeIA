import { Injectable } from '@nestjs/common';
import { TreeNode, FileContent } from '../../git/dto/github.dto';
import { TechStack, LanguageInfo, FrameworkInfo } from '../dto/analysis-result.dto';

// Language extensions mapping
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  py: 'Python',
  go: 'Go',
  rs: 'Rust',
  java: 'Java',
  kt: 'Kotlin',
  rb: 'Ruby',
  php: 'PHP',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  swift: 'Swift',
  scala: 'Scala',
  vue: 'Vue',
  svelte: 'Svelte',
};

// Framework detection patterns
const FRAMEWORK_PATTERNS: Array<{
  name: string;
  type: FrameworkInfo['type'];
  indicators: string[];
}> = [
  // Frontend
  { name: 'Next.js', type: 'frontend', indicators: ['next.config.js', 'next.config.mjs', 'next.config.ts', '.next/'] },
  { name: 'React', type: 'frontend', indicators: ['react', 'react-dom'] },
  { name: 'Vue.js', type: 'frontend', indicators: ['vue', 'vue.config.js', '.vue'] },
  { name: 'Angular', type: 'frontend', indicators: ['angular.json', '@angular/core'] },
  { name: 'Svelte', type: 'frontend', indicators: ['svelte.config.js', 'svelte'] },
  { name: 'Nuxt', type: 'fullstack', indicators: ['nuxt.config.js', 'nuxt.config.ts'] },
  { name: 'Remix', type: 'fullstack', indicators: ['remix.config.js', '@remix-run'] },
  { name: 'Astro', type: 'frontend', indicators: ['astro.config.mjs', 'astro'] },

  // Backend
  { name: 'NestJS', type: 'backend', indicators: ['@nestjs/core', 'nest-cli.json'] },
  { name: 'Express', type: 'backend', indicators: ['express'] },
  { name: 'Fastify', type: 'backend', indicators: ['fastify'] },
  { name: 'Koa', type: 'backend', indicators: ['koa'] },
  { name: 'Hono', type: 'backend', indicators: ['hono'] },
  { name: 'Django', type: 'backend', indicators: ['django', 'manage.py'] },
  { name: 'Flask', type: 'backend', indicators: ['flask'] },
  { name: 'FastAPI', type: 'backend', indicators: ['fastapi'] },
  { name: 'Spring Boot', type: 'backend', indicators: ['spring-boot', 'spring-boot-starter'] },
  { name: 'Rails', type: 'backend', indicators: ['rails', 'Gemfile'] },
  { name: 'Laravel', type: 'backend', indicators: ['laravel', 'artisan'] },
  { name: 'Gin', type: 'backend', indicators: ['gin-gonic/gin'] },
  { name: 'Echo', type: 'backend', indicators: ['labstack/echo'] },
  { name: 'Fiber', type: 'backend', indicators: ['gofiber/fiber'] },
  { name: 'Actix', type: 'backend', indicators: ['actix-web'] },
  { name: 'Rocket', type: 'backend', indicators: ['rocket'] },

  // Testing
  { name: 'Jest', type: 'testing', indicators: ['jest', 'jest.config'] },
  { name: 'Vitest', type: 'testing', indicators: ['vitest'] },
  { name: 'Mocha', type: 'testing', indicators: ['mocha'] },
  { name: 'Pytest', type: 'testing', indicators: ['pytest'] },
  { name: 'JUnit', type: 'testing', indicators: ['junit'] },
  { name: 'RSpec', type: 'testing', indicators: ['rspec'] },
  { name: 'Cypress', type: 'testing', indicators: ['cypress'] },
  { name: 'Playwright', type: 'testing', indicators: ['playwright'] },

  // Build tools
  { name: 'Webpack', type: 'build', indicators: ['webpack.config'] },
  { name: 'Vite', type: 'build', indicators: ['vite.config'] },
  { name: 'Rollup', type: 'build', indicators: ['rollup.config'] },
  { name: 'esbuild', type: 'build', indicators: ['esbuild'] },
  { name: 'Turbopack', type: 'build', indicators: ['turbopack'] },
];

const DATABASE_INDICATORS: Record<string, string[]> = {
  PostgreSQL: ['pg', 'postgres', 'postgresql', 'prisma', '@prisma/client'],
  MySQL: ['mysql', 'mysql2'],
  MongoDB: ['mongodb', 'mongoose', '@nestjs/mongoose'],
  Redis: ['redis', 'ioredis'],
  SQLite: ['sqlite', 'sqlite3', 'better-sqlite3'],
  Supabase: ['supabase', '@supabase/supabase-js'],
  Firebase: ['firebase', 'firebase-admin'],
  DynamoDB: ['@aws-sdk/client-dynamodb', 'dynamodb'],
  Cassandra: ['cassandra-driver'],
  Elasticsearch: ['elasticsearch', '@elastic/elasticsearch'],
};

@Injectable()
export class TechStackAnalyzer {
  analyze(
    tree: TreeNode[],
    packageJson?: Record<string, any>,
    requirementsTxt?: string,
    goMod?: string,
  ): TechStack {
    const files = tree.filter((node) => node.type === 'file');
    const paths = tree.map((t) => t.path);

    return {
      languages: this.detectLanguages(files),
      frameworks: this.detectFrameworks(paths, packageJson),
      databases: this.detectDatabases(packageJson, requirementsTxt),
      testing: this.detectTestingTools(paths, packageJson),
      buildTools: this.detectBuildTools(paths, packageJson),
      packageManagers: this.detectPackageManagers(paths),
      cicd: this.detectCICD(paths),
    };
  }

  private detectLanguages(files: TreeNode[]): LanguageInfo[] {
    const languageCounts: Record<string, number> = {};
    let totalCodeFiles = 0;

    for (const file of files) {
      const ext = file.path.split('.').pop()?.toLowerCase();
      if (ext && LANGUAGE_EXTENSIONS[ext]) {
        const language = LANGUAGE_EXTENSIONS[ext];
        languageCounts[language] = (languageCounts[language] || 0) + 1;
        totalCodeFiles++;
      }
    }

    return Object.entries(languageCounts)
      .map(([name, count]) => ({
        name,
        files: count,
        percentage: Math.round((count / totalCodeFiles) * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  private detectFrameworks(
    paths: string[],
    packageJson?: Record<string, any>,
  ): FrameworkInfo[] {
    const frameworks: FrameworkInfo[] = [];
    const allDeps = this.getAllDependencies(packageJson);

    for (const pattern of FRAMEWORK_PATTERNS) {
      let confidence = 0;
      let version: string | undefined;

      for (const indicator of pattern.indicators) {
        // Check file paths
        if (paths.some((p) => p.toLowerCase().includes(indicator.toLowerCase()))) {
          confidence += 40;
        }

        // Check dependencies
        if (allDeps[indicator]) {
          confidence += 60;
          version = allDeps[indicator];
        }
      }

      if (confidence > 0) {
        frameworks.push({
          name: pattern.name,
          type: pattern.type,
          version,
          confidence: Math.min(confidence, 100),
        });
      }
    }

    return frameworks
      .filter((f) => f.confidence >= 40)
      .sort((a, b) => b.confidence - a.confidence);
  }

  private detectDatabases(
    packageJson?: Record<string, any>,
    requirementsTxt?: string,
  ): string[] {
    const databases: Set<string> = new Set();
    const allDeps = this.getAllDependencies(packageJson);

    for (const [db, indicators] of Object.entries(DATABASE_INDICATORS)) {
      for (const indicator of indicators) {
        if (allDeps[indicator]) {
          databases.add(db);
          break;
        }
        if (requirementsTxt?.toLowerCase().includes(indicator.toLowerCase())) {
          databases.add(db);
          break;
        }
      }
    }

    return Array.from(databases);
  }

  private detectTestingTools(
    paths: string[],
    packageJson?: Record<string, any>,
  ): string[] {
    const testingTools: Set<string> = new Set();
    const allDeps = this.getAllDependencies(packageJson);

    const testPatterns: Record<string, string[]> = {
      Jest: ['jest', '@jest/core'],
      Vitest: ['vitest'],
      Mocha: ['mocha'],
      Chai: ['chai'],
      Cypress: ['cypress'],
      Playwright: ['@playwright/test', 'playwright'],
      'Testing Library': ['@testing-library/react', '@testing-library/vue'],
      Supertest: ['supertest'],
    };

    for (const [tool, deps] of Object.entries(testPatterns)) {
      if (deps.some((dep) => allDeps[dep])) {
        testingTools.add(tool);
      }
    }

    // Check for test directories
    if (paths.some((p) => p.includes('__tests__') || p.includes('.spec.') || p.includes('.test.'))) {
      if (testingTools.size === 0) {
        testingTools.add('Unknown');
      }
    }

    return Array.from(testingTools);
  }

  private detectBuildTools(
    paths: string[],
    packageJson?: Record<string, any>,
  ): string[] {
    const buildTools: Set<string> = new Set();
    const allDeps = this.getAllDependencies(packageJson);

    const buildPatterns: Record<string, string[]> = {
      Webpack: ['webpack'],
      Vite: ['vite'],
      Rollup: ['rollup'],
      esbuild: ['esbuild'],
      Parcel: ['parcel'],
      Turbopack: ['@vercel/turbopack'],
      tsc: ['typescript'],
      Babel: ['@babel/core'],
      SWC: ['@swc/core'],
    };

    for (const [tool, deps] of Object.entries(buildPatterns)) {
      if (deps.some((dep) => allDeps[dep])) {
        buildTools.add(tool);
      }
    }

    // Check config files
    if (paths.some((p) => p.includes('webpack.config'))) buildTools.add('Webpack');
    if (paths.some((p) => p.includes('vite.config'))) buildTools.add('Vite');
    if (paths.some((p) => p.includes('rollup.config'))) buildTools.add('Rollup');

    return Array.from(buildTools);
  }

  private detectPackageManagers(paths: string[]): string[] {
    const managers: Set<string> = new Set();

    if (paths.some((p) => p === 'package-lock.json')) managers.add('npm');
    if (paths.some((p) => p === 'yarn.lock')) managers.add('yarn');
    if (paths.some((p) => p === 'pnpm-lock.yaml')) managers.add('pnpm');
    if (paths.some((p) => p === 'bun.lockb')) managers.add('bun');
    if (paths.some((p) => p === 'requirements.txt' || p === 'Pipfile')) managers.add('pip');
    if (paths.some((p) => p === 'poetry.lock')) managers.add('poetry');
    if (paths.some((p) => p === 'go.mod')) managers.add('go modules');
    if (paths.some((p) => p === 'Cargo.lock')) managers.add('cargo');
    if (paths.some((p) => p === 'Gemfile.lock')) managers.add('bundler');
    if (paths.some((p) => p === 'composer.lock')) managers.add('composer');

    return Array.from(managers);
  }

  private detectCICD(paths: string[]): string[] {
    const cicd: Set<string> = new Set();

    if (paths.some((p) => p.startsWith('.github/workflows/'))) cicd.add('GitHub Actions');
    if (paths.some((p) => p === '.gitlab-ci.yml')) cicd.add('GitLab CI');
    if (paths.some((p) => p === '.circleci/config.yml')) cicd.add('CircleCI');
    if (paths.some((p) => p === 'Jenkinsfile')) cicd.add('Jenkins');
    if (paths.some((p) => p === '.travis.yml')) cicd.add('Travis CI');
    if (paths.some((p) => p === 'azure-pipelines.yml')) cicd.add('Azure Pipelines');
    if (paths.some((p) => p === 'bitbucket-pipelines.yml')) cicd.add('Bitbucket Pipelines');
    if (paths.some((p) => p === 'vercel.json' || p === '.vercel/')) cicd.add('Vercel');
    if (paths.some((p) => p === 'netlify.toml')) cicd.add('Netlify');
    if (paths.some((p) => p === 'render.yaml')) cicd.add('Render');

    return Array.from(cicd);
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
