import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Automated grep check: ensures no prohibited hardcoded patterns remain
 * in the src/ directory (excluding config/defaults.ts where they belong).
 */
describe('no-hardcodes check', () => {
  const srcDir = path.resolve(__dirname, '..');

  function grepCount(pattern: string, excludePattern?: string): number {
    try {
      let cmd = `grep -rn "${pattern}" "${srcDir}" --include="*.ts"`;
      // Exclude defaults.ts and spec files
      cmd += ` | grep -v "config/defaults.ts"`;
      cmd += ` | grep -v ".spec.ts"`;
      cmd += ` | grep -v "no-hardcodes.spec.ts"`;
      if (excludePattern) {
        cmd += ` | grep -v "${excludePattern}"`;
      }
      const result = execSync(cmd, { encoding: 'utf-8' });
      return result.trim().split('\n').filter(Boolean).length;
    } catch {
      // grep returns exit code 1 when no matches found
      return 0;
    }
  }

  it("should have no .split('\\n') in backend/src (use splitLines instead)", () => {
    const count = grepCount("split('\\\\\\\\n')");
    // Also check double-quoted version
    const count2 = grepCount('split("\\\\\\\\n")');
    expect(count + count2).toBe(0);
  });
});
