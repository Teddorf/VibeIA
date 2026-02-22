export interface ISandboxExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ISandbox {
  exec(command: string, timeoutMs?: number): Promise<ISandboxExecResult>;
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  destroy(): Promise<void>;
}

export interface ISandboxProvider {
  create(options?: Record<string, unknown>): Promise<ISandbox>;
}
