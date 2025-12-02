import OpenAI from 'openai';
import { LLMProvider, LLMResponse } from '../interfaces/llm-provider.interface';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  async generatePlan(wizardData: any): Promise<LLMResponse> {
    const prompt = this.buildPrompt(wizardData);

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software architect. Generate ultra-granular implementation plans with tasks 10 minutes each.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    });

    const planText = completion.choices[0].message.content || '{}';
    const plan = JSON.parse(planText);

    return {
      plan,
      provider: this.name,
      tokensUsed: completion.usage?.total_tokens || 0,
      cost: this.calculateCost(completion.usage?.prompt_tokens || 0, completion.usage?.completion_tokens || 0),
    };
  }

  private buildPrompt(wizardData: any): string {
    const { stage1, stage2, stage3 } = wizardData;

    return `Generate an ultra-granular implementation plan for:

PROJECT: ${stage1.projectName}
DESCRIPTION: ${stage1.description}

BUSINESS REQUIREMENTS:
${Object.entries(stage2).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

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

  private calculateCost(promptTokens: number, completionTokens: number): number {
    // GPT-4 Turbo pricing
    const inputCost = (promptTokens / 1000000) * 10;
    const outputCost = (completionTokens / 1000000) * 30;
    return inputCost + outputCost;
  }

  estimateCost(prompt: string): number {
    const estimatedTokens = prompt.length / 4;
    return (estimatedTokens / 1000000) * 10;
  }
}