export interface ILLMProviderOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ILLMProviderResult {
  text: string;
  tokensUsed: number;
  cost: number;
}

export interface ILLMProviderJSONResult<T = unknown> {
  data: T;
  tokensUsed: number;
  cost: number;
}

export interface ILLMProvider {
  readonly name: string;
  generateText(
    prompt: string,
    options: ILLMProviderOptions,
  ): Promise<ILLMProviderResult>;
  generateJSON<T = unknown>(
    prompt: string,
    options: ILLMProviderOptions,
  ): Promise<ILLMProviderJSONResult<T>>;
  validateApiKey(apiKey: string): Promise<boolean>;
  estimateCost(prompt: string): number;
}
