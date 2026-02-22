export interface ILLMProvider {
  readonly name: string;
  generateText(
    prompt: string,
    options?: Record<string, unknown>,
  ): Promise<string>;
  generateJSON<T = unknown>(
    prompt: string,
    options?: Record<string, unknown>,
  ): Promise<T>;
  validateApiKey(apiKey: string): Promise<boolean>;
  estimateCost(prompt: string): number;
}

export interface ILLMFallbackChain {
  execute<T>(fn: (provider: ILLMProvider) => Promise<T>): Promise<T>;
  getProviders(): ILLMProvider[];
}
