import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LlmService } from './llm.service';
import { UserLLMConfig } from './interfaces/llm-provider.interface';
import { LLM_PROVIDER } from '../../providers/tokens';
import { ILLMProvider } from '../../providers/interfaces/llm-provider.interface';
import { InputSanitizer } from './sanitization/input-sanitizer';

describe('LlmService', () => {
  let service: LlmService;
  let mockAnthropicAdapter: jest.Mocked<ILLMProvider>;
  let mockOpenAIAdapter: jest.Mocked<ILLMProvider>;
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
      fallbackOrder: ['anthropic', 'openai'],
    },
  };

  const mockPlanData = {
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
  };

  beforeEach(async () => {
    mockAnthropicAdapter = {
      name: 'anthropic',
      generateText: jest.fn(),
      generateJSON: jest.fn().mockResolvedValue({
        data: mockPlanData,
        tokensUsed: 1500,
        cost: 0.005,
      }),
      validateApiKey: jest.fn().mockResolvedValue(true),
      estimateCost: jest.fn().mockReturnValue(0.005),
    };

    mockOpenAIAdapter = {
      name: 'openai',
      generateText: jest.fn(),
      generateJSON: jest.fn().mockResolvedValue({
        data: mockPlanData,
        tokensUsed: 1200,
        cost: 0.004,
      }),
      validateApiKey: jest.fn().mockResolvedValue(true),
      estimateCost: jest.fn().mockReturnValue(0.004),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: LLM_PROVIDER,
          useValue: [mockAnthropicAdapter, mockOpenAIAdapter],
        },
        InputSanitizer,
      ],
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
          primaryProvider: undefined,
          fallbackEnabled: true,
          fallbackOrder: [],
        },
      };

      await expect(
        service.generatePlan(mockWizardData, emptyConfig),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use primary provider adapter when configured', async () => {
      const result = await service.generatePlan(mockWizardData, mockUserConfig);

      expect(mockAnthropicAdapter.generateJSON).toHaveBeenCalled();
      expect(result).toEqual({
        plan: mockPlanData,
        provider: 'anthropic',
        tokensUsed: 1500,
        cost: 0.005,
      });
    });

    it('should fallback to next adapter on failure', async () => {
      mockAnthropicAdapter.generateJSON.mockRejectedValueOnce(
        new Error('Anthropic API error'),
      );

      const result = await service.generatePlan(mockWizardData, mockUserConfig);

      expect(mockAnthropicAdapter.generateJSON).toHaveBeenCalled();
      expect(mockOpenAIAdapter.generateJSON).toHaveBeenCalled();
      expect(result.provider).toBe('openai');
    });

    it('should throw when fallback is disabled and primary fails', async () => {
      mockAnthropicAdapter.generateJSON.mockRejectedValueOnce(
        new Error('API error'),
      );

      const noFallbackConfig: UserLLMConfig = {
        ...mockUserConfig,
        preferences: {
          ...mockUserConfig.preferences,
          fallbackEnabled: false,
        },
      };

      await expect(
        service.generatePlan(mockWizardData, noFallbackConfig),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when all providers fail', async () => {
      mockAnthropicAdapter.generateJSON.mockRejectedValueOnce(
        new Error('Anthropic error'),
      );
      mockOpenAIAdapter.generateJSON.mockRejectedValueOnce(
        new Error('OpenAI error'),
      );

      await expect(
        service.generatePlan(mockWizardData, mockUserConfig),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost using default provider (anthropic) when no config', () => {
      const cost = service.estimateCost(mockWizardData);

      expect(mockAnthropicAdapter.estimateCost).toHaveBeenCalled();
      expect(cost).toBe(0.005);
    });

    it('should estimate cost using user primary provider', () => {
      const openaiConfig: UserLLMConfig = {
        ...mockUserConfig,
        preferences: {
          ...mockUserConfig.preferences,
          primaryProvider: 'openai',
        },
      };

      const cost = service.estimateCost(mockWizardData, openaiConfig);

      expect(mockOpenAIAdapter.estimateCost).toHaveBeenCalled();
      expect(cost).toBe(0.004);
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
    it('should return adapter names', () => {
      const providers = service.getAvailableProviders();

      expect(providers).toEqual(['anthropic', 'openai']);
    });
  });

  describe('validateApiKey', () => {
    it('should return false for unknown provider', async () => {
      const result = await service.validateApiKey('nonexistent', 'some-key');
      expect(result).toBe(false);
    });

    it('should delegate to adapter validateApiKey', async () => {
      const result = await service.validateApiKey('anthropic', 'test-key');

      expect(mockAnthropicAdapter.validateApiKey).toHaveBeenCalledWith(
        'test-key',
      );
      expect(result).toBe(true);
    });
  });
});
