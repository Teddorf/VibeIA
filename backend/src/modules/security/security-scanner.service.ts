import { Injectable, Logger } from '@nestjs/common';
import {
  SECRET_PATTERNS,
  SecretScanResult,
  SecurityScanReport,
  VulnerabilityResult,
  ScanFilesDto,
  SecretPattern,
} from './dto/security.dto';
import { splitLines } from '../../platform';

@Injectable()
export class SecurityScannerService {
  private readonly logger = new Logger(SecurityScannerService.name);

  async scanFiles(dto: ScanFilesDto): Promise<SecurityScanReport> {
    const startTime = Date.now();
    const secretsFound: SecretScanResult[] = [];
    const vulnerabilities: VulnerabilityResult[] = [];

    const patterns = dto.options?.customPatterns
      ? [...SECRET_PATTERNS, ...dto.options.customPatterns]
      : SECRET_PATTERNS;

    for (const file of dto.files) {
      if (dto.options?.checkSecrets !== false) {
        const fileSecrets = this.scanForSecrets(
          file.path,
          file.content,
          patterns,
        );
        secretsFound.push(...fileSecrets);
      }

      if (dto.options?.checkVulnerabilities !== false) {
        const fileVulns = this.scanForVulnerabilities(file.path, file.content);
        vulnerabilities.push(...fileVulns);
      }
    }

    const riskScore = this.calculateRiskScore(secretsFound, vulnerabilities);
    const recommendations = this.generateRecommendations(
      secretsFound,
      vulnerabilities,
    );

    const report: SecurityScanReport = {
      scannedAt: new Date(),
      filesScanned: dto.files.length,
      secretsFound,
      vulnerabilities,
      riskScore,
      passed: riskScore < 50,
      recommendations,
    };

    this.logger.log(
      `Security scan completed in ${Date.now() - startTime}ms: ${secretsFound.length} secrets, ${vulnerabilities.length} vulnerabilities`,
    );

    return report;
  }

