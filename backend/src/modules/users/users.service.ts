import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, LLMProviderConfig, LLMPreferences } from './user.schema';
import { EncryptionService } from './encryption.service';

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
}

export interface UpdateUserDto {
  name?: string;
  isActive?: boolean;
}

export interface SetLLMApiKeyDto {
  provider: 'anthropic' | 'openai' | 'gemini';
  apiKey: string;
}

export interface UpdateLLMPreferencesDto {
  primaryProvider?: string;
  fallbackEnabled?: boolean;
  fallbackOrder?: string[];
}

export interface LLMProviderStatus {
  provider: string;
  isConfigured: boolean;
  isActive: boolean;
  maskedKey?: string;
  addedAt?: Date;
}

// Provider info for user guidance
export const LLM_PROVIDERS_INFO = {
  anthropic: {
    name: 'Claude (Anthropic)',
    description: 'Modelos Claude - Excelente para razonamiento y código',
    recommended: true,
    freeCredits: false,
    pricing: 'Desde $3/millón tokens',
    signupUrl: 'https://console.anthropic.com/',
    docsUrl: 'https://docs.anthropic.com/en/api/getting-started',
    keyFormat: 'sk-ant-...',
  },
  openai: {
    name: 'GPT-4 (OpenAI)',
    description: 'Modelos GPT - Muy versátil y popular',
    recommended: true,
    freeCredits: true,
    pricing: 'Desde $0.03/1K tokens, $5 créditos gratis',
    signupUrl: 'https://platform.openai.com/signup',
    docsUrl: 'https://platform.openai.com/docs/quickstart',
    keyFormat: 'sk-...',
  },
  gemini: {
    name: 'Gemini (Google)',
    description: 'Modelos Gemini - Gratis hasta cierto uso',
    recommended: false,
    freeCredits: true,
    pricing: 'Gratis hasta 60 consultas/minuto',
    signupUrl: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/tutorials/setup',
    keyFormat: 'AI...',
  },
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private encryptionService: EncryptionService,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email: createUserDto.email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password -refreshToken');
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      updateUserDto,
      { new: true },
    ).select('-password -refreshToken');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    const hashedRefreshToken = refreshToken
      ? await bcrypt.hash(refreshToken, 10)
      : null;

    await this.userModel.findByIdAndUpdate(id, {
      refreshToken: hashedRefreshToken,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      lastLoginAt: new Date(),
    });
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async validateRefreshToken(id: string, refreshToken: string): Promise<boolean> {
    const user = await this.userModel.findById(id);
    if (!user || !user.refreshToken) {
      return false;
    }
    return bcrypt.compare(refreshToken, user.refreshToken);
  }

  async delete(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  // ==================== LLM API Keys Management ====================

  async setLLMApiKey(userId: string, dto: SetLLMApiKeyDto): Promise<LLMProviderStatus> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const validProviders = ['anthropic', 'openai', 'gemini'];
    if (!validProviders.includes(dto.provider)) {
      throw new BadRequestException(`Invalid provider. Must be one of: ${validProviders.join(', ')}`);
    }

    // Basic validation of API key format
    if (!dto.apiKey || dto.apiKey.trim().length < 10) {
      throw new BadRequestException('API key is too short');
    }

    // Encrypt the API key
    const encryptedKey = this.encryptionService.encrypt(dto.apiKey.trim());

    // Update the user's LLM API keys
    const llmApiKeys = user.llmApiKeys || {};
    llmApiKeys[dto.provider] = {
      apiKey: encryptedKey,
      isActive: true,
      addedAt: new Date(),
    };

    // If this is the first key, set it as primary
    let llmPreferences = user.llmPreferences || {
      primaryProvider: null,
      fallbackEnabled: true,
      fallbackOrder: ['anthropic', 'gemini', 'openai'],
    };

    if (!llmPreferences.primaryProvider) {
      llmPreferences.primaryProvider = dto.provider;
    }

    await this.userModel.findByIdAndUpdate(userId, {
      llmApiKeys,
      llmPreferences,
    });

    return {
      provider: dto.provider,
      isConfigured: true,
      isActive: true,
      maskedKey: this.encryptionService.maskApiKey(dto.apiKey),
      addedAt: new Date(),
    };
  }

  async removeLLMApiKey(userId: string, provider: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const llmApiKeys = user.llmApiKeys || {};
    if (!llmApiKeys[provider]) {
      throw new NotFoundException(`No API key found for provider: ${provider}`);
    }

    delete llmApiKeys[provider];

    // If we removed the primary provider, set a new one
    let llmPreferences = user.llmPreferences;
    if (llmPreferences?.primaryProvider === provider) {
      const remainingProviders = Object.keys(llmApiKeys).filter(
        (p) => llmApiKeys[p]?.isActive,
      );
      llmPreferences.primaryProvider = remainingProviders[0] || undefined;
    }

    await this.userModel.findByIdAndUpdate(userId, {
      llmApiKeys,
      llmPreferences,
    });
  }

  async getLLMApiKeysStatus(userId: string): Promise<LLMProviderStatus[]> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const llmApiKeys = user.llmApiKeys || {};
    const allProviders = ['anthropic', 'openai', 'gemini'];

    return allProviders.map((provider) => {
      const config = llmApiKeys[provider];
      if (config) {
        // Decrypt to get masked version
        try {
          const decryptedKey = this.encryptionService.decrypt(config.apiKey);
          return {
            provider,
            isConfigured: true,
            isActive: config.isActive,
            maskedKey: this.encryptionService.maskApiKey(decryptedKey),
            addedAt: config.addedAt,
          };
        } catch {
          return {
            provider,
            isConfigured: false,
            isActive: false,
          };
        }
      }
      return {
        provider,
        isConfigured: false,
        isActive: false,
      };
    });
  }

  async getLLMPreferences(userId: string): Promise<LLMPreferences> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return (
      user.llmPreferences || {
        primaryProvider: null,
        fallbackEnabled: true,
        fallbackOrder: ['anthropic', 'gemini', 'openai'],
      }
    );
  }

  async updateLLMPreferences(
    userId: string,
    dto: UpdateLLMPreferencesDto,
  ): Promise<LLMPreferences> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentPrefs = user.llmPreferences || {
      primaryProvider: null,
      fallbackEnabled: true,
      fallbackOrder: ['anthropic', 'gemini', 'openai'],
    };

    // Validate primary provider if provided
    if (dto.primaryProvider) {
      const llmApiKeys = user.llmApiKeys || {};
      if (!llmApiKeys[dto.primaryProvider]?.isActive) {
        throw new BadRequestException(
          `Cannot set ${dto.primaryProvider} as primary - no active API key configured`,
        );
      }
    }

    const updatedPrefs: LLMPreferences = {
      primaryProvider: dto.primaryProvider ?? currentPrefs.primaryProvider,
      fallbackEnabled: dto.fallbackEnabled ?? currentPrefs.fallbackEnabled,
      fallbackOrder: dto.fallbackOrder ?? currentPrefs.fallbackOrder,
    };

    await this.userModel.findByIdAndUpdate(userId, {
      llmPreferences: updatedPrefs,
    });

    return updatedPrefs;
  }

  async toggleLLMApiKey(userId: string, provider: string, isActive: boolean): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const llmApiKeys = user.llmApiKeys || {};
    if (!llmApiKeys[provider]) {
      throw new NotFoundException(`No API key found for provider: ${provider}`);
    }

    llmApiKeys[provider].isActive = isActive;

    await this.userModel.findByIdAndUpdate(userId, { llmApiKeys });
  }

  // Get decrypted API key for a specific provider (used by LLM service)
  async getDecryptedLLMApiKey(userId: string, provider: string): Promise<string | null> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return null;
    }

    const config = user.llmApiKeys?.[provider];
    if (!config?.isActive) {
      return null;
    }

    try {
      return this.encryptionService.decrypt(config.apiKey);
    } catch {
      return null;
    }
  }

  // Get all active API keys for a user (used by LLM service)
  async getActiveLLMApiKeys(userId: string): Promise<Record<string, string>> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return {};
    }

    const result: Record<string, string> = {};
    const llmApiKeys = user.llmApiKeys || {};

    for (const [provider, config] of Object.entries(llmApiKeys)) {
      if (config?.isActive) {
        try {
          result[provider] = this.encryptionService.decrypt(config.apiKey);
        } catch {
          // Skip invalid keys
        }
      }
    }

    return result;
  }

  // Check if user has any LLM provider configured
  async hasLLMConfigured(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return false;
    }

    const llmApiKeys = user.llmApiKeys || {};
    return Object.values(llmApiKeys).some((config) => config?.isActive);
  }

  // Get providers info for frontend
  getProvidersInfo() {
    return LLM_PROVIDERS_INFO;
  }

  // ==================== GitHub Integration ====================

  async connectGitHub(
    userId: string,
    githubId: string,
    accessToken: string,
    username: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Encrypt the access token
    const encryptedToken = this.encryptionService.encrypt(accessToken);

    await this.userModel.findByIdAndUpdate(userId, {
      githubId,
      githubAccessToken: encryptedToken,
      githubUsername: username,
      githubConnectedAt: new Date(),
    });
  }

  async disconnectGitHub(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userModel.findByIdAndUpdate(userId, {
      $unset: {
        githubId: '',
        githubAccessToken: '',
        githubUsername: '',
        githubConnectedAt: '',
      },
    });
  }

  async getGitHubConnectionStatus(userId: string): Promise<{
    connected: boolean;
    username?: string;
    connectedAt?: Date;
  }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.githubId && user.githubAccessToken) {
      return {
        connected: true,
        username: user.githubUsername,
        connectedAt: user.githubConnectedAt,
      };
    }

    return { connected: false };
  }

  async getGitHubAccessToken(userId: string): Promise<string | null> {
    const user = await this.userModel.findById(userId);
    if (!user?.githubAccessToken) return null;

    try {
      // Try to decrypt
      return this.encryptionService.decrypt(user.githubAccessToken);
    } catch (error) {
      // If decryption fails, it might be an old unencrypted token
      // or the key/salt changed. For now, return as is if it doesn't look like
      // an encrypted string (doesn't contain colons or is significantly shorter/different format)
      // Check if it matches iv:tag:content format (hex strings)
      const parts = user.githubAccessToken.split(':');
      if (parts.length === 3) {
        // It WAS encrypted but failed (wrong key/salt?), return null to be safe
        console.error('Failed to decrypt GitHub token for user', userId, error);
        return null; // Force re-authentication
      }

      // Fallback: assume it's a legacy unencrypted token
      return user.githubAccessToken;
    }
  }

  async findByGitHubId(githubId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ githubId });
  }
}
