import { Injectable } from '@nestjs/common';
import { IFileSystemProvider } from '../interfaces/filesystem-provider.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

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
}
