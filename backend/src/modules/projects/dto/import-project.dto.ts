import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CodebaseAnalysis } from '../../codebase-analysis/dto/analysis-result.dto';

export class ImportProjectDto {
  @IsString()
  @IsNotEmpty()
  githubRepoFullName: string; // "owner/repo"

  @IsString()
  @IsOptional()
  branch?: string; // default: default_branch

  @IsString()
  @IsOptional()
  name?: string; // override name

  @IsString()
  @IsOptional()
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