  scanForSecrets(
    filePath: string,
    content: string,
    patterns: SecretPattern[] = SECRET_PATTERNS,
  ): SecretScanResult[] {
    const results: SecretScanResult[] = [];
    const lines = splitLines(content);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const pattern of patterns) {
        const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
        let match: RegExpExecArray | null;

        while ((match = regex.exec(line)) !== null) {
          results.push({
            file: filePath,
            line: lineIndex + 1,
            column: match.index + 1,
            secret: {
              type: pattern.name,
              maskedValue: this.maskSecret(match[0]),
              severity: pattern.severity,
              description: pattern.description,
            },
          });
        }
      }
    }

    return results;
  }

  scanForVulnerabilities(
    filePath: string,
    content: string,
  ): VulnerabilityResult[] {
    const vulnerabilities: VulnerabilityResult[] = [];
    const lines = splitLines(content);

    // Check for common vulnerabilities
    const vulnPatterns = [
      {
        pattern: /eval\s*\(/g,
        type: 'Code Injection',
        severity: 'critical' as const,
        description: 'Use of eval() can lead to code injection attacks',
        remediation:
          'Avoid using eval(). Use safer alternatives like JSON.parse() for JSON data',
      },
      {
        pattern: /innerHTML\s*=/g,
        type: 'XSS Vulnerability',
        severity: 'high' as const,
        description: 'Direct innerHTML assignment can lead to XSS attacks',
        remediation: 'Use textContent or sanitize HTML before insertion',
      },
      {
        pattern: /document\.write\s*\(/g,
        type: 'XSS Vulnerability',
        severity: 'high' as const,
        description: 'document.write() can be exploited for XSS attacks',
        remediation: 'Use DOM manipulation methods instead',
      },
      {
        pattern: /new\s+Function\s*\(/g,
        type: 'Code Injection',
        severity: 'critical' as const,
        description: 'Dynamic function creation can lead to code injection',
        remediation:
          'Avoid dynamic function creation. Use predefined functions',
      },
      {
        pattern: /child_process\.exec\s*\(/g,
        type: 'Command Injection',
        severity: 'critical' as const,
        description: 'Unsanitized exec() can lead to command injection',
        remediation: 'Use execFile() with arguments array or sanitize inputs',
      },
      {
        pattern: /\$\{.*\}/g,
        type: 'Template Injection',
        severity: 'medium' as const,
        description: 'Template literals with user input can be exploited',
        remediation: 'Sanitize user inputs before using in template literals',
      },
      {
        pattern: /sql\s*=\s*[`"'].*\+/gi,
        type: 'SQL Injection',
        severity: 'critical' as const,
        description:
          'String concatenation in SQL queries can lead to injection',
        remediation: 'Use parameterized queries or prepared statements',
      },
      {
        pattern: /password\s*=\s*[`"'][^`"']+[`"']/gi,
        type: 'Hardcoded Password',
        severity: 'high' as const,
        description: 'Hardcoded passwords detected',
        remediation: 'Use environment variables or secret management',
      },
      {
        pattern: /https?:\/\/localhost/gi,
        type: 'Development URL',
        severity: 'low' as const,
        description: 'Localhost URL found in code',
        remediation: 'Use environment variables for URLs',
      },
      {
        pattern: /console\.(log|error|warn|debug)\s*\(/g,
        type: 'Debug Code',
        severity: 'low' as const,
        description: 'Console statements should be removed in production',
        remediation: 'Remove console statements or use a logging library',
      },
      {
        pattern: /TODO|FIXME|HACK|XXX/gi,
        type: 'Code Quality',
        severity: 'low' as const,
        description: 'Unresolved code comments found',
        remediation: 'Address TODO/FIXME comments before deployment',
      },
      {
        pattern: /disabled\s*:\s*true|bypass|skip.*auth/gi,
        type: 'Security Bypass',
        severity: 'high' as const,
        description: 'Potential security bypass detected',
        remediation: 'Review and remove any security bypass code',
      },
    ];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const vulnPattern of vulnPatterns) {
        if (vulnPattern.pattern.test(line)) {
          vulnerabilities.push({
            type: vulnPattern.type,
            file: filePath,
            line: lineIndex + 1,
            severity: vulnPattern.severity,
            description: vulnPattern.description,
            remediation: vulnPattern.remediation,
          });
        }
      }
    }

    return vulnerabilities;
  }

  validateSecurityHeaders(headers: Record<string, string>): {
    valid: boolean;
    missing: string[];
    weak: string[];
  } {
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy',
    ];

    const missing: string[] = [];
    const weak: string[] = [];

    for (const header of requiredHeaders) {
      if (!headers[header]) {
        missing.push(header);
      }
    }

    // Check for weak configurations
    if (headers['X-Frame-Options'] === 'ALLOWALL') {
      weak.push('X-Frame-Options: ALLOWALL is insecure');
    }

    if (headers['X-XSS-Protection'] === '0') {
      weak.push('X-XSS-Protection should not be disabled');
    }

    const hsts = headers['Strict-Transport-Security'];
    if (hsts) {
      const maxAgeMatch = hsts.match(/max-age=(\d+)/);
      if (maxAgeMatch && parseInt(maxAgeMatch[1]) < 31536000) {
        weak.push('HSTS max-age should be at least 31536000 (1 year)');
      }
    }

    return {
      valid: missing.length === 0 && weak.length === 0,
      missing,
      weak,
    };
  }

  detectSensitiveFiles(files: string[]): {
    sensitive: string[];
    recommendations: string[];
  } {
    const sensitivePatterns = [
      { pattern: /\.env$/i, reason: 'Environment file' },
      { pattern: /\.env\.[^.]+$/i, reason: 'Environment file' },
      { pattern: /\.pem$/i, reason: 'Certificate file' },
      { pattern: /\.key$/i, reason: 'Private key file' },
      { pattern: /id_rsa/i, reason: 'SSH private key' },
      { pattern: /id_ed25519/i, reason: 'SSH private key' },
      { pattern: /credentials\.json$/i, reason: 'Credentials file' },
      { pattern: /secrets\.json$/i, reason: 'Secrets file' },
      { pattern: /\.htpasswd$/i, reason: 'Password file' },
      { pattern: /service.*account.*\.json$/i, reason: 'Service account key' },
      { pattern: /\.npmrc$/i, reason: 'NPM config with tokens' },
      { pattern: /\.docker.*config\.json$/i, reason: 'Docker credentials' },
    ];

    const sensitive: string[] = [];
    const recommendations: string[] = [];

    for (const file of files) {
      for (const pattern of sensitivePatterns) {
        if (pattern.pattern.test(file)) {
          sensitive.push(file);
          recommendations.push(`Add ${file} to .gitignore (${pattern.reason})`);
          break;
        }
      }
    }

    return { sensitive, recommendations };
  }

  private maskSecret(secret: string): string {
    if (secret.length <= 8) {
      return '***';
    }
    return secret.slice(0, 4) + '***' + secret.slice(-4);
  }

  private calculateRiskScore(
    secrets: SecretScanResult[],
    vulnerabilities: VulnerabilityResult[],
  ): number {
    let score = 0;

    const severityScores = {
      critical: 25,
      high: 15,
      medium: 8,
      low: 3,
    };

    for (const secret of secrets) {
      score += severityScores[secret.secret.severity];
    }

    for (const vuln of vulnerabilities) {
      score += severityScores[vuln.severity];
    }

    return Math.min(100, score);
  }

  private generateRecommendations(
    secrets: SecretScanResult[],
    vulnerabilities: VulnerabilityResult[],
  ): string[] {
    const recommendations: string[] = [];

    // Group secrets by type
    const secretTypes = new Set(secrets.map((s) => s.secret.type));
    for (const type of secretTypes) {
      recommendations.push(
        `Remove or rotate all ${type} found in the codebase`,
      );
    }

    // Group vulnerabilities by type
    const vulnTypes = new Set(vulnerabilities.map((v) => v.type));
    for (const type of vulnTypes) {
      const vuln = vulnerabilities.find((v) => v.type === type);
      if (vuln?.remediation) {
        recommendations.push(`${type}: ${vuln.remediation}`);
      }
    }

    // General recommendations
    if (secrets.length > 0) {
      recommendations.push(
        'Use environment variables or a secret manager for sensitive data',
      );
      recommendations.push('Ensure .gitignore includes all sensitive files');
    }

    if (vulnerabilities.some((v) => v.severity === 'critical')) {
      recommendations.push(
        'Address all critical vulnerabilities before deployment',
      );
    }

    return [...new Set(recommendations)];
  }
}
