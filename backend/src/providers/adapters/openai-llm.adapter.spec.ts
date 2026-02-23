import { OpenAILLMAdapter } from './openai-llm.adapter';

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"result": "ok"}' } }],
          usage: {
            prompt_tokens: 80,
            completion_tokens: 40,
            total_tokens: 120,
          },
        }),
      },
    },
  }));
});

describe('OpenAILLMAdapter', () => {
  let adapter: OpenAILLMAdapter;

  beforeEach(() => {
    adapter = new OpenAILLMAdapter();
  });

  it('should have name "openai"', () => {
    expect(adapter.name).toBe('openai');
  });

  it('should generate text', async () => {
    const result = await adapter.generateText('test prompt', {
      apiKey: 'sk-test',
    });
    expect(result.text).toBe('{"result": "ok"}');
    expect(result.tokensUsed).toBe(120);
    expect(result.cost).toBeGreaterThan(0);
  });

  it('should generate JSON', async () => {
    const result = await adapter.generateJSON('test prompt', {
      apiKey: 'sk-test',
    });
    expect(result.data).toEqual({ result: 'ok' });
  });

  it('should estimate cost', () => {
    const cost = adapter.estimateCost('hello world');
    expect(cost).toBeGreaterThanOrEqual(0);
  });

  it('should list models', () => {
    const models = adapter.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].tier).toBeDefined();
  });

  it('should get model pricing', () => {
    const pricing = adapter.getModelPricing('any-model');
    expect(pricing.inputPerMillionTokens).toBeGreaterThan(0);
  });

  it('should report capabilities', () => {
    expect(adapter.supportsCapability('text')).toBe(true);
    expect(adapter.supportsCapability('function-calling')).toBe(true);
    expect(adapter.supportsCapability('vision')).toBe(false);
  });

  it('should complete via SPEC method', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    const response = await adapter.complete({
      messages: [{ role: 'user', content: 'test' }],
      model: 'gpt-4-turbo-preview',
      maxTokens: 100,
    });
    expect(response.content).toBe('{"result": "ok"}');
    expect(response.usage.totalTokens).toBe(120);
    expect(response.providerId).toBe('openai');
  });
});
