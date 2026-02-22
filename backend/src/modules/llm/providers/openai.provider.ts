import OpenAI from 'openai';
import {
  LLMProvider,
  LLMResponse,
  LLMProviderOptions,
  ImportedProjectWizardData,
} from '../interfaces/llm-provider.interface';
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

export class OpenAIProvider implements LLMProvider {
  name = 'openai';

  private createClient(apiKey: string): OpenAI {
    return new OpenAI({ apiKey });
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = this.createClient(apiKey);
      await client.chat.completions.create({
        model: LLM_DEFAULTS.openai.validationModel,
        max_tokens: LLM_DEFAULTS.openai.maxTokensValidation,
        messages: [{ role: 'user', content: 'Hi' }],
      });
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

    const systemPrompt = isImportedProject
      ? 'You are an expert software architect analyzing an EXISTING codebase. Generate safe, incremental implementation plans that respect the existing architecture.'
      : 'You are an expert software architect. Generate ultra-granular implementation plans with tasks 10 minutes each.';

    const completion = await client.chat.completions.create({
      model: LLM_DEFAULTS.openai.planModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: LLM_DEFAULTS.openai.maxTokensPlan,
    });

    const planText = completion.choices[0].message.content || '{}';
    const plan = JSON.parse(planText);

    return {
      plan,
      provider: this.name,
      tokensUsed: completion.usage?.total_tokens || 0,
      cost: this.calculateCost(
        completion.usage?.prompt_tokens || 0,
        completion.usage?.completion_tokens || 0,
      ),
    };
  }

  async generateCode(
    task: any,
    context: any,
    options: LLMProviderOptions,
  ): Promise<{ files: { path: string; content: string }[] }> {
    const client = this.createClient(options.apiKey);
    const prompt = this.buildCodePrompt(task, context);

    const completion = await client.chat.completions.create({
      model: LLM_DEFAULTS.openai.planModel,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert senior software engineer. Output ONLY valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: LLM_DEFAULTS.openai.maxTokensCode,
    });

    const responseText = completion.choices[0].message.content || '{}';

    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse LLM code generation response:', error);
      throw new Error('LLM response was not valid JSON');
    }
  }

  private buildCodePrompt(task: any, context: any): string {
    return `Implement task: ${task.name}
Description: ${task.description}

Context:
- Project: ${context.projectName}
- Stack: ${context.technologies.join(', ')}

Return JSON: { "files": [{ "path": "...", "content": "..." }] }`;
  }

  private buildPrompt(wizardData: any): string {
    const { stage1, stage2, stage3 } = wizardData;

    return `Generate an ultra-granular implementation plan for:

PROJECT: ${stage1.projectName}
DESCRIPTION: ${stage1.description}

BUSINESS REQUIREMENTS:
${Object.entries(stage2)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

ARCHITECTURE PATTERNS: ${stage3.selectedArchetypes.join(', ')}

RULES:
- Each task 10 minutes
- Clear dependencies
- Phases: Infrastructure, Features, Testing
- Realistic time estimates

Return JSON with structure:
{
  "phases": [{ "name": "...", "estimatedTime": 60, "tasks": [{ "id": "t1", "name": "...", "description": "...", "estimatedTime": 10, "dependencies": [] }] }],
  "estimatedTime": 180
}`;
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

    // Format codebase structure info
    const structureInfo = existingCodebase?.structure
      ? `
- Has Backend: ${existingCodebase.structure.hasBackend ? 'Yes' : 'No'}
- Has Frontend: ${existingCodebase.structure.hasFrontend ? 'Yes' : 'No'}
- Is Monorepo: ${existingCodebase.structure.isMonorepo ? 'Yes' : 'No'}
- Total Files: ${existingCodebase.structure.totalFiles}
- Root Directories: ${existingCodebase.structure.directories.join(', ')}`
      : 'Not available';

    // Format tech stack info
    const techStackInfo = existingCodebase?.techStack
      ? `
- Languages: ${existingCodebase.techStack.languages.map((l) => `${l.name} (${l.percentage}%)`).join(', ')}
- Frameworks: ${existingCodebase.techStack.frameworks.map((f) => f.name).join(', ') || 'None detected'}
- Databases: ${existingCodebase.techStack.databases.join(', ') || 'None detected'}
- Testing: ${existingCodebase.techStack.testing.join(', ') || 'None detected'}
- Build Tools: ${existingCodebase.techStack.buildTools.join(', ') || 'None detected'}`
      : 'Not available';

    // Format dependencies info
    const depsInfo = existingCodebase?.dependencies
      ? `
- Total Dependencies: ${existingCodebase.dependencies.total}
- Production: ${existingCodebase.dependencies.production.length} packages
- Development: ${existingCodebase.dependencies.development.length} packages`
      : 'Not available';

    // Format code quality info
    const qualityInfo = existingCodebase?.codeQuality
      ? `
- Has Linting: ${existingCodebase.codeQuality.hasLinting ? 'Yes' : 'No'}
- Has TypeScript: ${existingCodebase.codeQuality.hasTypeScript ? 'Yes' : 'No'}
- Has Tests: ${existingCodebase.codeQuality.hasTests ? 'Yes' : 'No'}
- Has CI/CD: ${existingCodebase.codeQuality.hasCI ? 'Yes' : 'No'}`
      : 'Not available';

    // Format import context
    let contextInfo = '';
    if (importContext) {
      if (importContext.focusAreas?.length) {
        contextInfo += `\nFocus Areas: ${importContext.focusAreas.join(', ')}`;
      }
      if (importContext.excludeAreas?.length) {
        contextInfo += `\nExclude Areas: ${importContext.excludeAreas.join(', ')}`;
      }
      if (importContext.targetFiles?.length) {
        contextInfo += `\nTarget Files: ${importContext.targetFiles.join(', ')}`;
      }
    }

    return `Generate a plan to ${planTypeDesc} for an EXISTING project.

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

Return JSON:
{
  "phases": [{ "name": "...", "estimatedTime": 60, "tasks": [{ "id": "t1", "name": "...", "description": "...", "estimatedTime": 10, "dependencies": [] }] }],
  "estimatedTime": 180
}`;
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

  private calculateCost(
    promptTokens: number,
    completionTokens: number,
  ): number {
    const inputCost =
      (promptTokens / 1000000) * LLM_DEFAULTS.openai.pricing.inputPerMillion;
    const outputCost =
      (completionTokens / 1000000) *
      LLM_DEFAULTS.openai.pricing.outputPerMillion;
    return inputCost + outputCost;
  }

  estimateCost(prompt: string): number {
    const estimatedTokens = prompt.length / LLM_DEFAULTS.charsPerToken;
    return (
      (estimatedTokens / 1000000) * LLM_DEFAULTS.openai.pricing.inputPerMillion
    );
  }
}
