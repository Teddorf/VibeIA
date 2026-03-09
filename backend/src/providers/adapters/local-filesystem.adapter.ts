import { Injectable } from '@nestjs/common';
import {
  IFileSystemProvider,
  FileMetadata,
} from '../interfaces/filesystem-provider.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob as globFn } from 'glob';

@Injectable()
export class LocalFileSystemAdapter implements IFileSystemProvider {
  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async mkdir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async readdir(dirPath: string): Promise<string[]> {
    return fs.readdir(dirPath);
  }

  async unlink(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  async stat(
    filePath: string,
  ): Promise<{ size: number; isDirectory: boolean; modifiedAt: Date }> {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      isDirectory: stats.isDirectory(),
      modifiedAt: stats.mtime,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  async readDir(dirPath: string): Promise<string[]> {
    return fs.readdir(dirPath);
  }

  async createDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async deleteDir(dirPath: string): Promise<void> {
    await fs.rm(dirPath, { recursive: true, force: true });
  }

  async copy(src: string, dest: string): Promise<void> {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
  }

  async move(src: string, dest: string): Promise<void> {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.rename(src, dest);
  }

  async getMetadata(filePath: string): Promise<FileMetadata> {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      modifiedAt: stats.mtime,
      createdAt: stats.birthtime,
    };
  }

  async glob(pattern: string, cwd?: string): Promise<string[]> {
    return globFn(pattern, { cwd: cwd || process.cwd() });
  }
}
