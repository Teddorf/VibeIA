import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  LLMProvider,
  LLMResponse,
  LLMProviderOptions,
  ImportedProjectWizardData,
} from '../interfaces/llm-provider.interface';
import type { GenerativeModel } from '@google/generative-ai';
import { LLM_DEFAULTS } from '../../../config/defaults';

// Plan type descriptions for better prompts
const PLAN_TYPE_DESCRIPTIONS: Record<string, string> = {
  feature: 'Add new functionality to the existing codebase',
  refactor: 'Improve code quality, structure, and maintainability',
  fix: 'Fix bugs, issues, or technical debt',
  upgrade: 'Update dependencies, frameworks, or migrate to newer versions',
  optimize:
    'Improve performance, reduce resource usage, or optimize algorithms',
  security: 'Fix security vulnerabilities and improve security posture',
};

export class GeminiProvider implements LLMProvider {
  name = 'gemini';

  private createClient(apiKey: string): GoogleGenerativeAI {
    return new GoogleGenerativeAI(apiKey);
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = this.createClient(apiKey);
      // Use gemini-2.0-flash with fallback to gemini-pro
      let model: GenerativeModel;
      try {
        model = client.getGenerativeModel({
          model: LLM_DEFAULTS.gemini.planModel,
        });
        await model.generateContent('Hi');
      } catch {
        // Fallback to gemini-pro if flash not available
        model = client.getGenerativeModel({
          model: LLM_DEFAULTS.gemini.fallbackModel,
        });
        await model.generateContent('Hi');
      }
      return true;
    } catch {
      return false;
    }
  }

  async generatePlan(
    wizardData: any,
    options: LLMProviderOptions,
  ): Promise<LLMResponse> {
    const client = this.createClient(options.apiKey);

    // Check if this is an imported project with existing codebase
    const isImportedProject = !!(wizardData as ImportedProjectWizardData)
      .existingCodebase;
    const prompt = isImportedProject
      ? this.buildImportedProjectPrompt(wizardData as ImportedProjectWizardData)
      : this.buildPrompt(wizardData);

    const model = client.getGenerativeModel({
      model: LLM_DEFAULTS.gemini.planModel,
      generationConfig: {
        temperature: isImportedProject
          ? LLM_DEFAULTS.gemini.temperatureImported
          : LLM_DEFAULTS.gemini.temperatureDefault,
        maxOutputTokens: LLM_DEFAULTS.gemini.maxOutputTokens,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const planText = response.text();

    // Parse the JSON response from Gemini
    const plan = JSON.parse(planText);

    // Gemini doesn't provide token usage in the same way, estimate it
    const estimatedTokens = this.estimateTokens(prompt, planText);

    return {
      plan,
      provider: this.name,
      tokensUsed: estimatedTokens,
      cost: this.calculateCost(estimatedTokens),
    };
  }

  async generateCode(
    task: any,
    context: any,
    options: LLMProviderOptions,
  ): Promise<{ files: { path: string; content: string }[] }> {
    const client = this.createClient(options.apiKey);
    const prompt = this.buildCodePrompt(task, context);

    const model = client.getGenerativeModel({
      model: LLM_DEFAULTS.gemini.planModel,
      generationConfig: {
        temperature: LLM_DEFAULTS.gemini.temperatureCode,
        maxOutputTokens: LLM_DEFAULTS.gemini.maxOutputTokens,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse LLM code generation response:', error);
      throw new Error('LLM response was not valid JSON');
    }
  }

  private buildCodePrompt(task: any, context: any): string {
    return `You are an expert senior software engineer. Implement the following task.

TASK: ${task.name}
DESCRIPTION: ${task.description}

PROJECT CONTEXT:
- Project: ${context.projectName}
- Tech Stack: ${context.technologies.join(', ')}

OUTPUT JSON ONLY:
{
  "files": [
    {
      "path": "src/path/to/file.ts",
      "content": "full code content"
    }
  ]
}`;
  }

  private buildPrompt(wizardData: any): string {
    const { stage1, stage2, stage3 } = wizardData;

    return `You are an expert software architect. Generate an ultra-granular implementation plan based on the following project requirements.

PROJECT: ${stage1.projectName}
DESCRIPTION: ${stage1.description}

BUSINESS REQUIREMENTS:
${Object.entries(stage2)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

SELECTED ARCHITECTURE PATTERNS:
${stage3.selectedArchetypes.join(', ')}

RULES:
1. Each task MUST be 10 minutes
2. Tasks must have clear dependencies
3. Group tasks into logical phases (Infrastructure, Features, Testing)
4. Provide realistic time estimates
5. Include test generation for each feature

OUTPUT FORMAT (JSON only, no markdown):
{
  "phases": [
    {
      "name": "Phase Name",
      "estimatedTime": 60,
      "tasks": [
        {
          "id": "t1",
          "name": "Task Name",
          "description": "Detailed description",
          "estimatedTime": 10,
          "dependencies": []
        }
      ]
    }
  ],
  "estimatedTime": 180
}

Generate the plan now:`;
  }

  /**
   * Format codebase structure information
   */
  private formatStructureInfo(
    existingCodebase: ImportedProjectWizardData['existingCodebase'],
  ): string {
    if (!existingCodebase?.structure) return 'Not available';
    const s = existingCodebase.structure;
    return `
- Has Backend: ${s.hasBackend ? 'Yes' : 'No'}
- Has Frontend: ${s.hasFrontend ? 'Yes' : 'No'}
- Is Monorepo: ${s.isMonorepo ? 'Yes' : 'No'}
- Total Files: ${s.totalFiles}
- Root Directories: ${s.directories.join(', ')}`;
  }

  /**
   * Format tech stack information
   */
  private formatTechStackInfo(
    existingCodebase: ImportedProjectWizardData['existingCodebase'],
  ): string {
    if (!existingCodebase?.techStack) return 'Not available';
    const t = existingCodebase.techStack;
    return `
- Languages: ${t.languages.map((l) => `${l.name} (${l.percentage}%)`).join(', ')}
- Frameworks: ${t.frameworks.map((f) => f.name).join(', ') || 'None detected'}
- Databases: ${t.databases.join(', ') || 'None detected'}
- Testing: ${t.testing.join(', ') || 'None detected'}
- Build Tools: ${t.buildTools.join(', ') || 'None detected'}`;
  }

  /**
   * Format dependencies information
   */
  private formatDependenciesInfo(
    existingCodebase: ImportedProjectWizardData['existingCodebase'],
  ): string {
    if (!existingCodebase?.dependencies) return 'Not available';
    const d = existingCodebase.dependencies;
    return `
- Total Dependencies: ${d.total}
- Production: ${d.production.length} packages
- Development: ${d.development.length} packages`;
  }

  /**
   * Format code quality information
   */
  private formatCodeQualityInfo(
    existingCodebase: ImportedProjectWizardData['existingCodebase'],
  ): string {
    if (!existingCodebase?.codeQuality) return 'Not available';
    const q = existingCodebase.codeQuality;
    return `
- Has Linting: ${q.hasLinting ? 'Yes' : 'No'}
- Has TypeScript: ${q.hasTypeScript ? 'Yes' : 'No'}
- Has Tests: ${q.hasTests ? 'Yes' : 'No'}
- Has CI/CD: ${q.hasCI ? 'Yes' : 'No'}`;
  }

  /**
   * Format import context information
   */
  private formatImportContextInfo(
    importContext: ImportedProjectWizardData['importContext'],
  ): string {
    if (!importContext) return '';
    let contextInfo = '';
    if (importContext.focusAreas?.length) {
      contextInfo += `\nFocus Areas: ${importContext.focusAreas.join(', ')}`;
    }
    if (importContext.excludeAreas?.length) {
      contextInfo += `\nExclude Areas: ${importContext.excludeAreas.join(', ')}`;
    }
    if (importContext.targetFiles?.length) {
      contextInfo += `\nTarget Files: ${importContext.targetFiles.join(', ')}`;
    }
    return contextInfo;
  }

  /**
   * Build prompt for imported projects with existing codebase analysis
   */
  private buildImportedProjectPrompt(
    wizardData: ImportedProjectWizardData,
  ): string {
    const {
      stage1,
      stage2,
      stage3,
      existingCodebase,
      importContext,
      planType,
    } = wizardData;

    const planTypeDesc = planType
      ? PLAN_TYPE_DESCRIPTIONS[planType] || planType
      : 'new feature';
    const structureInfo = this.formatStructureInfo(existingCodebase);
    const techStackInfo = this.formatTechStackInfo(existingCodebase);
    const depsInfo = this.formatDependenciesInfo(existingCodebase);
    const qualityInfo = this.formatCodeQualityInfo(existingCodebase);
    const contextInfo = this.formatImportContextInfo(importContext);

    return `You are an expert software architect analyzing an EXISTING project. Generate a plan to ${planTypeDesc}.

IMPORTANT: This is an EXISTING codebase. You must:
1. RESPECT the existing architecture and patterns
2. NOT break existing functionality
3. Build upon what already exists
4. Suggest incremental, safe changes

PROJECT: ${stage1.projectName}
USER'S GOAL: ${stage1.description}
PLAN TYPE: ${planType || 'feature'} - ${planTypeDesc}

EXISTING CODEBASE ANALYSIS:
STRUCTURE:${structureInfo}
TECH STACK:${techStackInfo}
DEPENDENCIES:${depsInfo}
CODE QUALITY:${qualityInfo}

USER REQUIREMENTS:
${Object.entries(stage2)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

SELECTED PATTERNS: ${stage3.selectedArchetypes.join(', ')}
${contextInfo}

PHASE SUGGESTIONS FOR "${planType || 'feature'}" TYPE:
${this.getPhaseSuggestions(planType)}

RULES:
1. Each task MUST be approximately 10 minutes
2. Tasks must have clear dependencies (reference by task ID)
3. Start with analysis/preparation tasks
4. Include tasks for updating existing tests
5. Include a final verification phase

OUTPUT FORMAT (JSON only, no markdown):
{
  "phases": [
    {
      "name": "Phase Name",
      "estimatedTime": 60,
      "tasks": [
        {
          "id": "t1",
          "name": "Task Name",
          "description": "Detailed description including which files to modify",
          "estimatedTime": 10,
          "dependencies": []
        }
      ]
    }
  ],
  "estimatedTime": 180
}

Generate the plan now:`;
  }

  /**
   * Get phase suggestions based on plan type
   */
  private getPhaseSuggestions(planType?: string): string {
    switch (planType) {
      case 'feature':
        return '- Analysis & Design\n- Implementation\n- Testing\n- Documentation';
      case 'refactor':
        return '- Analysis\n- Preparation (add tests)\n- Refactoring\n- Verification';
      case 'fix':
        return '- Investigation\n- Fix Implementation\n- Testing\n- Verification';
      case 'upgrade':
        return '- Compatibility Check\n- Dependency Updates\n- Code Migration\n- Testing';
      case 'optimize':
        return '- Profiling\n- Optimization\n- Benchmarking\n- Verification';
      case 'security':
        return '- Audit\n- Remediation\n- Hardening\n- Security Testing';
      default:
        return '- Planning\n- Implementation\n- Testing\n- Documentation';
    }
  }

  private estimateTokens(prompt: string, response: string): number {
    const promptTokens = prompt.length / LLM_DEFAULTS.charsPerToken;
    const responseTokens = response.length / LLM_DEFAULTS.charsPerToken;
    return Math.round(promptTokens + responseTokens);
  }

  private calculateCost(totalTokens: number): number {
    return (
      (totalTokens / 1000000) * LLM_DEFAULTS.gemini.pricing.averagePerMillion
    );
  }

  estimateCost(prompt: string): number {
    const estimatedTokens = prompt.length / LLM_DEFAULTS.charsPerToken;
    return (
      (estimatedTokens / 1000000) * LLM_DEFAULTS.gemini.pricing.inputPerMillion
    );
  }
}
