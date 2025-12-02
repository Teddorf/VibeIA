export interface LLMProvider {
  name: string;
  generatePlan(wizardData: any): Promise<any>;
  estimateCost(prompt: string): number;
}

export interface LLMResponse {
  plan: any;
  provider: string;
  tokensUsed: number;
  cost: number;
}