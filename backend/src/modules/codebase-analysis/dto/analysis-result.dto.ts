// Main analysis result interface
export interface CodebaseAnalysis {
  structure: CodebaseStructure;
  techStack: TechStack;
  dependencies: DependencyInfo;
  codeQuality: CodeQuality;
  suggestions: string[];
  analyzedAt: Date;
  repositoryInfo: {
    owner: string;
    repo: string;
    branch: string;
    defaultBranch: string;
  };
}

export interface CodebaseStructure {
  hasBackend: boolean;
  hasFrontend: boolean;
  isMonorepo: boolean;
  directories: string[];
  rootFiles: string[];
  totalFiles: number;
  totalDirectories: number;
  entryPoints: EntryPoint[];
}

export interface EntryPoint {
  type: 'backend' | 'frontend' | 'library' | 'script';
  path: string;
  framework?: string;
}

export interface TechStack {
  languages: LanguageInfo[];
  frameworks: FrameworkInfo[];
  databases: string[];
  testing: string[];
  buildTools: string[];
  packageManagers: string[];
  cicd: string[];
}

export interface LanguageInfo {
  name: string;
  percentage: number;
  files: number;
}

export interface FrameworkInfo {
  name: string;
  type: 'frontend' | 'backend' | 'fullstack' | 'testing' | 'build' | 'other';
  version?: string;
  confidence: number; // 0-100
}

export interface DependencyInfo {
  production: Dependency[];
  development: Dependency[];
  outdated: OutdatedDependency[];
  total: number;
}

export interface Dependency {
  name: string;
  version: string;
  type?: string; // npm, pip, cargo, etc.
}

export interface OutdatedDependency extends Dependency {
  latestVersion: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CodeQuality {
  hasLinting: boolean;
  lintConfig?: string; // eslint, prettier, etc.
  hasTypeScript: boolean;
  tsConfig?: string;
  hasTests: boolean;
  testFramework?: string;
  testCoverage?: number;
  hasDocumentation: boolean;
  hasReadme: boolean;
  hasContributing: boolean;
  hasLicense: boolean;
  hasCI: boolean;
  ciPlatform?: string;
}

// Analysis request DTO
export interface AnalyzeRepositoryDto {
  owner: string;
  repo: string;
  branch?: string;
}
