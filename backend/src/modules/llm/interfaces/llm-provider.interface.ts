export interface LLMProvider {
  name: string;
  generatePlan(wizardData: any): Promise\u003cany\u003e;
  estimateCost(prompt: string): number;
}

export interface LLMResponse {
  plan: any;
  provider: string;
  tokensUsed: number;
  cost: number;
}
