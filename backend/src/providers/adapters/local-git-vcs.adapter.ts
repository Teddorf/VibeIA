import { Injectable, Logger } from '@nestjs/common';
import simpleGit, { SimpleGit } from 'simple-git';
import { IVCSProvider } from '../interfaces/vcs-provider.interface';

@Injectable()
export class LocalGitVCSAdapter implements IVCSProvider {
  private readonly logger = new Logger(LocalGitVCSAdapter.name);

  private getGit(repoPath?: string): SimpleGit {
    return simpleGit(repoPath);
  }

  async clone(repoUrl: string, destPath: string): Promise<void> {
    try {
      await simpleGit().clone(repoUrl, destPath);
    } catch (error: any) {
      throw new Error(`Failed to clone ${repoUrl}: ${error.message}`);
    }
  }

  async commit(
    repoPath: string,
    message: string,
    files?: string[],
  ): Promise<string> {
    const git = this.getGit(repoPath);
    if (files && files.length > 0) {
      await git.add(files);
    } else {
      await git.add('.');
    }
    const result = await git.commit(message);
    return result.commit;
  }

  async push(
    repoPath: string,
    remote = 'origin',
    branch?: string,
  ): Promise<void> {
    try {
      const git = this.getGit(repoPath);
      if (branch) {
        await git.push(remote, branch);
      } else {
        await git.push(remote);
      }
    } catch (error: any) {
      throw new Error(`Failed to push to ${remote}: ${error.message}`);
    }
  }

  async pull(
    repoPath: string,
    remote = 'origin',
    branch?: string,
  ): Promise<void> {
    try {
      const git = this.getGit(repoPath);
      if (branch) {
        await git.pull(remote, branch);
      } else {
        await git.pull(remote);
      }
    } catch (error: any) {
      throw new Error(`Failed to pull from ${remote}: ${error.message}`);
    }
  }

  async getStatus(
    repoPath: string,
  ): Promise<{ modified: string[]; untracked: string[] }> {
    const git = this.getGit(repoPath);
    const status = await git.status();
    return {
      modified: status.modified,
      untracked: status.not_added,
    };
  }

  async createBranch(repoPath: string, branchName: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.checkoutLocalBranch(branchName);
  }

  async checkout(repoPath: string, branchName: string): Promise<void> {
    const git = this.getGit(repoPath);
    await git.checkout(branchName);
  }

  async mergeBranch(
    repoPath: string,
    source: string,
    target: string,
  ): Promise<void> {
    const git = this.getGit(repoPath);
    await git.checkout(target);
    await git.merge([source]);
  }
}
