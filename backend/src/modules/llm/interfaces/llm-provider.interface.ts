export interface LLMProvider {
  name: string;
  generatePlan(wizardData: any): Promise<any>;
  generateCode(task: any, context: any): Promise<{ files: { path: string; content: string }[] }>;
  estimateCost(prompt: string): number;
}

export interface LLMResponse {
  plan: any;
  provider: string;
  tokensUsed: number;
  cost: number;
}