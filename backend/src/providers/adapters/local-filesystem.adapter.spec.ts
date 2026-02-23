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

  it('should delete a file via deleteFile', async () => {
    const filePath = path.join(tmpDir, 'del2.txt');
    await adapter.writeFile(filePath, 'data');
    await adapter.deleteFile(filePath);
    expect(await adapter.exists(filePath)).toBe(false);
  });

  it('should list directory contents via readDir', async () => {
    await adapter.writeFile(path.join(tmpDir, 'x.txt'), 'x');
    const entries = await adapter.readDir(tmpDir);
    expect(entries).toContain('x.txt');
  });

  it('should create a directory via createDir', async () => {
    const dirPath = path.join(tmpDir, 'sub', 'deep');
    await adapter.createDir(dirPath);
    const stat = await adapter.stat(dirPath);
    expect(stat.isDirectory).toBe(true);
  });

  it('should delete a directory via deleteDir', async () => {
    const dirPath = path.join(tmpDir, 'to-delete');
    await adapter.createDir(dirPath);
    await adapter.writeFile(path.join(dirPath, 'file.txt'), 'data');
    await adapter.deleteDir(dirPath);
    expect(await adapter.exists(dirPath)).toBe(false);
  });

  it('should copy a file', async () => {
    const src = path.join(tmpDir, 'src.txt');
    const dest = path.join(tmpDir, 'dest.txt');
    await adapter.writeFile(src, 'copy me');
    await adapter.copy(src, dest);
    const content = await adapter.readFile(dest);
    expect(content).toBe('copy me');
  });

  it('should move a file', async () => {
    const src = path.join(tmpDir, 'move-src.txt');
    const dest = path.join(tmpDir, 'move-dest.txt');
    await adapter.writeFile(src, 'move me');
    await adapter.move(src, dest);
    expect(await adapter.exists(src)).toBe(false);
    const content = await adapter.readFile(dest);
    expect(content).toBe('move me');
  });

  it('should return file metadata via getMetadata', async () => {
    const filePath = path.join(tmpDir, 'meta.txt');
    await adapter.writeFile(filePath, 'metadata');
    const meta = await adapter.getMetadata(filePath);
    expect(meta.size).toBeGreaterThan(0);
    expect(meta.isFile).toBe(true);
    expect(meta.isDirectory).toBe(false);
    expect(new Date(meta.modifiedAt).getTime()).not.toBeNaN();
    expect(new Date(meta.createdAt).getTime()).not.toBeNaN();
  });

  it('should glob for files', async () => {
    await adapter.writeFile(path.join(tmpDir, 'a.ts'), 'a');
    await adapter.writeFile(path.join(tmpDir, 'b.ts'), 'b');
    await adapter.writeFile(path.join(tmpDir, 'c.js'), 'c');
    const results = await adapter.glob('*.ts', tmpDir);
    expect(results.sort()).toEqual(['a.ts', 'b.ts']);
  });
});
