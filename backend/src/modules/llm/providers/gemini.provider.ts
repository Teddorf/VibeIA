import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, LLMResponse, LLMProviderOptions, ImportedProjectWizardData } from '../interfaces/llm-provider.interface';

// Plan type descriptions for better prompts
const PLAN_TYPE_DESCRIPTIONS: Record<string, string> = {
  feature: 'Add new functionality to the existing codebase',
  refactor: 'Improve code quality, structure, and maintainability',
  fix: 'Fix bugs, issues, or technical debt',
  upgrade: 'Update dependencies, frameworks, or migrate to newer versions',
  optimize: 'Improve performance, reduce resource usage, or optimize algorithms',
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
      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('Hi');
      return true;
    } catch {
      return false;
    }
  }

  async generatePlan(wizardData: any, options: LLMProviderOptions): Promise<LLMResponse> {
    const client = this.createClient(options.apiKey);

    // Check if this is an imported project with existing codebase
    const isImportedProject = !!(wizardData as ImportedProjectWizardData).existingCodebase;
    const prompt = isImportedProject
      ? this.buildImportedProjectPrompt(wizardData as ImportedProjectWizardData)
      : this.buildPrompt(wizardData);

    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp', // Gemini 2.0 Flash (latest experimental)
      generationConfig: {
        temperature: isImportedProject ? 0.5 : 0.7, // Lower temperature for imported projects
        maxOutputTokens: 8192,
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

  async generateCode(task: any, context: any, options: LLMProviderOptions): Promise<{ files: { path: string; content: string }[] }> {
    const client = this.createClient(options.apiKey);
    const prompt = this.buildCodePrompt(task, context);

    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2, // Lower temperature for code
        maxOutputTokens: 8192,
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
${Object.entries(stage2).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

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
   * Build prompt for imported projects with existing codebase analysis
   */
  private buildImportedProjectPrompt(wizardData: ImportedProjectWizardData): string {
    const { stage1, stage2, stage3, existingCodebase, importContext, planType } = wizardData;

    const planTypeDesc = planType ? PLAN_TYPE_DESCRIPTIONS[planType] || planType : 'new feature';

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
${Object.entries(stage2).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

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
    // Rough estimation: ~4 chars per token
    const promptTokens = prompt.length / 4;
    const responseTokens = response.length / 4;
    return Math.round(promptTokens + responseTokens);
  }

  private calculateCost(totalTokens: number): number {
    // Gemini 2.0 Flash pricing (free tier, then very cheap)
    // $0.075 per million input tokens, $0.30 per million output tokens
    // For simplicity, average cost
    return (totalTokens / 1000000) * 0.1875;
  }

  estimateCost(prompt: string): number {
    const estimatedTokens = prompt.length / 4;
    return (estimatedTokens / 1000000) * 0.075;
  }
}