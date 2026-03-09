import { Injectable } from '@nestjs/common';
import { splitLines } from '../../platform';
import { QUALITY_GATE_DEFAULTS, LINT_DEFAULTS } from '../../config/defaults';

export interface QualityCheckResult {
  passed: boolean;
  checkType: 'lint' | 'security' | 'test' | 'coverage';
  score: number;
  issues: QualityIssue[];
  summary: string;
}

export interface QualityIssue {
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
  rule?: string;
}

export interface QualityGateResult {
  passed: boolean;
  overallScore: number;
  checks: QualityCheckResult[];
  blockers: QualityIssue[];
}

@Injectable()
export class QualityGatesService {
  private readonly thresholds = QUALITY_GATE_DEFAULTS;

  async runAllChecks(
    files: { path: string; content: string }[],
    options?: { skipTests?: boolean },
  ): Promise<QualityGateResult> {
    const checks: QualityCheckResult[] = [];

    // Run linting check
    const lintResult = await this.runLintCheck(files);
    checks.push(lintResult);

    // Run security check
    const securityResult = await this.runSecurityCheck(files);
    checks.push(securityResult);

    // Run test check (if not skipped)
    if (!options?.skipTests) {
      const testResult = await this.runTestCheck(files);
      checks.push(testResult);
    }

    // Calculate overall result
    const blockers = checks.flatMap((c) =>
      c.issues.filter((i) => i.severity === 'error'),
    );
    const overallScore =
      checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
    const passed = checks.every((c) => c.passed) && blockers.length === 0;

    return {
      passed,
      overallScore,
      checks,
      blockers,
    };
  }

  async runLintCheck(
    files: { path: string; content: string }[],
  ): Promise<QualityCheckResult> {
    const issues: QualityIssue[] = [];

    for (const file of files) {
      // Check for common lint issues
      const lines = splitLines(file.content);

      lines.forEach((line, idx) => {
        // Check for console.log statements (except in test files)
        if (!file.path.includes('.test.') && !file.path.includes('.spec.')) {
          if (
            line.includes('console.log(') ||
            line.includes('console.error(')
          ) {
            issues.push({
              severity: 'warning',
              file: file.path,
              line: idx + 1,
              message: 'Avoid console statements in production code',
              rule: 'no-console',
            });
          }
        }

        // Check for debugger statements
        if (line.includes('debugger')) {
          issues.push({
            severity: 'error',
            file: file.path,
            line: idx + 1,
            message: 'Remove debugger statement',
            rule: 'no-debugger',
          });
        }

        // Check for very long lines
        if (line.length > LINT_DEFAULTS.maxLineLength) {
          issues.push({
            severity: 'warning',
            file: file.path,
            line: idx + 1,
            message: `Line exceeds ${LINT_DEFAULTS.maxLineLength} characters (${line.length})`,
            rule: 'max-line-length',
          });
        }

        // Check for TODO/FIXME without context
        if (/\/\/\s*(TODO|FIXME)\s*$/.test(line)) {
          issues.push({
            severity: 'warning',
            file: file.path,
            line: idx + 1,
            message: 'TODO/FIXME comment should include description',
            rule: 'todo-with-context',
          });
        }
      });

      // TypeScript/JavaScript specific checks
      if (
        file.path.endsWith('.ts') ||
        file.path.endsWith('.tsx') ||
        file.path.endsWith('.js') ||
        file.path.endsWith('.jsx')
      ) {
        // Check for 'any' type usage
        const anyMatches = file.content.match(/:\s*any\b/g);
        if (
          anyMatches &&
          anyMatches.length > LINT_DEFAULTS.maxAnyTypeOccurrences
        ) {
          issues.push({
            severity: 'warning',
            file: file.path,
            message: `Excessive use of 'any' type (${anyMatches.length} occurrences)`,
            rule: 'no-explicit-any',
          });
        }

        // Check for empty catch blocks
        if (/catch\s*\([^)]*\)\s*{\s*}/g.test(file.content)) {
          issues.push({
            severity: 'error',
            file: file.path,
            message: 'Empty catch block - handle errors or rethrow',
            rule: 'no-empty-catch',
          });
        }
      }
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const score = Math.max(0, 100 - errorCount * 20 - warningCount * 5);
    const passed = score >= this.thresholds.lint.minScore && errorCount === 0;

    return {
      passed,
      checkType: 'lint',
      score,
      issues,
      summary: `Lint: ${errorCount} errors, ${warningCount} warnings (Score: ${score})`,
    };
  }

