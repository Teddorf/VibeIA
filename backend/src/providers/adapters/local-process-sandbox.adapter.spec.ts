import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { LocalProcessSandboxAdapter } from './local-process-sandbox.adapter';
import { ISandbox } from '../interfaces/sandbox-provider.interface';

describe('LocalProcessSandboxAdapter', () => {
  let adapter: LocalProcessSandboxAdapter;
  const sandboxes: ISandbox[] = [];

  beforeEach(() => {
    adapter = new LocalProcessSandboxAdapter();
  });

  afterEach(async () => {
    for (const sb of sandboxes) {
      try {
        await sb.destroy();
      } catch {
        // already cleaned up
      }
    }
    sandboxes.length = 0;
  });

  describe('create()', () => {
    it('should return a sandbox with a UUID id', async () => {
      const sandbox = await adapter.create();
      sandboxes.push(sandbox);

      expect(sandbox.id).toBeDefined();
      expect(sandbox.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('sandbox.exec', () => {
    it('should run a command and return stdout, stderr, exitCode, durationMs', async () => {
      const sandbox = await adapter.create();
      sandboxes.push(sandbox);

      const result = await sandbox.exec('echo hello');
      expect(result.stdout.trim()).toBe('hello');
      expect(result.stderr).toBeDefined();
      expect(typeof result.exitCode).toBe('number');
      expect(result.exitCode).toBe(0);
      expect(typeof result.durationMs).toBe('number');
    });

    it('should have durationMs >= 0', async () => {
      const sandbox = await adapter.create();
      sandboxes.push(sandbox);

      const result = await sandbox.exec('echo test');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('sandbox.writeFile and readFile', () => {
    it('should write and read a file', async () => {
      const sandbox = await adapter.create();
      sandboxes.push(sandbox);

      await sandbox.writeFile('test.txt', 'hello world');
      const content = await sandbox.readFile('test.txt');
      expect(content).toBe('hello world');
    });
  });

  describe('sandbox.listFiles', () => {
    it('should return directory entries', async () => {
      const sandbox = await adapter.create();
      sandboxes.push(sandbox);

      await sandbox.writeFile('a.txt', 'aaa');
      await sandbox.writeFile('b.txt', 'bbb');

      const files = await sandbox.listFiles();
      expect(files).toContain('a.txt');
      expect(files).toContain('b.txt');
    });
  });

  describe('sandbox.destroy', () => {
    it('should remove the working directory', async () => {
      const sandbox = await adapter.create();
      // Write a file so we know the dir exists
      await sandbox.writeFile('temp.txt', 'data');

      // Get the workDir by reading the file with an absolute check
      const result = await sandbox.exec(
        process.platform === 'win32' ? 'cd' : 'pwd',
      );
      const workDir = result.stdout.trim();

      await sandbox.destroy();

      // Verify directory no longer exists
      await expect(fs.access(workDir)).rejects.toThrow();
    });
  });

  describe('createSandbox()', () => {
    it('should work with default workDir', async () => {
      const sandbox = await adapter.createSandbox();
      sandboxes.push(sandbox);

      expect(sandbox.id).toBeDefined();
      await sandbox.writeFile('file.txt', 'content');
      const content = await sandbox.readFile('file.txt');
      expect(content).toBe('content');
    });

    it('should use the specified workDir', async () => {
      const customDir = path.join(
        os.tmpdir(),
        `vibe-test-custom-${Date.now()}`,
      );
      const sandbox = await adapter.createSandbox({ workDir: customDir });
      sandboxes.push(sandbox);

      await sandbox.writeFile('custom.txt', 'custom content');
      // Verify the file exists in the custom directory
      const fullPath = path.join(customDir, 'custom.txt');
      const content = await fs.readFile(fullPath, 'utf-8');
      expect(content).toBe('custom content');
    });
  });
});
