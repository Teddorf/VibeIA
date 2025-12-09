export interface LLMProviderOptions {
  apiKey: string;
}

export interface LLMProvider {
  name: string;
  generatePlan(wizardData: any, options: LLMProviderOptions): Promise<LLMResponse>;
  generateCode(task: any, context: any, options: LLMProviderOptions): Promise<{ files: { path: string; content: string }[] }>;
  estimateCost(prompt: string): number;
  validateApiKey(apiKey: string): Promise<boolean>;
}

export interface LLMResponse {
  plan: any;
  provider: string;
  tokensUsed: number;
  cost: number;
}

export interface UserLLMConfig {
  apiKeys: Record<string, string>; // provider -> decrypted key
  preferences: {
    primaryProvider?: string;
    fallbackEnabled: boolean;
    fallbackOrder: string[];
  };
}