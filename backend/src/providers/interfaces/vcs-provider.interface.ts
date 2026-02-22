export interface IVCSProvider {
  clone(repoUrl: string, destPath: string): Promise<void>;
  commit(repoPath: string, message: string, files?: string[]): Promise<string>;
  push(repoPath: string, remote?: string, branch?: string): Promise<void>;
  pull(repoPath: string, remote?: string, branch?: string): Promise<void>;
  getStatus(
    repoPath: string,
  ): Promise<{ modified: string[]; untracked: string[] }>;
  createBranch(repoPath: string, branchName: string): Promise<void>;
  checkout(repoPath: string, branchName: string): Promise<void>;
}
