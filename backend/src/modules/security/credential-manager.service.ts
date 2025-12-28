import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Credential, CredentialDocument, CredentialProvider as SchemaCredentialProvider, CredentialStatus } from './schemas/credential.schema';
import {
  CredentialProvider,
  StoreCredentialDto,
  DEFAULT_GITIGNORE_SECRETS,
  GitIgnoreEntry,
} from './dto/security.dto';

@Injectable()
export class CredentialManagerService {
  private readonly logger = new Logger(CredentialManagerService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    @InjectModel(Credential.name) private credentialModel: Model<CredentialDocument>,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-for-development-only!';
    const salt = this.configService.get<string>('ENCRYPTION_SALT') || 'default-salt-dev-16';
    this.encryptionKey = crypto.scryptSync(key, salt, 32);
  }

  async storeCredential(
    userId: string,
    dto: StoreCredentialDto,
  ): Promise<{ id: string; provider: CredentialProvider }> {
    const encryptedToken = this.encrypt(dto.token);

    const credential = new this.credentialModel({
      userId,
      provider: dto.provider,
      name: dto.name || `${dto.provider} API Key`,
      encryptedToken,
      status: CredentialStatus.ACTIVE,
      scopes: dto.scope || [],
    });

    const saved = await credential.save();

    this.logger.log(`Stored credential ${saved._id} for provider ${dto.provider}`);

    return { id: saved._id.toString(), provider: dto.provider };
  }

  async getCredential(
    userId: string,
    provider: CredentialProvider,
  ): Promise<string | null> {
    const credential = await this.credentialModel
      .findOne({
        userId,
        provider,
        status: CredentialStatus.ACTIVE,
      })
      .exec();

    if (!credential) return null;

    if (credential.tokenExpiresAt && credential.tokenExpiresAt < new Date()) {
      this.logger.warn(`Credential for ${provider} has expired`);
      await this.credentialModel
        .findByIdAndUpdate(credential._id, { status: CredentialStatus.EXPIRED })
        .exec();
      return null;
    }

    await this.credentialModel
      .findByIdAndUpdate(credential._id, { lastUsedAt: new Date() })
      .exec();

    return this.decrypt(credential.encryptedToken);
  }

  async getCredentialById(credentialId: string): Promise<string | null> {
    try {
      const credential = await this.credentialModel.findById(credentialId).exec();
      if (!credential) return null;

      if (credential.tokenExpiresAt && credential.tokenExpiresAt < new Date()) {
        return null;
      }

      await this.credentialModel
        .findByIdAndUpdate(credentialId, { lastUsedAt: new Date() })
        .exec();

      return this.decrypt(credential.encryptedToken);
    } catch {
      return null;
    }
  }

  async listCredentials(userId: string): Promise<
    Array<{
      id: string;
      provider: CredentialProvider;
      tokenType: string;
      createdAt: Date;
      lastUsedAt?: Date;
      expiresAt?: Date;
    }>
  > {
    const credentials = await this.credentialModel
      .find({ userId })
      .select('-encryptedToken -encryptedRefreshToken')
      .exec();

    return credentials.map((cred) => ({
      id: cred._id.toString(),
      provider: cred.provider as unknown as CredentialProvider,
      tokenType: 'api_key',
      createdAt: cred.createdAt || new Date(),
      lastUsedAt: cred.lastUsedAt,
      expiresAt: cred.tokenExpiresAt,
    }));
  }

