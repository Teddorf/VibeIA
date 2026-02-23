import {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from './llm-provider.interface';

export interface ILLMFallbackChain {
  readonly providers: ILLMProvider[];
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
  addProvider(provider: ILLMProvider): void;
  removeProvider(providerId: string): void;
  getActiveProvider(): ILLMProvider | null;
}
