import { AnthropicLLMAdapter } from './anthropic-llm.adapter';

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"result": "ok"}' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  }));
});

describe('AnthropicLLMAdapter', () => {
  let adapter: AnthropicLLMAdapter;

  beforeEach(() => {
    adapter = new AnthropicLLMAdapter();
  });

  it('should have name "anthropic"', () => {
    expect(adapter.name).toBe('anthropic');
  });

  it('should generate text', async () => {
    const result = await adapter.generateText('test prompt', {
      apiKey: 'sk-ant-test',
    });
    expect(result.text).toBe('{"result": "ok"}');
    expect(result.tokensUsed).toBe(150);
    expect(result.cost).toBeGreaterThan(0);
  });

  it('should generate JSON', async () => {
    const result = await adapter.generateJSON('test prompt', {
      apiKey: 'sk-ant-test',
    });
    expect(result.data).toEqual({ result: 'ok' });
    expect(result.tokensUsed).toBe(150);
  });

  it('should estimate cost', () => {
    const cost = adapter.estimateCost('hello world');
    expect(cost).toBeGreaterThanOrEqual(0);
  });

  it('should list models', () => {
    const models = adapter.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].modelId).toBeDefined();
    expect(models[0].tier).toBeDefined();
    expect(models[0].capabilities).toContain('text');
  });

  it('should get model pricing', () => {
    const pricing = adapter.getModelPricing('any-model');
    expect(pricing.inputPerMillionTokens).toBeGreaterThan(0);
    expect(pricing.outputPerMillionTokens).toBeGreaterThan(0);
  });

  it('should report supported capabilities', () => {
    expect(adapter.supportsCapability('text')).toBe(true);
    expect(adapter.supportsCapability('streaming')).toBe(true);
    expect(adapter.supportsCapability('function-calling')).toBe(false);
  });

  it('should complete via SPEC method', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const response = await adapter.complete({
      messages: [{ role: 'user', content: 'test' }],
      model: 'claude-sonnet-4-20250514',
      maxTokens: 100,
    });
    expect(response.content).toBe('{"result": "ok"}');
    expect(response.usage.inputTokens).toBe(100);
    expect(response.usage.outputTokens).toBe(50);
    expect(response.providerId).toBe('anthropic');
  });
});
