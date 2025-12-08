export interface WorkspaceConfig {
  base: 'ubuntu:22.04' | 'node:20-alpine' | 'python:3.11-slim';
  tools: string[];
  resources: {
    cpu: number;
    memory: string;
    disk: string;
  };
  network: 'isolated' | 'restricted' | 'full';
  lifetime: string;
  autoDestroy: boolean;
}

export interface Workspace {
  id: string;
  userId: string;
  projectId: string;
  config: WorkspaceConfig;
  status: WorkspaceStatus;
  containerId?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

export enum WorkspaceStatus {
  CREATING = 'creating',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  DESTROYING = 'destroying',
  DESTROYED = 'destroyed',
  ERROR = 'error',
}

export interface CredentialStore {
  id: string;
  userId: string;
  provider: CredentialProvider;
  encryptedToken: string;
  tokenType: 'api_key' | 'oauth' | 'personal_access';
  scope?: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  rotatedAt?: Date;
}

export enum CredentialProvider {
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
  NEON = 'neon',
  VERCEL = 'vercel',
  RAILWAY = 'railway',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
}

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'critical',
    description: 'AWS Access Key ID detected',
  },
  {
    name: 'AWS Secret Key',
    pattern: /[A-Za-z0-9/+=]{40}/g,
    severity: 'critical',
    description: 'Potential AWS Secret Access Key',
  },
  {
    name: 'GitHub Token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,251}/g,
    severity: 'critical',
    description: 'GitHub Personal Access Token detected',
  },
  {
    name: 'OpenAI API Key',
    pattern: /sk-[A-Za-z0-9]{48}/g,
    severity: 'high',
    description: 'OpenAI API Key detected',
  },
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-[A-Za-z0-9-_]{95}/g,
    severity: 'high',
    description: 'Anthropic API Key detected',
  },
  {
    name: 'Stripe Secret Key',
    pattern: /sk_(live|test)_[A-Za-z0-9]{24,}/g,
    severity: 'critical',
    description: 'Stripe Secret Key detected',
  },
  {
    name: 'Stripe Publishable Key',
    pattern: /pk_(live|test)_[A-Za-z0-9]{24,}/g,
    severity: 'medium',
    description: 'Stripe Publishable Key detected',
  },
  {
    name: 'Database URL',
    pattern: /(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^/]+/g,
    severity: 'critical',
    description: 'Database connection string with credentials',
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'Private key detected',
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/g,
    severity: 'high',
    description: 'JWT token detected',
  },
  {
    name: 'Generic API Key',
    pattern: /api[_-]?key[_-]?[=:]\s*['"]?[A-Za-z0-9-_]{20,}['"]?/gi,
    severity: 'high',
    description: 'Generic API key pattern detected',
  },
  {
    name: 'Password in URL',
    pattern: /[a-z]+:\/\/[^:]+:([^@]+)@/gi,
    severity: 'critical',
    description: 'Password in URL detected',
  },
];

export interface SecretScanResult {
  file: string;
  line: number;
  column: number;
  secret: {
    type: string;
    maskedValue: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  };
}

export interface SecurityScanReport {
  scannedAt: Date;
  filesScanned: number;
  secretsFound: SecretScanResult[];
  vulnerabilities: VulnerabilityResult[];
  riskScore: number;
  passed: boolean;
  recommendations: string[];
}

export interface VulnerabilityResult {
  type: string;
  file: string;
  line?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediation?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  skipPaths?: string[];
  keyGenerator?: (req: unknown) => string;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  global: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: 'Too many requests, please try again later',
    skipPaths: ['/api/health', '/api/status'],
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later',
  },
  api: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    message: 'API rate limit exceeded',
  },
  llm: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: 'LLM request rate limit exceeded',
  },
};

export interface SecurityHeaders {
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security': string;
  'Content-Security-Policy': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
}

export const DEFAULT_SECURITY_HEADERS: SecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export interface GitIgnoreEntry {
  pattern: string;
  description: string;
  isSecret: boolean;
}

export const DEFAULT_GITIGNORE_SECRETS: GitIgnoreEntry[] = [
  { pattern: '.env', description: 'Environment variables file', isSecret: true },
  { pattern: '.env.local', description: 'Local environment variables', isSecret: true },
  { pattern: '.env.*.local', description: 'Local environment overrides', isSecret: true },
  { pattern: '*.pem', description: 'PEM certificate files', isSecret: true },
  { pattern: '*.key', description: 'Private key files', isSecret: true },
  { pattern: 'credentials.json', description: 'Credentials file', isSecret: true },
  { pattern: 'secrets.json', description: 'Secrets file', isSecret: true },
  { pattern: '.secrets/', description: 'Secrets directory', isSecret: true },
  { pattern: 'service-account*.json', description: 'Service account keys', isSecret: true },
];

export interface CreateWorkspaceDto {
  projectId: string;
  config?: Partial<WorkspaceConfig>;
}

export interface StoreCredentialDto {
  provider: CredentialProvider;
  token: string;
  tokenType?: 'api_key' | 'oauth' | 'personal_access';
  scope?: string[];
}

export interface ScanFilesDto {
  files: { path: string; content: string }[];
  options?: {
    checkSecrets?: boolean;
    checkVulnerabilities?: boolean;
    customPatterns?: SecretPattern[];
  };
}
