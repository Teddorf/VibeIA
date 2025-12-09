// GitHub Repository interfaces
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  language: string | null;
  html_url: string;
  clone_url: string;
  updated_at: string | null;
  pushed_at: string | null;
  size: number;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface RepositoryDetails extends GitHubRepository {
  topics: string[];
  has_wiki: boolean;
  has_issues: boolean;
  has_projects: boolean;
  license: {
    key: string;
    name: string;
  } | null;
}

export interface TreeNode {
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha: string;
}

export interface FileContent {
  content: string;
  encoding: string;
  size: number;
  sha: string;
  path: string;
}

export interface BranchInfo {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

// DTOs for requests (using interfaces instead of class-validator)
export interface ImportRepoDto {
  repoFullName: string; // "owner/repo"
  branch?: string;
}

export interface SearchReposDto {
  query: string;
  language?: string;
  includePrivate?: boolean;
}

export interface GetFileContentDto {
  branch?: string;
}

// Response DTOs
export interface ListReposResponse {
  repositories: GitHubRepository[];
  total: number;
}

export interface RepoTreeResponse {
  tree: TreeNode[];
  truncated: boolean;
  sha: string;
}

export interface GitHubConnectionStatus {
  connected: boolean;
  username?: string;
  connectedAt?: Date;
  scopes?: string[];
}
