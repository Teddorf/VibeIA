import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

/**
 * OAuth State Service
 *
 * Manages OAuth state/nonce tokens for CSRF protection and preventing
 * account takeover attacks via forged OAuth callbacks.
 *
 * Security features:
 * - Generates cryptographically secure nonces
 * - Stores nonces with associated metadata (userId, type)
 * - Validates and consumes nonces (one-time use)
 * - Expires nonces after TTL
 * - Prevents tampering by validating userId matches stored value
 */

export interface OAuthStateData {
  nonce: string;
  type: 'login' | 'register' | 'connect';
  userId?: string;
  createdAt: number;
}

export interface ValidatedState {
  nonce: string;
  type: 'login' | 'register' | 'connect';
  userId?: string;
}

@Injectable()
export class OAuthStateService {
  // In production, use Redis for distributed state
  private nonceStore = new Map<string, OAuthStateData>();

  // Nonce expires after 10 minutes
  private readonly NONCE_TTL_MS = 10 * 60 * 1000;

  /**
   * Generate a secure OAuth state with nonce
   * @param type The OAuth flow type
   * @param userId Optional user ID for connect flow
   * @returns Base64 encoded state string
   */
  generateState(type: 'login' | 'register' | 'connect', userId?: string): string {
    const nonce = this.generateNonce();

    // Store the nonce with metadata
    const stateData: OAuthStateData = {
      nonce,
      type,
      userId,
      createdAt: Date.now(),
    };

    this.nonceStore.set(nonce, stateData);

    // Return base64 encoded state (this goes in URL)
    const statePayload = {
      nonce,
      type,
      userId,
    };

    return Buffer.from(JSON.stringify(statePayload)).toString('base64');
  }

  /**
   * Validate and consume an OAuth state
   * Returns the validated state data or null if invalid
   * @param state Base64 encoded state from callback
   */
  async validateAndConsumeState(state: string): Promise<ValidatedState | null> {
    try {
      // Decode and parse state
      let decoded: { nonce?: string; type?: string; userId?: string };
      try {
        decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch {
        // Invalid base64 or JSON
        return null;
      }

      // Must have nonce
      if (!decoded.nonce) {
        return null;
      }

      // Look up stored nonce
      const storedData = this.nonceStore.get(decoded.nonce);

      if (!storedData) {
        // Unknown nonce - could be forged or expired
        return null;
      }

      // Check expiration
      if (this.isExpired(storedData)) {
        this.nonceStore.delete(decoded.nonce);
        return null;
      }

      // For connect flow, verify userId matches
      if (storedData.type === 'connect' && storedData.userId) {
        if (decoded.userId !== storedData.userId) {
          // userId was tampered - reject
          return null;
        }
      }

      // Consume the nonce (one-time use)
      this.nonceStore.delete(decoded.nonce);

      // Return validated state
      return {
        nonce: decoded.nonce,
        type: storedData.type,
        userId: storedData.userId,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate a cryptographically secure nonce
   */
  private generateNonce(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Check if a nonce has expired
   */
  private isExpired(data: OAuthStateData): boolean {
    return Date.now() - data.createdAt > this.NONCE_TTL_MS;
  }

  /**
   * Manually expire a nonce (for testing)
   * @internal
   */
  expireNonce(nonce: string): void {
    const data = this.nonceStore.get(nonce);
    if (data) {
      // Set createdAt to past time
      data.createdAt = Date.now() - this.NONCE_TTL_MS - 1000;
    }
  }

  /**
   * Cleanup expired nonces (call periodically in production)
   */
  cleanupExpiredNonces(): number {
    let cleaned = 0;
    for (const [nonce, data] of this.nonceStore.entries()) {
      if (this.isExpired(data)) {
        this.nonceStore.delete(nonce);
        cleaned++;
      }
    }
    return cleaned;
  }
}
