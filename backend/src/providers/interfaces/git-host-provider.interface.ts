export interface IGitHostRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  language: string | null;
  htmlUrl: string;
  cloneUrl: string;
  updatedAt: string | null;
  size: number;
  owner: { login: string; avatarUrl: string };
}

export interface IGitHostTreeNode {
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha: string;
}

export interface IGitHostFileContent {
  content: string;
  encoding: string;
  size: number;
  sha: string;
  path: string;
}

export interface IGitHostBranch {
  name: string;
  commit: { sha: string; url: string };
  protected: boolean;
}

export interface IGitHostProvider {
  listRepos(accessToken: string): Promise<IGitHostRepo[]>;
  getRepo(
    owner: string,
    repo: string,
    accessToken: string,
  ): Promise<IGitHostRepo>;
  getTree(
    owner: string,
    repo: string,
    accessToken: string,
    branch?: string,
  ): Promise<{ tree: IGitHostTreeNode[]; truncated: boolean; sha: string }>;
  getFileContent(
    owner: string,
    repo: string,
    path: string,
    accessToken: string,
    branch?: string,
  ): Promise<IGitHostFileContent>;
  listBranches(
    owner: string,
    repo: string,
    accessToken: string,
  ): Promise<IGitHostBranch[]>;
  createRepo(
    name: string,
    description: string,
    isPrivate: boolean,
    accessToken?: string,
  ): Promise<IGitHostRepo>;
}
