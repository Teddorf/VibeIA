/**
 * Configuration Validation Module
 *
 * Validates all required environment variables at application startup.
 * Fails fast if any required configuration is missing or invalid.
 *
 * SECURITY: This prevents the application from starting with insecure defaults.
 */

export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[],
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export interface AppConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  mongoUri: string;
  encryptionKey: string;
  encryptionSalt: string;
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  frontendUrl?: string;
}

interface ValidationRule {
  name: string;
  value: string | undefined;
  required: boolean;
  minLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
}

function validateRule(rule: ValidationRule): string | null {
  const { name, value, required, minLength, pattern, patternMessage } = rule;

  // Check required
  if (required && (!value || value.trim() === '')) {
    return `${name} is required`;
  }

  // If not required and not provided, skip other validations
  if (!value) {
    return null;
  }

  // Check minimum length
  if (minLength && value.length < minLength) {
    return `${name} must be at least ${minLength} characters`;
  }

  // Check pattern
  if (pattern && !pattern.test(value)) {
    return patternMessage || `${name} has invalid format`;
  }

  return null;
}

export function validateConfig(): AppConfig {
  const errors: string[] = [];

  const rules: ValidationRule[] = [
    {
      name: 'JWT_SECRET',
      value: process.env.JWT_SECRET,
      required: true,
      minLength: 32,
    },
    {
      name: 'JWT_REFRESH_SECRET',
      value: process.env.JWT_REFRESH_SECRET,
      required: true,
      minLength: 32,
    },
    {
      name: 'MONGO_URI',
      value: process.env.MONGO_URI,
      required: true,
      pattern: /^mongodb(\+srv)?:\/\//,
      patternMessage: 'MONGO_URI must start with mongodb:// or mongodb+srv://',
    },
    {
      name: 'ENCRYPTION_KEY',
      value: process.env.ENCRYPTION_KEY,
      required: true,
      minLength: 32,
    },
    {
      name: 'ENCRYPTION_SALT',
      value: process.env.ENCRYPTION_SALT,
      required: true,
      minLength: 16,
    },
  ];

  // Validate all rules
  for (const rule of rules) {
    const error = validateRule(rule);
    if (error) {
      errors.push(error);
    }
  }

  // If there are errors, throw with all of them
  if (errors.length > 0) {
    throw new ConfigValidationError(
      `Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`,
      errors,
    );
  }

  // Parse and return config
  const port = parseInt(process.env.PORT || '3001', 10);
  const nodeEnv = (process.env.NODE_ENV || 'development') as AppConfig['nodeEnv'];

  return {
    jwtSecret: process.env.JWT_SECRET!,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
    mongoUri: process.env.MONGO_URI!,
    encryptionKey: process.env.ENCRYPTION_KEY!,
    encryptionSalt: process.env.ENCRYPTION_SALT!,
    nodeEnv,
    port,
    frontendUrl: process.env.FRONTEND_URL,
  };
}