  async runSecurityCheck(
    files: { path: string; content: string }[],
  ): Promise<QualityCheckResult> {
    const issues: QualityIssue[] = [];

    for (const file of files) {
      // Check for hardcoded secrets
      const secretPatterns = [
        { pattern: /['"]sk-[a-zA-Z0-9]{32,}['"]/, name: 'OpenAI API Key' },
        {
          pattern: /['"]ghp_[a-zA-Z0-9]{36}['"]/,
          name: 'GitHub Personal Access Token',
        },
        { pattern: /['"]AKIA[0-9A-Z]{16}['"]/, name: 'AWS Access Key' },
        {
          pattern: /password\s*[=:]\s*['"][^'"]{4,}['"]/,
          name: 'Hardcoded Password',
        },
        {
          pattern: /api[_-]?key\s*[=:]\s*['"][^'"]{8,}['"]/,
          name: 'Hardcoded API Key',
        },
      ];

      for (const { pattern, name } of secretPatterns) {
        if (pattern.test(file.content)) {
          issues.push({
            severity: 'error',
            file: file.path,
            message: `Potential hardcoded secret detected: ${name}`,
            rule: 'no-hardcoded-secrets',
          });
        }
      }

      // Check for SQL injection vulnerabilities
      if (
        /query\s*\(\s*[`'"].*\$\{/.test(file.content) ||
        /execute\s*\(\s*[`'"].*\+/.test(file.content)
      ) {
        issues.push({
          severity: 'error',
          file: file.path,
          message:
            'Potential SQL injection vulnerability - use parameterized queries',
          rule: 'sql-injection',
        });
      }

      // Check for XSS vulnerabilities (React)
      if (file.content.includes('dangerouslySetInnerHTML')) {
        issues.push({
          severity: 'warning',
          file: file.path,
          message:
            'dangerouslySetInnerHTML usage - ensure content is sanitized',
          rule: 'xss-vulnerability',
        });
      }

      // Check for eval usage
      if (/\beval\s*\(/.test(file.content)) {
        issues.push({
          severity: 'error',
          file: file.path,
          message: 'eval() usage detected - avoid eval for security reasons',
          rule: 'no-eval',
        });
      }

      // Check for insecure crypto
      if (
        file.content.includes('Math.random()') &&
        (file.path.includes('auth') ||
          file.path.includes('token') ||
          file.path.includes('crypto'))
      ) {
        issues.push({
          severity: 'warning',
          file: file.path,
          message:
            'Math.random() used in security context - use crypto.randomBytes instead',
          rule: 'insecure-random',
        });
      }

      // Check for unvalidated redirects
      if (/res\.redirect\s*\([^)]*req\./.test(file.content)) {
        issues.push({
          severity: 'warning',
          file: file.path,
          message:
            'Potential open redirect vulnerability - validate redirect URLs',
          rule: 'open-redirect',
        });
      }
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const score = Math.max(0, 100 - errorCount * 30 - warningCount * 10);
    const passed =
      score >= this.thresholds.security.minScore && errorCount === 0;

    return {
      passed,
      checkType: 'security',
      score,
      issues,
      summary: `Security: ${errorCount} critical, ${warningCount} warnings (Score: ${score})`,
    };
  }

  async runTestCheck(
    files: { path: string; content: string }[],
  ): Promise<QualityCheckResult> {
    const issues: QualityIssue[] = [];

    // Check for test coverage by analyzing if test files exist
    const sourceFiles = files.filter(
      (f) =>
        (f.path.endsWith('.ts') || f.path.endsWith('.tsx')) &&
        !f.path.includes('.test.') &&
        !f.path.includes('.spec.') &&
        !f.path.includes('index.'),
    );

    const testFiles = files.filter(
      (f) => f.path.includes('.test.') || f.path.includes('.spec.'),
    );

    // Analyze test quality
    for (const testFile of testFiles) {
      // Check for proper test structure
      if (
        !testFile.content.includes('describe(') &&
        !testFile.content.includes('it(') &&
        !testFile.content.includes('test(')
      ) {
        issues.push({
          severity: 'warning',
          file: testFile.path,
          message: 'Test file missing proper test structure (describe/it/test)',
          rule: 'proper-test-structure',
        });
      }

      // Check for assertions
      if (
        !testFile.content.includes('expect(') &&
        !testFile.content.includes('assert')
      ) {
        issues.push({
          severity: 'error',
          file: testFile.path,
          message: 'Test file missing assertions',
          rule: 'test-assertions',
        });
      }

      // Check for .only (which would skip other tests)
      if (testFile.content.includes('.only(')) {
        issues.push({
          severity: 'error',
          file: testFile.path,
          message: 'Remove .only() from tests before committing',
          rule: 'no-only-tests',
        });
      }

      // Check for .skip (which would skip tests)
      if (testFile.content.includes('.skip(')) {
        issues.push({
          severity: 'warning',
          file: testFile.path,
          message: 'Skipped tests detected - ensure they are intentional',
          rule: 'no-skipped-tests',
        });
      }
    }

    // Calculate test coverage ratio
    const coverageRatio =
      sourceFiles.length > 0
        ? (testFiles.length / sourceFiles.length) * 100
        : 100;

    if (coverageRatio < 50 && sourceFiles.length > 0) {
      issues.push({
        severity: 'warning',
        file: 'general',
        message: `Low test file coverage: ${coverageRatio.toFixed(0)}% of source files have tests`,
        rule: 'test-coverage',
      });
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const score = Math.max(
      0,
      Math.min(100, coverageRatio - errorCount * 20 - warningCount * 5),
    );
    const passed = score >= this.thresholds.test.minScore && errorCount === 0;

    return {
      passed,
      checkType: 'test',
      score: Math.round(score),
      issues,
      summary: `Tests: ${testFiles.length} test files, ${errorCount} errors (Score: ${Math.round(score)})`,
    };
  }

  generateReport(result: QualityGateResult): string {
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════',
      '                    QUALITY GATE REPORT                     ',
      '═══════════════════════════════════════════════════════════',
      '',
      `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`,
      `Overall Score: ${result.overallScore.toFixed(0)}/100`,
      '',
      '───────────────────────────────────────────────────────────',
    ];

    for (const check of result.checks) {
      lines.push(`${check.passed ? '✅' : '❌'} ${check.summary}`);
    }

    if (result.blockers.length > 0) {
      lines.push('');
      lines.push('───────────────────────────────────────────────────────────');
      lines.push('BLOCKING ISSUES:');
      for (const blocker of result.blockers) {
        lines.push(
          `  ❌ [${blocker.file}${blocker.line ? `:${blocker.line}` : ''}] ${blocker.message}`,
        );
      }
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}
