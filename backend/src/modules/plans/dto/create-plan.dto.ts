import { CodebaseAnalysis } from '../../codebase-analysis/dto/analysis-result.dto';

// Plan types for imported projects
export type PlanType = 'new' | 'feature' | 'refactor' | 'fix' | 'upgrade' | 'optimize' | 'security';

// Import context for projects imported from GitHub
export interface ImportContext {
  focusAreas?: string[]; // Specific areas of code to modify
  excludeAreas?: string[]; // Areas to not touch
  preservePatterns?: boolean; // Whether to maintain existing patterns
  targetFiles?: string[]; // Specific files to focus on
}

export class CreatePlanDto {
  projectId: string;
  userId: string;

  // New field for plan type (defaults to 'new' for non-imported projects)
  planType?: PlanType;

  wizardData: {
    stage1: { projectName: string; description: string };
    stage2: Record<string, string>;
    stage3: { selectedArchetypes: string[] };
    // New: context for imported projects
    importContext?: ImportContext;
    // The codebase analysis (populated from project metadata for imported projects)
    existingCodebase?: CodebaseAnalysis;
  };
}