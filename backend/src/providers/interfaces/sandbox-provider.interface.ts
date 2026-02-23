export interface ISandboxExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface SandboxConfig {
  timeoutMs?: number;
  memoryMb?: number;
  env?: Record<string, string>;
  workDir?: string;
}

export interface ISandbox {
  id: string;
  exec(command: string, timeoutMs?: number): Promise<ISandboxExecResult>;
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  listFiles(dir?: string): Promise<string[]>;
  destroy(): Promise<void>;
}

export interface ISandboxProvider {
  create(options?: Record<string, unknown>): Promise<ISandbox>;
  createSandbox(config?: SandboxConfig): Promise<ISandbox>;
}
