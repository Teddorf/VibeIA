import { CodebaseAnalysis } from '../../codebase-analysis/dto/analysis-result.dto';

export interface ImportProjectDto {
  githubRepoFullName: string; // "owner/repo"
  branch?: string; // default: default_branch
  name?: string; // override name
  description?: string; // override description
}

export interface ImportedProjectMetadata {
  imported: true;
  importedAt: Date;
  analysis: CodebaseAnalysis;
  originalBranch: string;
  githubOwner: string;
  lastSyncedAt?: Date;
}
