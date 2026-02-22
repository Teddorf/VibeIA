import { LocalFileSystemAdapter } from './local-filesystem.adapter';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('LocalFileSystemAdapter', () => {
  let adapter: LocalFileSystemAdapter;
  let tmpDir: string;

  beforeEach(async () => {
    adapter = new LocalFileSystemAdapter();
    tmpDir = path.join(os.tmpdir(), `vibe-fs-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should write and read a file', async () => {
    const filePath = path.join(tmpDir, 'test.txt');
    await adapter.writeFile(filePath, 'hello world');
    const content = await adapter.readFile(filePath);
    expect(content).toBe('hello world');
  });

  it('should check file existence', async () => {
    const filePath = path.join(tmpDir, 'exists.txt');
    expect(await adapter.exists(filePath)).toBe(false);
    await adapter.writeFile(filePath, 'data');
    expect(await adapter.exists(filePath)).toBe(true);
  });

  it('should list directory contents', async () => {
    await adapter.writeFile(path.join(tmpDir, 'a.txt'), 'a');
    await adapter.writeFile(path.join(tmpDir, 'b.txt'), 'b');
    const entries = await adapter.readdir(tmpDir);
    expect(entries.sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('should delete a file', async () => {
    const filePath = path.join(tmpDir, 'del.txt');
    await adapter.writeFile(filePath, 'delete me');
    await adapter.unlink(filePath);
    expect(await adapter.exists(filePath)).toBe(false);
  });

  it('should return file stats', async () => {
    const filePath = path.join(tmpDir, 'stat.txt');
    await adapter.writeFile(filePath, 'data');
    const stats = await adapter.stat(filePath);
    expect(stats.size).toBeGreaterThan(0);
    expect(stats.isDirectory).toBe(false);
    expect(new Date(stats.modifiedAt).getTime()).not.toBeNaN();
  });
});
