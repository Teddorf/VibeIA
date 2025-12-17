/**
 * Authentication and security-related constants
 * Centralizes magic numbers for easier maintenance and testing
 */

// Password hashing
export const BCRYPT_SALT_ROUNDS = 10;

// JWT Token expiration times
export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';

// Encrypted token format (iv:tag:encrypted)
export const ENCRYPTED_TOKEN_PARTS = 3;

// Default JWT secrets (should be overridden by environment variables)
export const DEFAULT_JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
