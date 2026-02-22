import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ENCRYPTION_DEFAULTS } from '../../config/defaults';

/**
 * Service for encrypting/decrypting sensitive tokens and API keys.
 * Uses AES-256-GCM for authenticated encryption.
 */
@Injectable()
export class TokenEncryptionService {
  private readonly encryptionKey: Buffer;
  private readonly algorithm = ENCRYPTION_DEFAULTS.algorithm;

  constructor(private readonly configService: ConfigService) {
    const key =
      this.configService.get<string>('ENCRYPTION_KEY') ||
      'default-key-for-development-only!';
    const salt =
      this.configService.get<string>('ENCRYPTION_SALT') ||
      'default-salt-dev-16';
    this.encryptionKey = crypto.scryptSync(
      key,
      salt,
      ENCRYPTION_DEFAULTS.keyLength,
    );
  }

  /**
   * Encrypt a plaintext string
   * @param plaintext The text to encrypt
   * @returns Encrypted string in format: iv:authTag:ciphertext (all hex encoded)
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(ENCRYPTION_DEFAULTS.ivLength);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt an encrypted string
   * @param encryptedData The encrypted string in format: iv:authTag:ciphertext
   * @returns Decrypted plaintext string
   */
  decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Check if a string appears to be encrypted (has the expected format)
   */
  isEncrypted(data: string): boolean {
    if (!data) return false;
    const parts = data.split(':');
    // Should have 3 parts: iv, authTag, ciphertext
    // iv is 32 hex chars (16 bytes), authTag is 32 hex chars (16 bytes)
    return (
      parts.length === 3 && parts[0].length === 32 && parts[1].length === 32
    );
  }
}
