import { Injectable, Logger } from '@nestjs/common';
import {
  RateLimitConfig,
  DEFAULT_RATE_LIMITS,
  SecurityHeaders,
  DEFAULT_SECURITY_HEADERS,
} from './dto/security.dto';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly limiters: Map<string, Map<string, RateLimitEntry>> = new Map();
  private readonly configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // Initialize default rate limiters
    Object.entries(DEFAULT_RATE_LIMITS).forEach(([name, config]) => {
      this.registerLimiter(name, config);
    });

    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000);
  }

  registerLimiter(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
    this.limiters.set(name, new Map());
    this.logger.log(`Registered rate limiter: ${name}`);
  }

  checkLimit(
    limiterName: string,
    key: string,
  ): {
    allowed: boolean;
    remaining: number;
    resetIn: number;
    message?: string;
  } {
    const config = this.configs.get(limiterName);
    if (!config) {
      return { allowed: true, remaining: -1, resetIn: 0 };
    }

    const limiter = this.limiters.get(limiterName)!;
    const now = Date.now();
    const entry = limiter.get(key);

    if (!entry || now >= entry.resetAt) {
      // Reset or create new entry
      limiter.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetIn: config.windowMs,
      };
    }

    if (entry.count >= config.maxRequests) {
      this.logger.warn(`Rate limit exceeded for ${limiterName}:${key}`);
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetAt - now,
        message: config.message,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetIn: entry.resetAt - now,
    };
  }

  consume(limiterName: string, key: string, tokens: number = 1): boolean {
    const config = this.configs.get(limiterName);
    if (!config) return true;

    const limiter = this.limiters.get(limiterName)!;
    const now = Date.now();
    const entry = limiter.get(key);

    if (!entry || now >= entry.resetAt) {
      limiter.set(key, {
        count: tokens,
        resetAt: now + config.windowMs,
      });
      return tokens <= config.maxRequests;
    }

    if (entry.count + tokens > config.maxRequests) {
      return false;
    }

    entry.count += tokens;
    return true;
  }

  resetLimit(limiterName: string, key: string): void {
    const limiter = this.limiters.get(limiterName);
    if (limiter) {
      limiter.delete(key);
    }
  }

  getStats(limiterName?: string): {
    name: string;
    activeKeys: number;
    config: RateLimitConfig;
  }[] {
    const stats: {
      name: string;
      activeKeys: number;
      config: RateLimitConfig;
    }[] = [];

    if (limiterName) {
      const config = this.configs.get(limiterName);
      const limiter = this.limiters.get(limiterName);
      if (config && limiter) {
        stats.push({
          name: limiterName,
          activeKeys: limiter.size,
          config,
        });
      }
    } else {
      this.configs.forEach((config, name) => {
        const limiter = this.limiters.get(name);
        stats.push({
          name,
          activeKeys: limiter?.size || 0,
          config,
        });
      });
    }

    return stats;
  }

  getSecurityHeaders(overrides?: Partial<SecurityHeaders>): SecurityHeaders {
    return {
      ...DEFAULT_SECURITY_HEADERS,
      ...overrides,
    };
  }

  generateCSP(options: {
    allowInlineStyles?: boolean;
    allowInlineScripts?: boolean;
    scriptSources?: string[];
    styleSources?: string[];
    imageSources?: string[];
    connectSources?: string[];
    fontSources?: string[];
    frameSources?: string[];
  }): string {
    const directives: string[] = [];

    // Default source
    directives.push("default-src 'self'");

    // Script sources
    const scripts = ["'self'"];
    if (options.allowInlineScripts) scripts.push("'unsafe-inline'");
    if (options.scriptSources) scripts.push(...options.scriptSources);
    directives.push(`script-src ${scripts.join(' ')}`);

    // Style sources
    const styles = ["'self'"];
    if (options.allowInlineStyles) styles.push("'unsafe-inline'");
    if (options.styleSources) styles.push(...options.styleSources);
    directives.push(`style-src ${styles.join(' ')}`);

    // Image sources
    if (options.imageSources) {
      directives.push(`img-src 'self' ${options.imageSources.join(' ')}`);
    } else {
      directives.push("img-src 'self' data: https:");
    }

    // Connect sources (for API calls)
    if (options.connectSources) {
      directives.push(`connect-src 'self' ${options.connectSources.join(' ')}`);
    } else {
      directives.push("connect-src 'self'");
    }

    // Font sources
    if (options.fontSources) {
      directives.push(`font-src 'self' ${options.fontSources.join(' ')}`);
    } else {
      directives.push("font-src 'self'");
    }

    // Frame sources
    if (options.frameSources) {
      directives.push(`frame-src ${options.frameSources.join(' ')}`);
    } else {
      directives.push("frame-src 'none'");
    }

    // Additional security directives
    directives.push("object-src 'none'");
    directives.push("base-uri 'self'");
    directives.push("form-action 'self'");

    return directives.join('; ');
  }

  shouldSkipPath(limiterName: string, path: string): boolean {
    const config = this.configs.get(limiterName);
    if (!config?.skipPaths) return false;

    return config.skipPaths.some((skipPath) => {
      if (skipPath.endsWith('*')) {
        return path.startsWith(skipPath.slice(0, -1));
      }
      return path === skipPath;
    });
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    this.limiters.forEach((limiter) => {
      limiter.forEach((entry, key) => {
        if (now >= entry.resetAt) {
          limiter.delete(key);
          cleaned++;
        }
      });
    });

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }
}
