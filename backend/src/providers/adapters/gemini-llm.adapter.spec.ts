import { GeminiLLMAdapter } from './gemini-llm.adapter';

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => '{"result": "ok"}',
        },
      }),
    }),
  })),
}));

describe('GeminiLLMAdapter', () => {
  let adapter: GeminiLLMAdapter;

  beforeEach(() => {
    adapter = new GeminiLLMAdapter();
  });

  it('should have name "gemini"', () => {
    expect(adapter.name).toBe('gemini');
  });

  it('should generate text', async () => {
    const result = await adapter.generateText('test prompt', {
      apiKey: 'AI-test',
    });
    expect(result.text).toBe('{"result": "ok"}');
    expect(result.tokensUsed).toBeGreaterThan(0);
    expect(result.cost).toBeGreaterThanOrEqual(0);
  });

  it('should generate JSON', async () => {
    const result = await adapter.generateJSON('test prompt', {
      apiKey: 'AI-test',
    });
    expect(result.data).toEqual({ result: 'ok' });
  });

  it('should estimate cost', () => {
    const cost = adapter.estimateCost('hello world');
    expect(cost).toBeGreaterThanOrEqual(0);
  });
});
