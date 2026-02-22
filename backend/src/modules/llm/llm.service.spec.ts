import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from './llm.service';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';

// Mock the providers
jest.mock('./providers/anthropic.provider');
jest.mock('./providers/openai.provider');
jest.mock('./providers/gemini.provider');

describe('LlmService', () => {
  let service: LlmService;
  let anthropicProvider: jest.Mocked<AnthropicProvider>;
  let openaiProvider: jest.Mocked<OpenAIProvider>;

  const mockWizardData = {
    stage1: { projectName: 'Test Project', description: 'Test Description' },
    stage2: { target_users: 'Developers', main_features: 'API, Dashboard' },
    stage3: { selectedArchetypes: ['auth-jwt-stateless'] },
  };

  const mockUserConfig = {
    apiKeys: {
      anthropic: 'test-anthropic-key',
      openai: 'test-openai-key',
    } as Record<string, string>,
    preferences: {
      primaryProvider: 'anthropic',
      fallbackEnabled: true,
      fallbackOrder: ['anthropic', 'openai'],
    },
  };

  const mockPlanResponse = {
    plan: {
      phases: [
        {
          name: 'Phase 1',
          estimatedTime: 60,
          tasks: [
            {
              id: 't1',
              name: 'Setup Database',
              description: 'Configure MongoDB',
              estimatedTime: 10,
              dependencies: [],
            },
          ],
        },
      ],
      estimatedTime: 60,
    },
    provider: 'anthropic',
    tokensUsed: 1500,
    cost: 0.005,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LlmService],
    }).compile();

    service = module.get<LlmService>(LlmService);

    // Get mocked providers from the service's internal map
    anthropicProvider = (service as any).providers.get('anthropic');
    openaiProvider = (service as any).providers.get('openai');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePlan', () => {
    it('should generate plan using primary provider (Anthropic)', async () => {
      anthropicProvider.generatePlan = jest.fn().mockResolvedValue(mockPlanResponse);

      const result = await service.generatePlan(mockWizardData, mockUserConfig);

      expect(anthropicProvider.generatePlan).toHaveBeenCalledWith(
        mockWizardData,
        { apiKey: 'test-anthropic-key' },
      );
      expect(result).toEqual(mockPlanResponse);
      expect(result.provider).toBe('anthropic');
    });

    it('should fallback to OpenAI when Anthropic fails', async () => {
      const openaiResponse = { ...mockPlanResponse, provider: 'openai' };

      anthropicProvider.generatePlan = jest.fn().mockRejectedValue(new Error('Anthropic API error'));
      openaiProvider.generatePlan = jest.fn().mockResolvedValue(openaiResponse);

      const result = await service.generatePlan(mockWizardData, mockUserConfig);

      expect(anthropicProvider.generatePlan).toHaveBeenCalled();
      expect(openaiProvider.generatePlan).toHaveBeenCalled();
      expect(result).toEqual(openaiResponse);
      expect(result.provider).toBe('openai');
    });

    it('should throw error when both providers fail', async () => {
      anthropicProvider.generatePlan = jest.fn().mockRejectedValue(new Error('Anthropic error'));
      openaiProvider.generatePlan = jest.fn().mockRejectedValue(new Error('OpenAI error'));

      await expect(service.generatePlan(mockWizardData, mockUserConfig)).rejects.toThrow();
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost using primary provider', () => {
      anthropicProvider.estimateCost = jest.fn().mockReturnValue(0.01);

      const cost = service.estimateCost(mockWizardData, mockUserConfig);

      expect(anthropicProvider.estimateCost).toHaveBeenCalled();
      expect(cost).toBe(0.01);
    });

    it('should return 0 if provider not found', () => {
      const configWithBadProvider = {
        ...mockUserConfig,
        preferences: {
          ...mockUserConfig.preferences,
          primaryProvider: 'nonexistent',
        },
      };

      const cost = service.estimateCost(mockWizardData, configWithBadProvider);

      expect(cost).toBe(0);
    });
  });
});
