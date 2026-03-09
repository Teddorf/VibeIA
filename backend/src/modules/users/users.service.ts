import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  User,
  UserDocument,
  LLMProviderConfig,
  LLMPreferences,
} from './user.schema';
import { EncryptionService } from './encryption.service';
import {
  BCRYPT_SALT_ROUNDS,
  ENCRYPTED_TOKEN_PARTS,
} from '../auth/auth.constants';
import { IRepository } from '../../providers/interfaces/database-provider.interface';
import { USER_REPOSITORY } from '../../providers/repository-tokens';

type UserDoc = UserDocument;

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
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IRepository<UserDoc>,
    private encryptionService: EncryptionService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDoc> {
    // Check if user already exists
    const existingUser = await this.userRepo.findOne({
      email: createUserDto.email,
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    return this.userRepo.create({
      ...createUserDto,
      password: hashedPassword,
    });
  }

  async findByEmail(email: string): Promise<UserDoc | null> {
    return this.userRepo.findOne({ email });
  }

  async findById(id: string): Promise<UserDoc | null> {
    return this.userRepo.findById(id);
  }

  async findAll(): Promise<UserDoc[]> {
    return this.userRepo.find({}, { select: '-password -refreshToken' });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDoc> {
    const user = await this.userRepo.update(id, updateUserDto);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<void> {
    const hashedRefreshToken = refreshToken
      ? await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS)
      : null;

    await this.userRepo.update(id, {
      refreshToken: hashedRefreshToken,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepo.update(id, {
      lastLoginAt: new Date(),
    });
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async validateRefreshToken(
    id: string,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.userRepo.findById(id);
    if (!user || !user.refreshToken) {
      return false;
    }
    return bcrypt.compare(refreshToken, user.refreshToken);
  }

  async findRefreshTokenOwner(refreshToken: string): Promise<string | null> {
    const users = await this.userRepo.find(
      { refreshToken: { $exists: true, $ne: null } },
      { select: '_id refreshToken' },
    );

    for (const user of users) {
      if ((user as any).refreshToken) {
        const isMatch = await bcrypt.compare(
          refreshToken,
          (user as any).refreshToken,
        );
        if (isMatch) {
          return ((user as any)._id || (user as any).id).toString();
        }
      }
    }

    return null;
  }

  async delete(id: string): Promise<void> {
    const result = await this.userRepo.delete(id);
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  // ==================== Password Reset ====================

  async setPasswordResetToken(
    email: string,
  ): Promise<{ token: string; user: UserDoc } | null> {
    const user = await this.userRepo.findOne({ email });
    if (!user) {
      return null;
    }

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const userId = (user as any)._id || (user as any).id;
    await this.userRepo.update(userId.toString(), {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 3600000),
    });

    return { token, user };
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepo.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return false;
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    const userId = (user as any)._id || (user as any).id;

    await this.userRepo.update(userId.toString(), {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    });

    return true;
  }

  async verifyResetToken(token: string): Promise<boolean> {
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userRepo.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    return !!user;
  }

  // ==================== LLM API Keys Management ====================

  async setLLMApiKey(
    userId: string,
    dto: SetLLMApiKeyDto,
  ): Promise<LLMProviderStatus> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const validProviders = ['anthropic', 'openai', 'gemini'];
    if (!validProviders.includes(dto.provider)) {
      throw new BadRequestException(
        `Invalid provider. Must be one of: ${validProviders.join(', ')}`,
      );
    }

    if (!dto.apiKey || dto.apiKey.trim().length < 10) {
      throw new BadRequestException('API key is too short');
    }

    const encryptedKey = this.encryptionService.encrypt(dto.apiKey.trim());

    const llmApiKeys = user.llmApiKeys || {};
    llmApiKeys[dto.provider] = {
      apiKey: encryptedKey,
      isActive: true,
      addedAt: new Date(),
    };

    let llmPreferences = user.llmPreferences || {
      primaryProvider: null,
      fallbackEnabled: true,
      fallbackOrder: ['anthropic', 'gemini', 'openai'],
    };

    if (!llmPreferences.primaryProvider) {
      llmPreferences.primaryProvider = dto.provider;
    }

    await this.userRepo.update(userId, {
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
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const llmApiKeys = user.llmApiKeys || {};
    if (!llmApiKeys[provider]) {
      throw new NotFoundException(`No API key found for provider: ${provider}`);
    }

    delete llmApiKeys[provider];

    let llmPreferences = user.llmPreferences;
    if (llmPreferences?.primaryProvider === provider) {
      const remainingProviders = Object.keys(llmApiKeys).filter(
        (p) => llmApiKeys[p]?.isActive,
      );
      llmPreferences.primaryProvider = remainingProviders[0] || undefined;
    }

    await this.userRepo.update(userId, {
      llmApiKeys,
      llmPreferences,
    });
  }

  async getLLMApiKeysStatus(userId: string): Promise<LLMProviderStatus[]> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const llmApiKeys = user.llmApiKeys || {};
    const allProviders = ['anthropic', 'openai', 'gemini'];

    return allProviders.map((provider) => {
      const config = llmApiKeys[provider];
      if (config) {
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
    const user = await this.userRepo.findById(userId);
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
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentPrefs = user.llmPreferences || {
      primaryProvider: null,
      fallbackEnabled: true,
      fallbackOrder: ['anthropic', 'gemini', 'openai'],
    };

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

    await this.userRepo.update(userId, {
      llmPreferences: updatedPrefs,
    });

    return updatedPrefs;
  }

  async toggleLLMApiKey(
    userId: string,
    provider: string,
    isActive: boolean,
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const llmApiKeys = user.llmApiKeys || {};
    if (!llmApiKeys[provider]) {
      throw new NotFoundException(`No API key found for provider: ${provider}`);
    }

    llmApiKeys[provider].isActive = isActive;

    await this.userRepo.update(userId, { llmApiKeys });
  }

  async getDecryptedLLMApiKey(
    userId: string,
    provider: string,
  ): Promise<string | null> {
    const user = await this.userRepo.findById(userId);
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

  async getActiveLLMApiKeys(userId: string): Promise<Record<string, string>> {
    const user = await this.userRepo.findById(userId);
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

  async hasLLMConfigured(userId: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      return false;
    }

    const llmApiKeys = user.llmApiKeys || {};
    return Object.values(llmApiKeys).some((config) => config?.isActive);
  }

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
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const encryptedToken = this.encryptionService.encrypt(accessToken);

    await this.userRepo.update(userId, {
      githubId,
      githubAccessToken: encryptedToken,
      githubUsername: username,
      githubConnectedAt: new Date(),
    });
  }

  async disconnectGitHub(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepo.update(userId, {
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
    const user = await this.userRepo.findById(userId);
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

  private getDecryptedOAuthToken(
    encryptedToken: string | undefined,
    provider: string,
    userId: string,
  ): string | null {
    if (!encryptedToken) return null;

    try {
      return this.encryptionService.decrypt(encryptedToken);
    } catch (error) {
      const parts = encryptedToken.split(':');
      if (parts.length === ENCRYPTED_TOKEN_PARTS) {
        this.logger.warn(
          `Failed to decrypt ${provider} token for user ${userId}, forcing re-authentication`,
        );
        return null;
      }
      return encryptedToken;
    }
  }

  async getGitHubAccessToken(userId: string): Promise<string | null> {
    const user = await this.userRepo.findById(userId);
    return this.getDecryptedOAuthToken(
      user?.githubAccessToken,
      'GitHub',
      userId,
    );
  }

  async findByGitHubId(githubId: string): Promise<UserDoc | null> {
    return this.userRepo.findOne({ githubId });
  }

  // ==================== Google Integration ====================

  async connectGoogle(
    userId: string,
    googleId: string,
    accessToken: string,
    email: string,
    name: string,
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const encryptedToken = this.encryptionService.encrypt(accessToken);

    await this.userRepo.update(userId, {
      googleId,
      googleAccessToken: encryptedToken,
      googleEmail: email,
      googleName: name,
      googleConnectedAt: new Date(),
    });
  }

  async disconnectGoogle(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepo.update(userId, {
      $unset: {
        googleId: '',
        googleAccessToken: '',
        googleEmail: '',
        googleName: '',
        googleConnectedAt: '',
      },
    });
  }

  async getGoogleConnectionStatus(userId: string): Promise<{
    connected: boolean;
    email?: string;
    name?: string;
    connectedAt?: Date;
  }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.googleId && user.googleAccessToken) {
      return {
        connected: true,
        email: user.googleEmail,
        name: user.googleName,
        connectedAt: user.googleConnectedAt,
      };
    }

    return { connected: false };
  }

  async getGoogleAccessToken(userId: string): Promise<string | null> {
    const user = await this.userRepo.findById(userId);
    return this.getDecryptedOAuthToken(
      user?.googleAccessToken,
      'Google',
      userId,
    );
  }

  async findByGoogleId(googleId: string): Promise<UserDoc | null> {
    return this.userRepo.findOne({ googleId });
  }

  // ==================== GitLab Integration ====================

  async connectGitLab(
    userId: string,
    gitlabId: string,
    accessToken: string,
    username: string,
    email: string,
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const encryptedToken = this.encryptionService.encrypt(accessToken);

    await this.userRepo.update(userId, {
      gitlabId,
      gitlabAccessToken: encryptedToken,
      gitlabUsername: username,
      gitlabEmail: email,
      gitlabConnectedAt: new Date(),
    });
  }

  async disconnectGitLab(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepo.update(userId, {
      $unset: {
        gitlabId: '',
        gitlabAccessToken: '',
        gitlabUsername: '',
        gitlabEmail: '',
        gitlabConnectedAt: '',
      },
    });
  }

  async getGitLabConnectionStatus(userId: string): Promise<{
    connected: boolean;
    username?: string;
    email?: string;
    connectedAt?: Date;
  }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.gitlabId && user.gitlabAccessToken) {
      return {
        connected: true,
        username: user.gitlabUsername,
        email: user.gitlabEmail,
        connectedAt: user.gitlabConnectedAt,
      };
    }

    return { connected: false };
  }

  async getGitLabAccessToken(userId: string): Promise<string | null> {
    const user = await this.userRepo.findById(userId);
    return this.getDecryptedOAuthToken(
      user?.gitlabAccessToken,
      'GitLab',
      userId,
    );
  }

  async findByGitLabId(gitlabId: string): Promise<UserDoc | null> {
    return this.userRepo.findOne({ gitlabId });
  }
}
