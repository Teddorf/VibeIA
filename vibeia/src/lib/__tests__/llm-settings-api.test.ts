/**
 * LLM Settings API Tests
 * TDD: Tests written BEFORE implementation validation
 *
 * Estos tests validan que el API client funcione correctamente
 * con el backend de configuración de proveedores de IA
 */
import apiClient, { llmSettingsApi } from '../api-client';

// Use jest.spyOn to mock apiClient methods
describe('llmSettingsApi', () => {
  let getSpy: jest.SpyInstance;
  let postSpy: jest.SpyInstance;
  let patchSpy: jest.SpyInstance;
  let deleteSpy: jest.SpyInstance;

  beforeEach(() => {
    getSpy = jest.spyOn(apiClient, 'get');
    postSpy = jest.spyOn(apiClient, 'post');
    patchSpy = jest.spyOn(apiClient, 'patch');
    deleteSpy = jest.spyOn(apiClient, 'delete');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================
  // GET MY KEYS
  // ============================================
  describe('getMyKeys', () => {
    it('should return all providers with their status', async () => {
      // Arrange
      const mockResponse = {
        data: {
          keys: [
            { provider: 'anthropic', isConfigured: false, isActive: false },
            { provider: 'openai', isConfigured: true, isActive: true, maskedKey: 'sk-...xxx' },
            { provider: 'gemini', isConfigured: false, isActive: false },
          ],
          preferences: { primaryProvider: 'openai', fallbackEnabled: true, fallbackOrder: ['anthropic', 'gemini'] },
          hasAnyConfigured: true,
          providersInfo: {
            anthropic: { name: 'Claude (Anthropic)', signupUrl: 'https://console.anthropic.com/' },
            openai: { name: 'GPT-4 (OpenAI)', signupUrl: 'https://platform.openai.com/signup' },
            gemini: { name: 'Gemini (Google)', signupUrl: 'https://aistudio.google.com/app/apikey' },
          },
        },
      };
      getSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.getMyKeys();

      // Assert
      expect(getSpy).toHaveBeenCalledWith('/api/users/me/llm/keys');
      expect(result.keys).toHaveLength(3);
      expect(result.hasAnyConfigured).toBe(true);
      expect(result.preferences.primaryProvider).toBe('openai');
    });

    it('should return hasAnyConfigured=false when no keys configured', async () => {
      // Arrange
      const mockResponse = {
        data: {
          keys: [
            { provider: 'anthropic', isConfigured: false, isActive: false },
            { provider: 'openai', isConfigured: false, isActive: false },
            { provider: 'gemini', isConfigured: false, isActive: false },
          ],
          preferences: { primaryProvider: null, fallbackEnabled: false, fallbackOrder: [] },
          hasAnyConfigured: false,
          providersInfo: {},
        },
      };
      getSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.getMyKeys();

      // Assert
      expect(result.hasAnyConfigured).toBe(false);
      expect(result.preferences.primaryProvider).toBeNull();
    });

    it('should include providersInfo with signup URLs', async () => {
      // Arrange
      const mockResponse = {
        data: {
          keys: [],
          preferences: {},
          hasAnyConfigured: false,
          providersInfo: {
            openai: {
              name: 'GPT-4 (OpenAI)',
              signupUrl: 'https://platform.openai.com/signup',
              keyFormat: 'sk-...',
              freeCredits: true,
            },
          },
        },
      };
      getSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.getMyKeys();

      // Assert
      expect(result.providersInfo.openai.signupUrl).toBe('https://platform.openai.com/signup');
      expect(result.providersInfo.openai.freeCredits).toBe(true);
    });
  });

  // ============================================
  // SET KEY
  // ============================================
  describe('setKey', () => {
    it('should save API key for valid provider', async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          provider: 'openai',
          message: 'API key saved successfully'
        },
      };
      postSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.setKey('openai', 'sk-test-key-12345');

      // Assert
      expect(postSpy).toHaveBeenCalledWith('/api/users/me/llm/keys', {
        provider: 'openai',
        apiKey: 'sk-test-key-12345',
      });
      expect(result.success).toBe(true);
    });

    it('should handle Anthropic key format', async () => {
      // Arrange
      const mockResponse = { data: { success: true } };
      postSpy.mockResolvedValue(mockResponse);

      // Act
      await llmSettingsApi.setKey('anthropic', 'sk-ant-api03-xxxxx');

      // Assert
      expect(postSpy).toHaveBeenCalledWith('/api/users/me/llm/keys', {
        provider: 'anthropic',
        apiKey: 'sk-ant-api03-xxxxx',
      });
    });

    it('should handle Gemini key format', async () => {
      // Arrange
      const mockResponse = { data: { success: true } };
      postSpy.mockResolvedValue(mockResponse);

      // Act
      await llmSettingsApi.setKey('gemini', 'AIzaSyXXXXXXXXXXXXXX');

      // Assert
      expect(postSpy).toHaveBeenCalledWith('/api/users/me/llm/keys', {
        provider: 'gemini',
        apiKey: 'AIzaSyXXXXXXXXXXXXXX',
      });
    });

    it('should reject invalid API key', async () => {
      // Arrange
      const error = {
        response: {
          status: 400,
          data: { message: 'Invalid API key format' },
        },
      };
      postSpy.mockRejectedValue(error);

      // Act & Assert
      await expect(llmSettingsApi.setKey('openai', 'invalid')).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  // ============================================
  // TEST KEY
  // ============================================
  describe('testKey', () => {
    it('should return success for valid key', async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          message: 'API key is valid and working!'
        },
      };
      postSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.testKey('openai');

      // Assert
      expect(postSpy).toHaveBeenCalledWith('/api/users/me/llm/keys/openai/test');
      expect(result.success).toBe(true);
    });

    it('should return error for invalid key', async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: false,
          error: 'Invalid API key'
        },
      };
      postSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.testKey('openai');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should return error when no key configured', async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: false,
          error: 'No API key configured for this provider'
        },
      };
      postSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.testKey('anthropic');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('No API key configured');
    });
  });

  // ============================================
  // REMOVE KEY
  // ============================================
  describe('removeKey', () => {
    it('should remove API key for provider', async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          message: 'API key for openai removed'
        },
      };
      deleteSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.removeKey('openai');

      // Assert
      expect(deleteSpy).toHaveBeenCalledWith('/api/users/me/llm/keys/openai');
      expect(result.success).toBe(true);
    });

    it('should handle removing non-existent key', async () => {
      // Arrange
      const error = {
        response: {
          status: 404,
          data: { message: 'No API key found for this provider' },
        },
      };
      deleteSpy.mockRejectedValue(error);

      // Act & Assert
      await expect(llmSettingsApi.removeKey('anthropic')).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  // ============================================
  // UPDATE PREFERENCES
  // ============================================
  describe('updatePreferences', () => {
    it('should set primary provider', async () => {
      // Arrange
      const mockResponse = {
        data: {
          primaryProvider: 'anthropic',
          fallbackEnabled: true,
          fallbackOrder: ['openai', 'gemini'],
        },
      };
      patchSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.updatePreferences({ primaryProvider: 'anthropic' });

      // Assert
      expect(patchSpy).toHaveBeenCalledWith('/api/users/me/llm/preferences', {
        primaryProvider: 'anthropic',
      });
      expect(result.primaryProvider).toBe('anthropic');
    });

    it('should update fallback order', async () => {
      // Arrange
      const mockResponse = {
        data: {
          fallbackOrder: ['gemini', 'openai'],
        },
      };
      patchSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.updatePreferences({
        fallbackOrder: ['gemini', 'openai']
      });

      // Assert
      expect(result.fallbackOrder).toEqual(['gemini', 'openai']);
    });
  });

  // ============================================
  // CHECK SETUP REQUIRED
  // ============================================
  describe('checkSetupRequired', () => {
    it('should return setupRequired=true when no LLM configured', async () => {
      // Arrange
      const mockResponse = {
        data: {
          setupRequired: true,
          message: 'Please configure at least one AI provider to use VibeIA',
        },
      };
      getSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.checkSetupRequired();

      // Assert
      expect(getSpy).toHaveBeenCalledWith('/api/users/me/llm/setup-required');
      expect(result.setupRequired).toBe(true);
    });

    it('should return setupRequired=false when LLM is configured', async () => {
      // Arrange
      const mockResponse = {
        data: {
          setupRequired: false,
          message: 'You have at least one AI provider configured',
        },
      };
      getSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.checkSetupRequired();

      // Assert
      expect(result.setupRequired).toBe(false);
    });
  });

  // ============================================
  // GET PROVIDERS INFO
  // ============================================
  describe('getProvidersInfo', () => {
    it('should return all providers info', async () => {
      // Arrange
      const mockResponse = {
        data: {
          providers: {
            anthropic: {
              name: 'Claude (Anthropic)',
              description: 'Modelos Claude - Excelente para razonamiento y código',
              recommended: true,
            },
            openai: {
              name: 'GPT-4 (OpenAI)',
              description: 'Modelos GPT - Muy versátil y popular',
              freeCredits: true,
            },
            gemini: {
              name: 'Gemini (Google)',
              description: 'Modelos Gemini - Gratis hasta cierto uso',
              freeCredits: true,
            },
          },
          recommendation: {
            forBeginners: 'openai',
            forBestQuality: 'anthropic',
            forFree: 'gemini',
          },
        },
      };
      getSpy.mockResolvedValue(mockResponse);

      // Act
      const result = await llmSettingsApi.getProvidersInfo();

      // Assert
      expect(getSpy).toHaveBeenCalledWith('/api/users/llm/providers');
      expect(result.providers.anthropic.recommended).toBe(true);
      expect(result.recommendation.forBeginners).toBe('openai');
    });
  });
});
