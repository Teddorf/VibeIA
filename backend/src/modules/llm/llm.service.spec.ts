import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from './llm.service';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';

// Mock the providers
jest.mock('./providers/anthropic.provider');
jest.mock('./providers/openai.provider');

describe('LlmService', () =\u003e {
  let service: LlmService;
  let anthropicProvider: jest.Mocked\u003cAnthropicProvider\u003e;
  let openaiProvider: jest.Mocked\u003cOpenAIProvider\u003e;

  const mockWizardData = {
    stage1: { projectName: 'Test Project', description: 'Test Description' },
    stage2: { target_users: 'Developers', main_features: 'API, Dashboard' },
    stage3: { selectedArchetypes: ['auth-jwt-stateless'] },
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

  beforeEach(async () =\u003e {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LlmService],
    }).compile();

    service = module.get\u003cLlmService\u003e(LlmService);

    // Get mocked providers
    anthropicProvider = (service as any).providers.get('anthropic');
    openaiProvider = (service as any).providers.get('openai');
  });

  afterEach(() =\u003e {
    jest.clearAllMocks();
  });

  describe('generatePlan', () =\u003e {
    it('should generate plan using primary provider (Anthropic)', async () =\u003e {
      anthropicProvider.generatePlan = jest.fn().mockResolvedValue(mockPlanResponse);

      const result = await service.generatePlan(mockWizardData);

      expect(anthropicProvider.generatePlan).toHaveBeenCalledWith(mockWizardData);
      expect(result).toEqual(mockPlanResponse);
      expect(result.provider).toBe('anthropic');
    });

    it('should fallback to OpenAI when Anthropic fails', async () =\u003e {
      const openaiResponse = { ...mockPlanResponse, provider: 'openai' };
      
      anthropicProvider.generatePlan = jest.fn().mockRejectedValue(new Error('Anthropic API error'));
      openaiProvider.generatePlan = jest.fn().mockResolvedValue(openaiResponse);

      const result = await service.generatePlan(mockWizardData);

      expect(anthropicProvider.generatePlan).toHaveBeenCalledWith(mockWizardData);
      expect(openaiProvider.generatePlan).toHaveBeenCalledWith(mockWizardData);
      expect(result).toEqual(openaiResponse);
      expect(result.provider).toBe('openai');
    });

    it('should throw error when both providers fail', async () =\u003e {
      anthropicProvider.generatePlan = jest.fn().mockRejectedValue(new Error('Anthropic error'));
      openaiProvider.generatePlan = jest.fn().mockRejectedValue(new Error('OpenAI error'));

      await expect(service.generatePlan(mockWizardData)).rejects.toThrow();
    });
  });

  describe('estimateCost', () =\u003e {
    it('should estimate cost using primary provider', () =\u003e {
      anthropicProvider.estimateCost = jest.fn().mockReturnValue(0.01);

      const cost = service.estimateCost(mockWizardData);

      expect(anthropicProvider.estimateCost).toHaveBeenCalled();
      expect(cost).toBe(0.01);
    });

    it('should return 0 if provider not found', () =\u003e {
      (service as any).primaryProvider = 'nonexistent';

      const cost = service.estimateCost(mockWizardData);

      expect(cost).toBe(0);
    });
  });
});
