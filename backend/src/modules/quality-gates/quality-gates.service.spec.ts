import { Test, TestingModule } from '@nestjs/testing';
import { QualityGatesService } from './quality-gates.service';

describe('QualityGatesService', () => {
  let service: QualityGatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QualityGatesService],
    }).compile();

    service = module.get<QualityGatesService>(QualityGatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runLintCheck', () => {
    it('should pass lint check for clean code', async () => {
      const files = [
        {
          path: 'src/utils/helper.ts',
          content: `
export function add(a: number, b: number): number {
  return a + b;
}
          `.trim(),
        },
      ];

      const result = await service.runLintCheck(files);

      expect(result.passed).toBe(true);
      expect(result.checkType).toBe('lint');
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('should detect console.log statements', async () => {
      const files = [
        {
          path: 'src/service.ts',
          content: `
export function process() {
  console.log('debug');
  return true;
}
          `.trim(),
        },
      ];

      const result = await service.runLintCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'no-console',
          severity: 'warning',
        })
      );
    });

    it('should detect debugger statements', async () => {
      const files = [
        {
          path: 'src/debug.ts',
          content: `
export function test() {
  debugger;
  return true;
}
          `.trim(),
        },
      ];

      const result = await service.runLintCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'no-debugger',
          severity: 'error',
        })
      );
      expect(result.passed).toBe(false);
    });

    it('should allow console in test files', async () => {
      const files = [
        {
          path: 'src/service.test.ts',
          content: `
describe('test', () => {
  console.log('test setup');
});
          `.trim(),
        },
      ];

      const result = await service.runLintCheck(files);

      const consoleIssue = result.issues.find(i => i.rule === 'no-console');
      expect(consoleIssue).toBeUndefined();
    });

    it('should detect excessive any types', async () => {
      const files = [
        {
          path: 'src/types.ts',
          content: `
const a: any = 1;
const b: any = 2;
const c: any = 3;
const d: any = 4;
          `.trim(),
        },
      ];

      const result = await service.runLintCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'no-explicit-any',
          severity: 'warning',
        })
      );
    });

    it('should detect empty catch blocks', async () => {
      const files = [
        {
          path: 'src/error.ts',
          content: `
try {
  doSomething();
} catch (e) {}
          `.trim(),
        },
      ];

      const result = await service.runLintCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'no-empty-catch',
          severity: 'error',
        })
      );
    });

    it('should detect long lines', async () => {
      const files = [
        {
          path: 'src/long.ts',
          content: `const veryLongVariableName = "this is a very long string that exceeds the maximum line length of 120 characters and should trigger a warning";`,
        },
      ];

      const result = await service.runLintCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'max-line-length',
          severity: 'warning',
        })
      );
    });
  });

  describe('runSecurityCheck', () => {
    it('should pass security check for secure code', async () => {
      const files = [
        {
          path: 'src/secure.ts',
          content: `
export function getConfig() {
  return process.env.API_KEY;
}
          `.trim(),
        },
      ];

      const result = await service.runSecurityCheck(files);

      expect(result.passed).toBe(true);
      expect(result.checkType).toBe('security');
    });

    it('should detect hardcoded OpenAI API key', async () => {
      const files = [
        {
          path: 'src/config.ts',
          content: `const apiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyz1234";`,
        },
      ];

      const result = await service.runSecurityCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'no-hardcoded-secrets',
          severity: 'error',
        })
      );
      expect(result.passed).toBe(false);
    });

    it('should detect hardcoded GitHub token', async () => {
      const files = [
        {
          path: 'src/github.ts',
          content: `const token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";`,
        },
      ];

      const result = await service.runSecurityCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'no-hardcoded-secrets',
          message: expect.stringContaining('GitHub'),
        })
      );
    });

    it('should detect hardcoded AWS keys', async () => {
      const files = [
        {
          path: 'src/aws.ts',
          content: `const awsKey = "AKIAIOSFODNN7EXAMPLE";`,
        },
      ];

      const result = await service.runSecurityCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'no-hardcoded-secrets',
          message: expect.stringContaining('AWS'),
        })
      );
    });

    it('should detect eval usage', async () => {
      const files = [
        {
          path: 'src/unsafe.ts',
          content: `
const code = userInput;
eval(code);
          `.trim(),
        },
      ];

      const result = await service.runSecurityCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'no-eval',
          severity: 'error',
        })
      );
    });

    it('should detect dangerouslySetInnerHTML', async () => {
      const files = [
        {
          path: 'src/component.tsx',
          content: `
export function Html({ content }) {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}
          `.trim(),
        },
      ];

      const result = await service.runSecurityCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'xss-vulnerability',
          severity: 'warning',
        })
      );
    });

    it('should detect SQL injection patterns', async () => {
      const files = [
        {
          path: 'src/db.ts',
          content: `
const userId = req.params.id;
db.query(\`SELECT * FROM users WHERE id = \${userId}\`);
          `.trim(),
        },
      ];

      const result = await service.runSecurityCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'sql-injection',
          severity: 'error',
        })
      );
    });
  });

  describe('runTestCheck', () => {
    it('should pass test check with proper tests', async () => {
      const files = [
        {
          path: 'src/service.ts',
          content: `export function add(a, b) { return a + b; }`,
        },
        {
          path: 'src/service.test.ts',
          content: `
describe('add', () => {
  it('should add numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
});
          `.trim(),
        },
      ];

      const result = await service.runTestCheck(files);

      expect(result.checkType).toBe('test');
      expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
    });

    it('should detect .only in tests', async () => {
      const files = [
        {
          path: 'src/service.test.ts',
          content: `
describe.only('test', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
          `.trim(),
        },
      ];

      const result = await service.runTestCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'no-only-tests',
          severity: 'error',
        })
      );
    });

    it('should detect .skip in tests', async () => {
      const files = [
        {
          path: 'src/service.test.ts',
          content: `
describe('test', () => {
  it.skip('should work', () => {
    expect(true).toBe(true);
  });
});
          `.trim(),
        },
      ];

      const result = await service.runTestCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'no-skipped-tests',
          severity: 'warning',
        })
      );
    });

    it('should detect tests without assertions', async () => {
      const files = [
        {
          path: 'src/empty.test.ts',
          content: `
describe('empty', () => {
  it('does nothing', () => {
    const x = 1;
  });
});
          `.trim(),
        },
      ];

      const result = await service.runTestCheck(files);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          rule: 'test-assertions',
          severity: 'error',
        })
      );
    });
  });

  describe('runAllChecks', () => {
    it('should run all checks and aggregate results', async () => {
      const files = [
        {
          path: 'src/clean.ts',
          content: `export const value = 42;`,
        },
      ];

      const result = await service.runAllChecks(files);

      expect(result.checks).toHaveLength(3); // lint, security, test
      expect(result.overallScore).toBeDefined();
      expect(result.blockers).toBeInstanceOf(Array);
    });

    it('should skip tests when option is set', async () => {
      const files = [
        {
          path: 'src/clean.ts',
          content: `export const value = 42;`,
        },
      ];

      const result = await service.runAllChecks(files, { skipTests: true });

      expect(result.checks).toHaveLength(2); // lint, security only
    });

    it('should fail when any check has errors', async () => {
      const files = [
        {
          path: 'src/bad.ts',
          content: `
debugger;
eval('bad');
          `.trim(),
        },
      ];

      const result = await service.runAllChecks(files, { skipTests: true });

      expect(result.passed).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
    });
  });

  describe('generateReport', () => {
    it('should generate a formatted report', async () => {
      const files = [
        {
          path: 'src/test.ts',
          content: `export const x = 1;`,
        },
      ];

      const result = await service.runAllChecks(files, { skipTests: true });
      const report = service.generateReport(result);

      expect(report).toContain('QUALITY GATE REPORT');
      expect(report).toContain('Overall Score');
      expect(report).toMatch(/PASSED|FAILED/);
    });

    it('should list blockers in report', async () => {
      const files = [
        {
          path: 'src/bad.ts',
          content: `debugger;`,
        },
      ];

      const result = await service.runAllChecks(files, { skipTests: true });
      const report = service.generateReport(result);

      expect(report).toContain('BLOCKING ISSUES');
    });
  });
});
