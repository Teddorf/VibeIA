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

  it('should list models', () => {
    const models = adapter.listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0].tier).toBe('fast');
  });

  it('should get model pricing', () => {
    const pricing = adapter.getModelPricing('any');
    expect(pricing.inputPerMillionTokens).toBeGreaterThanOrEqual(0);
  });

  it('should report capabilities', () => {
    expect(adapter.supportsCapability('text')).toBe(true);
    expect(adapter.supportsCapability('vision')).toBe(false);
  });

  it('should complete via SPEC method', async () => {
    process.env.GOOGLE_AI_API_KEY = 'AI-test';
    const response = await adapter.complete({
      messages: [{ role: 'user', content: 'test' }],
      model: 'gemini-2.0-flash',
      maxTokens: 100,
    });
    expect(response.content).toBe('{"result": "ok"}');
    expect(response.usage.totalTokens).toBeGreaterThan(0);
    expect(response.providerId).toBe('gemini');
  });
});
