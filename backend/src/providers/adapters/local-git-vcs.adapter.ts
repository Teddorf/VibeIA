import { Injectable } from '@nestjs/common';
import simpleGit, { SimpleGit } from 'simple-git';
import { IVCSProvider } from '../interfaces/vcs-provider.interface';

@Injectable()
export class LocalGitVCSAdapter implements IVCSProvider {
  private getGit(repoPath?: string): SimpleGit {
    return simpleGit(repoPath);
  }

  async clone(repoUrl: string, destPath: string): Promise<void> {
    await simpleGit().clone(repoUrl, destPath);
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
    const git = this.getGit(repoPath);
    if (branch) {
      await git.push(remote, branch);
    } else {
      await git.push(remote);
    }
  }

  async pull(
    repoPath: string,
    remote = 'origin',
    branch?: string,
  ): Promise<void> {
    const git = this.getGit(repoPath);
    if (branch) {
      await git.pull(remote, branch);
    } else {
      await git.pull(remote);
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
}
