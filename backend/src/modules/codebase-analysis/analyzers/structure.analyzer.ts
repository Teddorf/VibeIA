import { Injectable } from '@nestjs/common';
import { TreeNode } from '../../git/dto/github.dto';
import { CodebaseStructure, EntryPoint } from '../dto/analysis-result.dto';

@Injectable()
export class StructureAnalyzer {
  analyze(tree: TreeNode[]): CodebaseStructure {
    const files = tree.filter((node) => node.type === 'file');
    const directories = tree.filter((node) => node.type === 'dir');

    // Get root-level items
    const rootFiles = files
      .filter((f) => !f.path.includes('/'))
      .map((f) => f.path);
    const rootDirs = directories
      .filter((d) => !d.path.includes('/'))
      .map((d) => d.path);

    // Detect monorepo patterns
    const isMonorepo = this.detectMonorepo(tree);

    // Detect frontend/backend
    const hasBackend = this.detectBackend(tree);
    const hasFrontend = this.detectFrontend(tree);

    // Find entry points
    const entryPoints = this.findEntryPoints(tree);

    return {
      hasBackend,
      hasFrontend,
      isMonorepo,
      directories: rootDirs,
      rootFiles,
      totalFiles: files.length,
      totalDirectories: directories.length,
      entryPoints,
    };
  }

  private detectMonorepo(tree: TreeNode[]): boolean {
    const paths = tree.map((t) => t.path);

    // Check for common monorepo patterns
    const monorepoIndicators = [
      'packages/',
      'apps/',
      'libs/',
      'services/',
      'workspaces/',
      'lerna.json',
      'pnpm-workspace.yaml',
      'turbo.json',
      'nx.json',
    ];

    const hasMonorepoIndicator = monorepoIndicators.some((indicator) =>
      paths.some((p) => p.startsWith(indicator) || p === indicator),
    );

    // Check for multiple package.json files
    const packageJsonCount = paths.filter(
      (p) => p.endsWith('package.json'),
    ).length;

    return hasMonorepoIndicator || packageJsonCount > 2;
  }

  private detectBackend(tree: TreeNode[]): boolean {
    const paths = tree.map((t) => t.path.toLowerCase());

    const backendIndicators = [
      'backend/',
      'server/',
      'api/',
      'src/main.ts', // NestJS
      'src/index.ts', // Node.js
      'app.py', // Python Flask/FastAPI
      'main.py',
      'manage.py', // Django
      'main.go', // Go
      'src/main/java/', // Java/Spring
      'Cargo.toml', // Rust
      'requirements.txt',
      'go.mod',
      'pom.xml',
      'build.gradle',
    ];

    return backendIndicators.some((indicator) =>
      paths.some((p) => p.includes(indicator.toLowerCase())),
    );
  }

  private detectFrontend(tree: TreeNode[]): boolean {
    const paths = tree.map((t) => t.path.toLowerCase());

    const frontendIndicators = [
      'frontend/',
      'client/',
      'web/',
      'src/app/', // Next.js/Angular
      'pages/', // Next.js
      'components/',
      'public/',
      'index.html',
      'angular.json',
      'next.config',
      'vite.config',
      'vue.config',
      'svelte.config',
      '.babelrc',
      'webpack.config',
    ];

    return frontendIndicators.some((indicator) =>
      paths.some((p) => p.includes(indicator.toLowerCase())),
    );
  }

  private findEntryPoints(tree: TreeNode[]): EntryPoint[] {
    const entryPoints: EntryPoint[] = [];
    const paths = tree.map((t) => t.path);

    // NestJS entry
    if (paths.some((p) => p.includes('src/main.ts'))) {
      const mainPath = paths.find((p) => p.includes('src/main.ts'));
      if (mainPath) {
        entryPoints.push({
          type: 'backend',
          path: mainPath,
          framework: 'NestJS',
        });
      }
    }

    // Next.js entry
    if (paths.some((p) => p.includes('next.config'))) {
      entryPoints.push({
        type: 'frontend',
        path: 'next.config.js',
        framework: 'Next.js',
      });
    }

    // React entry (Create React App)
    if (paths.some((p) => p === 'src/index.tsx' || p === 'src/index.jsx')) {
      const reactPath = paths.find(
        (p) => p === 'src/index.tsx' || p === 'src/index.jsx',
      );
      if (reactPath) {
        entryPoints.push({
          type: 'frontend',
          path: reactPath,
          framework: 'React',
        });
      }
    }

    // Vue entry
    if (paths.some((p) => p === 'src/main.js' || p === 'src/main.ts')) {
      if (paths.some((p) => p.includes('vue.config') || p.includes('.vue'))) {
        const vuePath = paths.find(
          (p) => p === 'src/main.js' || p === 'src/main.ts',
        );
        if (vuePath) {
          entryPoints.push({
            type: 'frontend',
            path: vuePath,
            framework: 'Vue',
          });
        }
      }
    }

    // Python entry
    if (paths.some((p) => p === 'app.py' || p === 'main.py')) {
      const pyPath = paths.find((p) => p === 'app.py' || p === 'main.py');
      if (pyPath) {
        entryPoints.push({
          type: 'backend',
          path: pyPath,
          framework: paths.some((p) => p.includes('requirements.txt'))
            ? 'Python'
            : undefined,
        });
      }
    }

    // Django entry
    if (paths.some((p) => p === 'manage.py')) {
      entryPoints.push({
        type: 'backend',
        path: 'manage.py',
        framework: 'Django',
      });
    }

    // Go entry
    if (paths.some((p) => p === 'main.go' || p === 'cmd/main.go')) {
      const goPath = paths.find((p) => p === 'main.go' || p === 'cmd/main.go');
      if (goPath) {
        entryPoints.push({
          type: 'backend',
          path: goPath,
          framework: 'Go',
        });
      }
    }

    return entryPoints;
  }
}
