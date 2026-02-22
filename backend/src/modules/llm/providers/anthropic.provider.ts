import Anthropic from '@anthropic-ai/sdk';
import type {
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

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';

  private createClient(apiKey: string): Anthropic {
    return new Anthropic({ apiKey });
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = this.createClient(apiKey);
      await client.messages.create({
        model: LLM_DEFAULTS.anthropic.validationModel,
        max_tokens: LLM_DEFAULTS.anthropic.maxTokensValidation,
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

    const message = await client.messages.create({
      model: LLM_DEFAULTS.anthropic.planModel,
      max_tokens: LLM_DEFAULTS.anthropic.maxTokensPlan,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    const planText = content.type === 'text' ? content.text : '';

    // Parse the JSON response from Claude
    const plan = JSON.parse(planText);

    return {
      plan,
      provider: this.name,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
      cost: this.calculateCost(
        message.usage.input_tokens,
        message.usage.output_tokens,
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

    const message = await client.messages.create({
      model: LLM_DEFAULTS.anthropic.planModel,
      max_tokens: LLM_DEFAULTS.anthropic.maxTokensCode,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    const responseText = content.type === 'text' ? content.text : '';

    try {
      // Parse JSON response
      const result = JSON.parse(responseText);
      return result;
    } catch (error) {
      console.error('Failed to parse LLM code generation response:', error);
      throw new Error('LLM response was not valid JSON');
    }
  }

  private buildCodePrompt(task: any, context: any): string {
    return `You are an expert senior software engineer. Your task is to implement the following task.

TASK: ${task.name}
DESCRIPTION: ${task.description}

PROJECT CONTEXT:
- Project: ${context.projectName}
- Tech Stack: ${context.technologies.join(', ')}
- Architecture: ${context.architecture.join(', ')}

INSTRUCTIONS:
1. Generate the necessary code files to complete this task.
2. Ensure code is production-ready, typed (if TS), and follows best practices.
3. Return ONLY valid JSON with the following structure:

{
  "files": [
    {
      "path": "src/path/to/file.ts",
      "content": "full code content here"
    }
  ]
}

Do not include markdown formatting or explanations outside the JSON.`;
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

OUTPUT FORMAT (JSON):
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
- Build Tools: ${t.buildTools.join(', ') || 'None detected'}
- Package Managers: ${t.packageManagers.join(', ') || 'None detected'}`;
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
- Has Linting: ${q.hasLinting ? 'Yes' : 'No'} ${q.lintConfig ? `(${q.lintConfig})` : ''}
- Has TypeScript: ${q.hasTypeScript ? 'Yes' : 'No'}
- Has Tests: ${q.hasTests ? 'Yes' : 'No'} ${q.testFramework ? `(${q.testFramework})` : ''}
- Has CI/CD: ${q.hasCI ? 'Yes' : 'No'} ${q.ciPlatform ? `(${q.ciPlatform})` : ''}`;
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
      contextInfo += `\nFocus Areas (prioritize changes here): ${importContext.focusAreas.join(', ')}`;
    }
    if (importContext.excludeAreas?.length) {
      contextInfo += `\nExclude Areas (do NOT modify): ${importContext.excludeAreas.join(', ')}`;
    }
    if (importContext.targetFiles?.length) {
      contextInfo += `\nTarget Files: ${importContext.targetFiles.join(', ')}`;
    }
    if (importContext.preservePatterns) {
      contextInfo += '\nPreserve existing code patterns and conventions.';
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
    const suggestionsInfo = existingCodebase?.suggestions?.length
      ? existingCodebase.suggestions.map((s) => `- ${s}`).join('\n')
      : 'None';
    const contextInfo = this.formatImportContextInfo(importContext);

    return `You are an expert software architect analyzing an EXISTING project. Generate a plan to ${planTypeDesc}.

IMPORTANT: This is an EXISTING codebase. You must:
1. RESPECT the existing architecture and patterns
2. NOT break existing functionality
3. Build upon what already exists
4. Suggest incremental, safe changes

============================================
PROJECT INFORMATION
============================================

PROJECT: ${stage1.projectName}
USER'S GOAL: ${stage1.description}
PLAN TYPE: ${planType || 'feature'} - ${planTypeDesc}

============================================
EXISTING CODEBASE ANALYSIS
============================================

STRUCTURE:${structureInfo}

TECH STACK:${techStackInfo}

DEPENDENCIES:${depsInfo}

CODE QUALITY:${qualityInfo}

EXISTING SUGGESTIONS FOR IMPROVEMENT:
${suggestionsInfo}

============================================
USER REQUIREMENTS
============================================

BUSINESS REQUIREMENTS:
${Object.entries(stage2)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

SELECTED PATTERNS/APPROACHES:
${stage3.selectedArchetypes.join(', ')}
${contextInfo}

============================================
PLANNING RULES
============================================

1. Each task MUST be approximately 10 minutes of work
2. Tasks must have clear dependencies (reference by task ID)
3. Group tasks into logical phases that make sense for this type of work
4. Start with any necessary analysis/preparation tasks
5. Include tasks for updating existing tests
6. Add tasks for documentation updates if needed
7. Consider backwards compatibility
8. Include a final verification/testing phase

PHASE SUGGESTIONS FOR "${planType || 'feature'}" TYPE PLANS:
${this.getPhaseSuggestions(planType)}

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
        return `
- Analysis & Design: Understand existing code, design integration points
- Implementation: Add new code, modify existing files
- Testing: Unit tests, integration tests
- Documentation: Update docs, add comments`;
      case 'refactor':
        return `
- Analysis: Identify code smells, plan refactoring strategy
- Preparation: Add tests for existing behavior (if missing)
- Refactoring: Apply refactoring patterns safely
- Verification: Ensure no regressions`;
      case 'fix':
        return `
- Investigation: Reproduce, understand root cause
- Fix Implementation: Apply minimal fix
- Testing: Add regression tests
- Verification: Ensure fix works, no side effects`;
      case 'upgrade':
        return `
- Compatibility Check: Review breaking changes
- Dependency Updates: Update packages incrementally
- Code Migration: Update deprecated APIs
- Testing & Verification: Full test suite`;
      case 'optimize':
        return `
- Profiling: Identify bottlenecks
- Optimization: Apply targeted optimizations
- Benchmarking: Measure improvements
- Verification: Ensure correctness preserved`;
      case 'security':
        return `
- Audit: Identify vulnerabilities
- Remediation: Apply security fixes
- Hardening: Add security measures
- Verification: Security testing`;
      default:
        return `
- Planning: Understand requirements
- Implementation: Build the feature
- Testing: Write tests
- Documentation: Update docs`;
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost =
      (inputTokens / 1000000) * LLM_DEFAULTS.anthropic.pricing.inputPerMillion;
    const outputCost =
      (outputTokens / 1000000) *
      LLM_DEFAULTS.anthropic.pricing.outputPerMillion;
    return inputCost + outputCost;
  }

  estimateCost(prompt: string): number {
    const estimatedTokens = prompt.length / LLM_DEFAULTS.charsPerToken;
    return (
      (estimatedTokens / 1000000) *
      LLM_DEFAULTS.anthropic.pricing.inputPerMillion
    );
  }
}
