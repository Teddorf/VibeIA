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
});
