import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMResponse, LLMProviderOptions } from '../interfaces/llm-provider.interface';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';

  private createClient(apiKey: string): Anthropic {
    return new Anthropic({ apiKey });
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = this.createClient(apiKey);
      await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  async generatePlan(wizardData: any, options: LLMProviderOptions): Promise<LLMResponse> {
    const client = this.createClient(options.apiKey);
    const prompt = this.buildPrompt(wizardData);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514', // Claude 4.5 Sonnet (latest)
      max_tokens: 8192,
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
      cost: this.calculateCost(message.usage.input_tokens, message.usage.output_tokens),
    };
  }

  async generateCode(task: any, context: any, options: LLMProviderOptions): Promise<{ files: { path: string; content: string }[] }> {
    const client = this.createClient(options.apiKey);
    const prompt = this.buildCodePrompt(task, context);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
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
${Object.entries(stage2).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

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

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Claude 4.5 Sonnet pricing
    const inputCost = (inputTokens / 1000000) * 3; // $3 per million input tokens
    const outputCost = (outputTokens / 1000000) * 15; // $15 per million output tokens
    return inputCost + outputCost;
  }

  estimateCost(prompt: string): number {
    // Rough estimation: ~4 chars per token
    const estimatedTokens = prompt.length / 4;
    return (estimatedTokens / 1000000) * 3;
  }
}