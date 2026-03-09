import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { ENCRYPTED_TOKEN_PARTS } from '../auth/auth.constants';
import { ENCRYPTION_DEFAULTS } from '../../config/defaults';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = ENCRYPTION_DEFAULTS.algorithm;
  private readonly keyLength = ENCRYPTION_DEFAULTS.keyLength;
  private readonly ivLength = ENCRYPTION_DEFAULTS.ivLength;
  private readonly tagLength = ENCRYPTION_DEFAULTS.tagLength;

  private getKey(): Buffer {
    // ENCRYPTION_KEY and ENCRYPTION_SALT are validated at startup by config.validation.ts
    // If we reach here, they're guaranteed to exist
    const secret = process.env.ENCRYPTION_KEY;
    const salt = process.env.ENCRYPTION_SALT;

    if (!secret || !salt) {
      throw new Error(
        'ENCRYPTION_KEY and ENCRYPTION_SALT must be configured - this should have been caught at startup',
      );
    }

    return crypto.scryptSync(secret, salt, this.keyLength);
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const key = this.getKey();
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== ENCRYPTED_TOKEN_PARTS) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, tagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const key = this.getKey();

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(
        'Decryption failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error('Failed to decrypt data');
    }
  }

  // Mask API key for display (show only last 4 chars)
  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return '••••••••';
    }
    return `••••••••${apiKey.slice(-4)}`;
  }
}
