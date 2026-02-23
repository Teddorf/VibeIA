import { CodebaseAnalysis } from '../../codebase-analysis/dto/analysis-result.dto';
import { PlanType, ImportContext } from '../../plans/dto/create-plan.dto';

export interface LLMResponse {
  plan: any;
  provider: string;
  tokensUsed: number;
  cost: number;
}

export interface UserLLMConfig {
  apiKeys: Record<string, string>; // provider -> decrypted key
  preferences: {
    primaryProvider?: string;
    fallbackEnabled: boolean;
    fallbackOrder: string[];
  };
}

// Extended wizard data for imported projects
export interface ImportedProjectWizardData {
  stage1: { projectName: string; description: string };
  stage2: Record<string, string>;
  stage3: { selectedArchetypes: string[] };
  existingCodebase?: CodebaseAnalysis;
  importContext?: ImportContext;
  planType?: PlanType;
}
