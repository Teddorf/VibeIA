import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';

@Injectable()
export class GitService {
  private octokit: Octokit;

  constructor() {
    // Initialize with personal access token for now (easier for MVP)
    // Later upgrade to GitHub App auth
    this.octokit = new Octokit({
      auth: process.env.GITHUB_ACCESS_TOKEN,
    });
  }

  async createRepository(name: string, description: string, privateRepo = true) {
    try {
      const response = await this.octokit.repos.createForAuthenticatedUser({
        name,
        description,
        private: privateRepo,
        auto_init: true, // Initialize with README
      });
      return response.data;
    } catch (error) {
      console.error('Error creating repository:', error);
      throw error;
    }
  }

  async createBranch(owner: string, repo: string, branchName: string, fromBranch = 'main') {
    try {
      // Get SHA of fromBranch
      const { data: refData } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${fromBranch}`,
      });

      // Create new branch
      await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha,
      });
      
      return { success: true, branch: branchName };
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }

  async createCommit(
    owner: string,
    repo: string,
    branch: string,
    files: { path: string; content: string }[],
    message: string
  ) {
    try {
      // 1. Get current commit SHA
      const { data: refData } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      const latestCommitSha = refData.object.sha;

      // 2. Get tree SHA
      const { data: commitData } = await this.octokit.git.getCommit({
        owner,
        repo,
        commit_sha: latestCommitSha,
      });
      const baseTreeSha = commitData.tree.sha;

      // 3. Create blobs for each file
      const treeItems = [];
      for (const file of files) {
        const { data: blobData } = await this.octokit.git.createBlob({
          owner,
          repo,
          content: file.content,
          encoding: 'utf-8',
        });
        
        treeItems.push({
          path: file.path,
          mode: '100644' as const, // File mode
          type: 'blob' as const,
          sha: blobData.sha,
        });
      }

      // 4. Create new tree
      const { data: treeData } = await this.octokit.git.createTree({
        owner,
        repo,
        base_tree: baseTreeSha,
        tree: treeItems,
      });

      // 5. Create commit
      const { data: newCommitData } = await this.octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: treeData.sha,
        parents: [latestCommitSha],
      });

      // 6. Update reference
      await this.octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommitData.sha,
      });

      return newCommitData;
    } catch (error) {
      console.error('Error creating commit:', error);
      throw error;
    }
  }
}