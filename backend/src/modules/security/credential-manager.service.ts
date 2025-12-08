import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  CredentialStore,
  CredentialProvider,
  StoreCredentialDto,
  DEFAULT_GITIGNORE_SECRETS,
  GitIgnoreEntry,
} from './dto/security.dto';

@Injectable()
export class CredentialManagerService {
  private readonly logger = new Logger(CredentialManagerService.name);
  private credentials: Map<string, CredentialStore> = new Map();
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-for-development-only!';
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
  }

  async storeCredential(
    userId: string,
    dto: StoreCredentialDto,
  ): Promise<{ id: string; provider: CredentialProvider }> {
    const credentialId = this.generateCredentialId();
    const encryptedToken = this.encrypt(dto.token);

    const credential: CredentialStore = {
      id: credentialId,
      userId,
      provider: dto.provider,
      encryptedToken,
      tokenType: dto.tokenType || 'api_key',
      scope: dto.scope,
      createdAt: new Date(),
    };

    this.credentials.set(credentialId, credential);

    this.logger.log(`Stored credential ${credentialId} for provider ${dto.provider}`);

    return { id: credentialId, provider: dto.provider };
  }

  async getCredential(
    userId: string,
    provider: CredentialProvider,
  ): Promise<string | null> {
    for (const credential of this.credentials.values()) {
      if (credential.userId === userId && credential.provider === provider) {
        if (credential.expiresAt && credential.expiresAt < new Date()) {
          this.logger.warn(`Credential for ${provider} has expired`);
          return null;
        }

        credential.lastUsedAt = new Date();
        return this.decrypt(credential.encryptedToken);
      }
    }
    return null;
  }

  async getCredentialById(credentialId: string): Promise<string | null> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      return null;
    }

    if (credential.expiresAt && credential.expiresAt < new Date()) {
      return null;
    }

    credential.lastUsedAt = new Date();
    return this.decrypt(credential.encryptedToken);
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
    const userCredentials: Array<{
      id: string;
      provider: CredentialProvider;
      tokenType: string;
      createdAt: Date;
      lastUsedAt?: Date;
      expiresAt?: Date;
    }> = [];

    this.credentials.forEach((credential) => {
      if (credential.userId === userId) {
        userCredentials.push({
          id: credential.id,
          provider: credential.provider,
          tokenType: credential.tokenType,
          createdAt: credential.createdAt,
          lastUsedAt: credential.lastUsedAt,
          expiresAt: credential.expiresAt,
        });
      }
    });

    return userCredentials;
  }

  async deleteCredential(userId: string, credentialId: string): Promise<boolean> {
    const credential = this.credentials.get(credentialId);
    if (!credential || credential.userId !== userId) {
      return false;
    }

    this.credentials.delete(credentialId);
    this.logger.log(`Deleted credential ${credentialId}`);
    return true;
  }

  async rotateCredential(
    userId: string,
    credentialId: string,
    newToken: string,
  ): Promise<boolean> {
    const credential = this.credentials.get(credentialId);
    if (!credential || credential.userId !== userId) {
      return false;
    }

    credential.encryptedToken = this.encrypt(newToken);
    credential.rotatedAt = new Date();

    this.logger.log(`Rotated credential ${credentialId}`);
    return true;
  }

  shouldRotate(credentialId: string): boolean {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      return false;
    }

    const rotationInterval = 30 * 24 * 60 * 60 * 1000;
    const lastRotation = credential.rotatedAt || credential.createdAt;
    return Date.now() - lastRotation.getTime() > rotationInterval;
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

  private generateCredentialId(): string {
    return `cred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
