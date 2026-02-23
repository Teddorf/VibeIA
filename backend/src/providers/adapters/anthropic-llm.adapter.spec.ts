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
});
