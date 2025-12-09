import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UsersService,
  SetLLMApiKeyDto,
  UpdateLLMPreferencesDto,
  LLM_PROVIDERS_INFO,
} from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================== LLM Settings Endpoints ====================

  /**
   * Get all available LLM providers info (for setup guidance)
   */
  @Get('llm/providers')
  getProvidersInfo() {
    return {
      providers: LLM_PROVIDERS_INFO,
      recommendation: {
        forBeginners: 'openai',
        forBestQuality: 'anthropic',
        forFree: 'gemini',
        message:
          'Te recomendamos empezar con OpenAI - tiene $5 de créditos gratis y es muy fácil de configurar.',
      },
    };
  }

  /**
   * Get current user's LLM API keys status (masked)
   */
  @Get('me/llm/keys')
  async getMyLLMKeys(@Request() req: any) {
    const keys = await this.usersService.getLLMApiKeysStatus(req.user.userId);
    const preferences = await this.usersService.getLLMPreferences(req.user.userId);
    const hasAnyConfigured = await this.usersService.hasLLMConfigured(req.user.userId);

    return {
      keys,
      preferences,
      hasAnyConfigured,
      providersInfo: LLM_PROVIDERS_INFO,
    };
  }

  /**
   * Set or update an LLM API key
   */
  @Post('me/llm/keys')
  async setMyLLMKey(@Request() req: any, @Body() dto: SetLLMApiKeyDto) {
    return this.usersService.setLLMApiKey(req.user.userId, dto);
  }

  /**
   * Remove an LLM API key
   */
  @Delete('me/llm/keys/:provider')
  async removeMyLLMKey(@Request() req: any, @Param('provider') provider: string) {
    await this.usersService.removeLLMApiKey(req.user.userId, provider);
    return { success: true, message: `API key for ${provider} removed` };
  }

  /**
   * Toggle an LLM API key active/inactive
   */
  @Patch('me/llm/keys/:provider/toggle')
  async toggleMyLLMKey(
    @Request() req: any,
    @Param('provider') provider: string,
    @Body('isActive') isActive: boolean,
  ) {
    await this.usersService.toggleLLMApiKey(req.user.userId, provider, isActive);
    return { success: true, isActive };
  }

  /**
   * Get LLM preferences
   */
  @Get('me/llm/preferences')
  async getMyLLMPreferences(@Request() req: any) {
    return this.usersService.getLLMPreferences(req.user.userId);
  }

  /**
   * Update LLM preferences
   */
  @Patch('me/llm/preferences')
  async updateMyLLMPreferences(
    @Request() req: any,
    @Body() dto: UpdateLLMPreferencesDto,
  ) {
    return this.usersService.updateLLMPreferences(req.user.userId, dto);
  }

  /**
   * Test an LLM API key (validates it works)
   */
  @Post('me/llm/keys/:provider/test')
  async testLLMKey(@Request() req: any, @Param('provider') provider: string) {
    const apiKey = await this.usersService.getDecryptedLLMApiKey(
      req.user.userId,
      provider,
    );

    if (!apiKey) {
      return {
        success: false,
        error: 'No API key configured for this provider',
      };
    }

    // Test the key based on provider
    try {
      switch (provider) {
        case 'anthropic':
          const Anthropic = require('@anthropic-ai/sdk').default;
          const anthropic = new Anthropic({ apiKey });
          await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          });
          break;

        case 'openai':
          const OpenAI = require('openai').default;
          const openai = new OpenAI({ apiKey });
          await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          });
          break;

        case 'gemini':
          const { GoogleGenerativeAI } = require('@google/generative-ai');
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          await model.generateContent('Hi');
          break;

        default:
          return { success: false, error: 'Unknown provider' };
      }

      return { success: true, message: 'API key is valid and working!' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to validate API key',
      };
    }
  }

  /**
   * Check if user needs to configure LLM (for onboarding flow)
   */
  @Get('me/llm/setup-required')
  async checkSetupRequired(@Request() req: any) {
    const hasConfigured = await this.usersService.hasLLMConfigured(req.user.userId);
    return {
      setupRequired: !hasConfigured,
      message: hasConfigured
        ? 'You have at least one AI provider configured'
        : 'Please configure at least one AI provider to use VibeIA',
    };
  }
}
