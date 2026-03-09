import { Injectable } from '@nestjs/common';

@Injectable()
export class InputSanitizer {
  private static readonly MAX_PROMPT_LENGTH = 100_000;

  private static readonly INJECTION_PATTERNS = [
    /ignore previous instructions/gi,
    /ignore all previous/gi,
    /disregard (?:all )?(?:previous|above|prior)/gi,
    /you are now/gi,
    /new instructions:/gi,
    /system:\s*override/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|(?:im_start|im_end|system|user|assistant)\|>/gi,
  ];

  private static readonly PII_PATTERNS = [
    {
      pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
      replacement: '[SSN_REDACTED]',
    },
    {
      pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      replacement: '[CARD_REDACTED]',
    },
  ];

  sanitize(input: string): string {
    let sanitized = input;

    // Truncate to max length
    if (sanitized.length > InputSanitizer.MAX_PROMPT_LENGTH) {
      sanitized = sanitized.substring(0, InputSanitizer.MAX_PROMPT_LENGTH);
    }

    // Strip injection patterns
    for (const pattern of InputSanitizer.INJECTION_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[FILTERED]');
    }

    // Redact PII
    for (const { pattern, replacement } of InputSanitizer.PII_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    return sanitized;
  }

  sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitize(value);
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        sanitized[key] = this.sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'string' ? this.sanitize(item) : item,
        );
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
