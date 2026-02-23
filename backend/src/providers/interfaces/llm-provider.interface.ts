// ─── Legacy types (backward compat) ─────────────────────────────────────────

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

// ─── SPEC v2.2 Types ────────────────────────────────────────────────────────

export type LLMCapability =
  | 'text'
  | 'json'
  | 'streaming'
  | 'function-calling'
  | 'vision'
  | 'code';

export interface LLMContentBlock {
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LLMContentBlock[];
}

export interface LLMRequest {
  messages: LLMMessage[];
  model: string;
  maxTokens: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
  metadata?: { traceId?: string; [key: string]: unknown };
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  finishReason: 'stop' | 'length' | 'content-filter' | 'error';
  latencyMs: number;
  cached: boolean;
  providerId: string;
}

export interface LLMStreamChunk {
  delta: string;
  finishReason?: 'stop' | 'length' | 'content-filter' | 'error';
  usage?: Partial<TokenUsage>;
}

export interface ModelInfo {
  modelId: string;
  displayName: string;
  tier: 'fast' | 'balanced' | 'powerful';
  contextWindow: number;
  capabilities: LLMCapability[];
}

export interface ModelPricingSpec {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
  cachedInputPerMillionTokens?: number;
}

// ─── ILLMProvider Interface ─────────────────────────────────────────────────

export interface ILLMProvider {
  readonly name: string;

  // Legacy methods (backward compat)
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

  // SPEC v2.2 methods
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
  listModels(): ModelInfo[];
  getModelPricing(modelId: string): ModelPricingSpec;
  supportsCapability(capability: LLMCapability): boolean;
}