  async deleteCredential(userId: string, credentialId: string): Promise<boolean> {
    try {
      const result = await this.credentialModel
        .findOneAndDelete({ _id: credentialId, userId })
        .exec();

      if (result) {
        this.logger.log(`Deleted credential ${credentialId}`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async rotateCredential(
    userId: string,
    credentialId: string,
    newToken: string,
  ): Promise<boolean> {
    try {
      const result = await this.credentialModel
        .findOneAndUpdate(
          { _id: credentialId, userId },
          {
            encryptedToken: this.encrypt(newToken),
            updatedAt: new Date(),
          },
        )
        .exec();

      if (result) {
        this.logger.log(`Rotated credential ${credentialId}`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async shouldRotate(credentialId: string): Promise<boolean> {
    try {
      const credential = await this.credentialModel.findById(credentialId).exec();
      if (!credential) return false;

      const rotationInterval = (credential.rotationDays || 90) * 24 * 60 * 60 * 1000;
      const lastRotation = credential.updatedAt || credential.createdAt || new Date();
      return Date.now() - lastRotation.getTime() > rotationInterval;
    } catch {
      return false;
    }
  }

  async validateToken(
    provider: CredentialProvider,
    token: string,
  ): Promise<{ valid: boolean; accountInfo?: unknown; error?: string }> {
    try {
      switch (provider) {
        case CredentialProvider.GITHUB:
          return await this.validateGitHubToken(token);
        case CredentialProvider.NEON:
          return await this.validateNeonToken(token);
        case CredentialProvider.VERCEL:
          return await this.validateVercelToken(token);
        case CredentialProvider.RAILWAY:
          return await this.validateRailwayToken(token);
        default:
          return { valid: true };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  ensureGitignore(projectPath: string, additionalSecrets?: string[]): GitIgnoreEntry[] {
    const entries = [...DEFAULT_GITIGNORE_SECRETS];

    if (additionalSecrets) {
      additionalSecrets.forEach((pattern) => {
        entries.push({
          pattern,
          description: 'Custom secret pattern',
          isSecret: true,
        });
      });
    }

    return entries;
  }

  generateGitignoreContent(entries?: GitIgnoreEntry[]): string {
    const patterns = entries || DEFAULT_GITIGNORE_SECRETS;
    const lines: string[] = ['# Secrets and credentials', ''];

    patterns.forEach((entry) => {
      if (entry.isSecret) {
        lines.push(`# ${entry.description}`);
        lines.push(entry.pattern);
        lines.push('');
      }
    });

    return lines.join('\n');
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private async validateGitHubToken(token: string): Promise<{
    valid: boolean;
    accountInfo?: unknown;
    error?: string;
  }> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (!response.ok) {
        return { valid: false, error: 'Invalid GitHub token' };
      }

      const user = await response.json();
      return {
        valid: true,
        accountInfo: { login: user.login, name: user.name },
      };
    } catch {
      return { valid: false, error: 'Failed to validate GitHub token' };
    }
  }

  private async validateNeonToken(token: string): Promise<{
    valid: boolean;
    accountInfo?: unknown;
    error?: string;
  }> {
    try {
      const response = await fetch('https://console.neon.tech/api/v2/projects', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return { valid: false, error: 'Invalid Neon token' };
      }

      const data = await response.json();
      return {
        valid: true,
        accountInfo: { projectCount: data.projects?.length || 0 },
      };
    } catch {
      return { valid: false, error: 'Failed to validate Neon token' };
    }
  }

  private async validateVercelToken(token: string): Promise<{
    valid: boolean;
    accountInfo?: unknown;
    error?: string;
  }> {
    try {
      const response = await fetch('https://api.vercel.com/v2/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return { valid: false, error: 'Invalid Vercel token' };
      }

      const data = await response.json();
      return {
        valid: true,
        accountInfo: { username: data.user?.username, email: data.user?.email },
      };
    } catch {
      return { valid: false, error: 'Failed to validate Vercel token' };
    }
  }

  private async validateRailwayToken(token: string): Promise<{
    valid: boolean;
    accountInfo?: unknown;
    error?: string;
  }> {
    try {
      const response = await fetch('https://backboard.railway.app/graphql/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: '{ me { id name email } }',
        }),
      });

      const data = await response.json();

      if (data.errors) {
        return { valid: false, error: 'Invalid Railway token' };
      }

      return {
        valid: true,
        accountInfo: { name: data.data?.me?.name, email: data.data?.me?.email },
      };
    } catch {
      return { valid: false, error: 'Failed to validate Railway token' };
    }
  }
}
