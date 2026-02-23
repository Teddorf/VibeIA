import { Injectable } from '@nestjs/common';
import {
  ISandboxProvider,
  ISandbox,
  ISandboxExecResult,
  SandboxConfig,
} from '../interfaces/sandbox-provider.interface';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

class LocalProcessSandbox implements ISandbox {
  public readonly id: string;

  constructor(private readonly workDir: string) {
    this.id = randomUUID();
  }

  exec(command: string, timeoutMs = 30000): Promise<ISandboxExecResult> {
    const start = Date.now();
    return new Promise((resolve) => {
      exec(
        command,
        {
          cwd: this.workDir,
          timeout: timeoutMs,
          // Cross-platform: use shell based on OS
          shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - start;
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: error?.code ?? (error ? 1 : 0),
            durationMs,
          });
        },
      );
    });
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const full = path.join(this.workDir, filePath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf-8');
  }

  async readFile(filePath: string): Promise<string> {
    const full = path.join(this.workDir, filePath);
    return fs.readFile(full, 'utf-8');
  }

  async listFiles(dir?: string): Promise<string[]> {
    const target = dir ? path.join(this.workDir, dir) : this.workDir;
    return fs.readdir(target);
  }

  async destroy(): Promise<void> {
    await fs.rm(this.workDir, { recursive: true, force: true });
  }
}

@Injectable()
export class LocalProcessSandboxAdapter implements ISandboxProvider {
  async create(_options?: Record<string, unknown>): Promise<ISandbox> {
    const workDir = path.join(os.tmpdir(), `vibe-sandbox-${randomUUID()}`);
    await fs.mkdir(workDir, { recursive: true });
    return new LocalProcessSandbox(workDir);
  }

  async createSandbox(config?: SandboxConfig): Promise<ISandbox> {
    const workDir = config?.workDir
      ? config.workDir
      : path.join(os.tmpdir(), `vibe-sandbox-${randomUUID()}`);
    await fs.mkdir(workDir, { recursive: true });
    return new LocalProcessSandbox(workDir);
  }
}
