import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LlmService } from './llm.service';
import { UserLLMConfig } from './interfaces/llm-provider.interface';

describe('LlmService', () => {
  let service: LlmService;

  const mockWizardData = {
    stage1: { projectName: 'Test Project', description: 'Test Description' },
    stage2: { target_users: 'Developers', main_features: 'API, Dashboard' },
    stage3: { selectedArchetypes: ['auth-jwt-stateless'] },
  };

  const mockUserConfig: UserLLMConfig = {
    apiKeys: {
      anthropic: 'sk-ant-test-key',
      openai: 'sk-openai-test-key',
    },
    preferences: {
      primaryProvider: 'anthropic',
      fallbackEnabled: true,
      fallbackOrder: ['anthropic', 'openai', 'gemini'],
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePlan', () => {
    it('should throw BadRequestException when no providers configured', async () => {
      const emptyConfig: UserLLMConfig = {
        apiKeys: {},
        preferences: {
          primaryProvider: null,
          fallbackEnabled: true,
          fallbackOrder: [],
        },
      };

      await expect(service.generatePlan(mockWizardData, emptyConfig)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use primary provider when configured', async () => {
      const anthropicProvider = (service as any).providers.get('anthropic');
      anthropicProvider.generatePlan = jest.fn().mockResolvedValue(mockPlanResponse);

      const result = await service.generatePlan(mockWizardData, mockUserConfig);

      expect(anthropicProvider.generatePlan).toHaveBeenCalled();
      expect(result).toEqual(mockPlanResponse);
    });

    it('should fallback to next provider when primary fails', async () => {
      const anthropicProvider = (service as any).providers.get('anthropic');
      const openaiProvider = (service as any).providers.get('openai');

      const openaiResponse = { ...mockPlanResponse, provider: 'openai' };

      anthropicProvider.generatePlan = jest.fn().mockRejectedValue(new Error('Anthropic API error'));
      openaiProvider.generatePlan = jest.fn().mockResolvedValue(openaiResponse);

      const result = await service.generatePlan(mockWizardData, mockUserConfig);

      expect(anthropicProvider.generatePlan).toHaveBeenCalled();
      expect(openaiProvider.generatePlan).toHaveBeenCalled();
      expect(result.provider).toBe('openai');
    });

    it('should throw when fallback is disabled and primary fails', async () => {
      const anthropicProvider = (service as any).providers.get('anthropic');
      anthropicProvider.generatePlan = jest.fn().mockRejectedValue(new Error('API error'));

      const noFallbackConfig: UserLLMConfig = {
        ...mockUserConfig,
        preferences: {
          ...mockUserConfig.preferences,
          fallbackEnabled: false,
        },
      };

      await expect(service.generatePlan(mockWizardData, noFallbackConfig)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when all providers fail', async () => {
      const anthropicProvider = (service as any).providers.get('anthropic');
      const openaiProvider = (service as any).providers.get('openai');

      anthropicProvider.generatePlan = jest.fn().mockRejectedValue(new Error('Anthropic error'));
      openaiProvider.generatePlan = jest.fn().mockRejectedValue(new Error('OpenAI error'));

      await expect(service.generatePlan(mockWizardData, mockUserConfig)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost using default provider when no config', () => {
      const anthropicProvider = (service as any).providers.get('anthropic');
      anthropicProvider.estimateCost = jest.fn().mockReturnValue(0.01);

      const cost = service.estimateCost(mockWizardData);

      expect(anthropicProvider.estimateCost).toHaveBeenCalled();
      expect(cost).toBe(0.01);
    });

    it('should estimate cost using user primary provider', () => {
      const openaiProvider = (service as any).providers.get('openai');
      openaiProvider.estimateCost = jest.fn().mockReturnValue(0.02);

      const openaiConfig: UserLLMConfig = {
        ...mockUserConfig,
        preferences: {
          ...mockUserConfig.preferences,
          primaryProvider: 'openai',
        },
      };

      const cost = service.estimateCost(mockWizardData, openaiConfig);

      expect(openaiProvider.estimateCost).toHaveBeenCalled();
      expect(cost).toBe(0.02);
    });

    it('should return 0 if provider not found', () => {
      const invalidConfig: UserLLMConfig = {
        ...mockUserConfig,
        preferences: {
          ...mockUserConfig.preferences,
          primaryProvider: 'nonexistent',
        },
      };

      const cost = service.estimateCost(mockWizardData, invalidConfig);

      expect(cost).toBe(0);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const providers = service.getAvailableProviders();

      expect(providers).toContain('anthropic');
      expect(providers).toContain('openai');
      expect(providers).toContain('gemini');
    });
  });

  describe('validateApiKey', () => {
    it('should return false for invalid provider', async () => {
      const result = await service.validateApiKey('invalid', 'key');
      expect(result).toBe(false);
    });

    it('should call provider validateApiKey', async () => {
      const anthropicProvider = (service as any).providers.get('anthropic');
      anthropicProvider.validateApiKey = jest.fn().mockResolvedValue(true);

      const result = await service.validateApiKey('anthropic', 'test-key');

      expect(anthropicProvider.validateApiKey).toHaveBeenCalledWith('test-key');
      expect(result).toBe(true);
    });
  });
});