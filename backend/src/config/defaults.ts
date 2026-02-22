/**
 * Centralized default values for the entire backend.
 * Import from here instead of hardcoding values in modules.
 */

// ─── LLM Provider Defaults ──────────────────────────────────────────────────

export const LLM_DEFAULTS = {
  anthropic: {
    planModel: 'claude-sonnet-4-20250514',
    validationModel: 'claude-3-haiku-20240307',
    maxTokensPlan: 8192,
    maxTokensCode: 8192,
    maxTokensValidation: 10,
    pricing: {
      inputPerMillion: 3,
      outputPerMillion: 15,
    },
  },
  openai: {
    planModel: 'gpt-4-turbo-preview',
    validationModel: 'gpt-3.5-turbo',
    maxTokensPlan: 8192,
    maxTokensCode: 4096,
    maxTokensValidation: 10,
    pricing: {
      inputPerMillion: 10,
      outputPerMillion: 30,
    },
  },
  gemini: {
    planModel: 'gemini-2.0-flash',
    fallbackModel: 'gemini-pro',
    maxOutputTokens: 8192,
    temperatureDefault: 0.7,
    temperatureImported: 0.5,
    temperatureCode: 0.2,
    pricing: {
      inputPerMillion: 0.075,
      outputPerMillion: 0.3,
      averagePerMillion: 0.1875,
    },
  },
  charsPerToken: 4,
} as const;

// ─── Auth Defaults ───────────────────────────────────────────────────────────

export const AUTH_DEFAULTS = {
  bcryptSaltRounds: 10,
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  encryptedTokenParts: 3,
  defaultJwtSecret: 'your-super-secret-jwt-key-change-in-production',
} as const;

// ─── Quality Gate Defaults ───────────────────────────────────────────────────

export const QUALITY_GATE_DEFAULTS = {
  lint: { minScore: 80 },
  security: { minScore: 90 },
  test: { minScore: 70 },
  coverage: { minScore: 60 },
} as const;

// ─── Lint Defaults ───────────────────────────────────────────────────────────

export const LINT_DEFAULTS = {
  maxLineLength: 120,
  maxAnyTypeOccurrences: 3,
} as const;

// ─── Throttler / Rate-Limit Defaults ─────────────────────────────────────────

export const THROTTLER_DEFAULTS = {
  global: { ttl: 60000, limit: 10 },
  auth: {
    register: { limit: 5, ttl: 900000 },
    login: { limit: 10, ttl: 900000 },
    refresh: { limit: 20, ttl: 900000 },
    forgotPassword: { limit: 3, ttl: 900000 },
    resetPassword: { limit: 5, ttl: 900000 },
  },
} as const;

// ─── Encryption Defaults ─────────────────────────────────────────────────────

export const ENCRYPTION_DEFAULTS = {
  algorithm: 'aes-256-gcm' as const,
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
} as const;

// ─── Security / HSTS / CORS Defaults ─────────────────────────────────────────

export const SECURITY_DEFAULTS = {
  hstsMaxAge: 31536000,
  corsMaxAge: 3600,
  vercelPreviewPattern: /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  rateLimits: {
    global: { windowMs: 60 * 1000, maxRequests: 100 },
    auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
    api: { windowMs: 60 * 1000, maxRequests: 60 },
    llm: { windowMs: 60 * 1000, maxRequests: 10 },
  },
} as const;

// ─── Pricing Defaults (Infrastructure) ───────────────────────────────────────

export const PRICING_DEFAULTS = {
  neon: {
    free: { maxStorage: 0.5, maxCompute: 191.9, monthly: 0 },
    launch: { maxStorage: 10, maxCompute: 'unlimited' as const, monthly: 19 },
    scale: { maxStorage: 50, maxCompute: 'autoscaling' as const, monthly: 69 },
    business: { baseMonthly: 700, extraStoragePerGB: 3.5 },
  },
  vercel: {
    hobby: { monthly: 0, bandwidth: '100 GB' },
    pro: { monthly: 20, bandwidth: 'Unlimited' },
    team: { monthly: 20, perSeat: true },
  },
  railway: {
    hobby: { monthly: 5, ram: '512 MB', cpu: 'Shared' },
    starter: { monthly: 20, ram: '2 GB', cpu: '1 vCPU' },
    pro: { monthly: 50, ram: '4 GB', cpu: '2 vCPU' },
    scale: { monthly: 100, ram: '8 GB', cpu: '4 vCPU' },
  },
  awsEquivalent: {
    mvp: 150,
    growth: 400,
    scale: 1200,
  },
} as const;

// ─── MongoDB Defaults ────────────────────────────────────────────────────────

export const MONGO_DEFAULTS = {
  fallbackUri: 'mongodb://localhost:27017/vibecoding',
} as const;
