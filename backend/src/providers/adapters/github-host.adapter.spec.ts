import { GitHubHostAdapter } from './github-host.adapter';

describe('GitHubHostAdapter', () => {
  let adapter: GitHubHostAdapter;
  let mockGitService: any;

  beforeEach(() => {
    mockGitService = {
      listUserRepos: jest.fn().mockResolvedValue({
        repositories: [
          {
            id: 1,
            name: 'test-repo',
            full_name: 'user/test-repo',
            description: 'A test repo',
            private: false,
            default_branch: 'main',
            language: 'TypeScript',
            html_url: 'https://github.com/user/test-repo',
            clone_url: 'https://github.com/user/test-repo.git',
            updated_at: '2024-01-01',
            size: 100,
            owner: {
              login: 'user',
              avatar_url: 'https://example.com/avatar.png',
            },
          },
        ],
        total: 1,
      }),
      getRepository: jest.fn().mockResolvedValue({
        id: 1,
        name: 'test-repo',
        full_name: 'user/test-repo',
        description: 'A test repo',
        private: false,
        default_branch: 'main',
        language: 'TypeScript',
        html_url: 'https://github.com/user/test-repo',
        clone_url: 'https://github.com/user/test-repo.git',
        updated_at: '2024-01-01',
        size: 100,
        owner: { login: 'user', avatar_url: 'https://example.com/avatar.png' },
      }),
      getRepositoryTree: jest.fn().mockResolvedValue({
        tree: [{ path: 'src/index.ts', type: 'file', size: 100, sha: 'abc' }],
        truncated: false,
        sha: 'tree-sha',
      }),
      getFileContent: jest.fn().mockResolvedValue({
        content: 'console.log("hello")',
        encoding: 'utf-8',
        size: 20,
        sha: 'file-sha',
        path: 'src/index.ts',
      }),
      listBranches: jest
        .fn()
        .mockResolvedValue([
          {
            name: 'main',
            commit: { sha: 'abc', url: 'https://...' },
            protected: true,
          },
        ]),
      createRepository: jest.fn().mockResolvedValue({
        id: 2,
        name: 'new-repo',
        full_name: 'user/new-repo',
        description: 'New repo',
        private: true,
        default_branch: 'main',
        language: null,
        html_url: 'https://github.com/user/new-repo',
        clone_url: 'https://github.com/user/new-repo.git',
        updated_at: '2024-01-01',
        size: 0,
        owner: { login: 'user', avatar_url: 'https://example.com/avatar.png' },
      }),
    };
    adapter = new GitHubHostAdapter(mockGitService);
  });

  it('should list repos', async () => {
    const repos = await adapter.listRepos('token');
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe('test-repo');
  });

  it('should get a repo', async () => {
    const repo = await adapter.getRepo('user', 'test-repo', 'token');
    expect(repo.fullName).toBe('user/test-repo');
  });

  it('should get tree', async () => {
    const result = await adapter.getTree('user', 'repo', 'token');
    expect(result.tree).toHaveLength(1);
    expect(result.tree[0].path).toBe('src/index.ts');
  });

  it('should get file content', async () => {
    const content = await adapter.getFileContent(
      'user',
      'repo',
      'src/index.ts',
      'token',
    );
    expect(content.content).toContain('hello');
  });

  it('should list branches', async () => {
    const branches = await adapter.listBranches('user', 'repo', 'token');
    expect(branches).toHaveLength(1);
    expect(branches[0].name).toBe('main');
  });

  it('should create a repo', async () => {
    const repo = await adapter.createRepo(
      'new-repo',
      'New repo',
      true,
      'token',
    );
    expect(repo.name).toBe('new-repo');
    expect(repo.private).toBe(true);
  });
});
