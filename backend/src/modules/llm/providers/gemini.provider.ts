import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, LLMResponse } from '../interfaces/llm-provider.interface';

export class GeminiProvider implements LLMProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI;

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async generatePlan(wizardData: any): Promise<LLMResponse> {
    const prompt = this.buildPrompt(wizardData);

    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash-exp', // Gemini 2.0 Flash (latest experimental)
      generationConfig: {
        temperature: 0.7,
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

  async generateCode(task: any, context: any): Promise<{ files: { path: string; content: string }[] }> {
    const prompt = this.buildCodePrompt(task, context);

    const model = this.client.getGenerativeModel({
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