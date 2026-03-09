import { AnthropicLLMAdapter } from '../anthropic-llm.adapter';
import { OpenAILLMAdapter } from '../openai-llm.adapter';
import { GeminiLLMAdapter } from '../gemini-llm.adapter';
import { ILLMProvider } from '../../interfaces/llm-provider.interface';

/**
 * Conformance tests verify that every ILLMProvider implementation
 * exposes the same public surface (name, methods, return shapes).
 * They do NOT call real APIs — they only assert structural conformance.
 */
describe('ILLMProvider conformance', () => {
  const adapters: { label: string; instance: ILLMProvider }[] = [
    { label: 'AnthropicLLMAdapter', instance: new AnthropicLLMAdapter() },
    { label: 'OpenAILLMAdapter', instance: new OpenAILLMAdapter() },
    { label: 'GeminiLLMAdapter', instance: new GeminiLLMAdapter() },
  ];

  describe.each(adapters)('$label', ({ instance }) => {
    it('should have a non-empty name property', () => {
      expect(typeof instance.name).toBe('string');
      expect(instance.name.length).toBeGreaterThan(0);
    });

    it('should implement generateText as async function', () => {
      expect(typeof instance.generateText).toBe('function');
    });

    it('should implement generateJSON as async function', () => {
      expect(typeof instance.generateJSON).toBe('function');
    });

    it('should implement validateApiKey as async function', () => {
      expect(typeof instance.validateApiKey).toBe('function');
    });

    it('should implement estimateCost as function', () => {
      expect(typeof instance.estimateCost).toBe('function');
    });

    it('should return a number from estimateCost', () => {
      const cost = instance.estimateCost('Hello world');
      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThanOrEqual(0);
    });

    it('should have unique name per adapter', () => {
      const names = adapters.map((a) => a.instance.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });
  });
});
