/**
 * Authentication and security-related constants
 * Centralizes magic numbers for easier maintenance and testing
 */
import { AUTH_DEFAULTS } from '../../config/defaults';

// Password hashing
export const BCRYPT_SALT_ROUNDS = AUTH_DEFAULTS.bcryptSaltRounds;

// JWT Token expiration times
export const ACCESS_TOKEN_EXPIRY = AUTH_DEFAULTS.accessTokenExpiry;
export const REFRESH_TOKEN_EXPIRY = AUTH_DEFAULTS.refreshTokenExpiry;

// Encrypted token format (iv:tag:encrypted)
export const ENCRYPTED_TOKEN_PARTS = AUTH_DEFAULTS.encryptedTokenParts;

// Default JWT secrets (should be overridden by environment variables)
export const DEFAULT_JWT_SECRET = AUTH_DEFAULTS.defaultJwtSecret;
