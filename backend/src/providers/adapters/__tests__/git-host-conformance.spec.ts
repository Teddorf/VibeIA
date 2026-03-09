import { GitHubHostAdapter } from '../github-host.adapter';
import { IGitHostProvider } from '../../interfaces/git-host-provider.interface';

/**
 * Conformance tests verify that GitHubHostAdapter implements
 * every method defined by IGitHostProvider.
 */
describe('IGitHostProvider conformance — GitHubHostAdapter', () => {
  let adapter: IGitHostProvider;

  const mockGitService = {
    listUserRepos: jest.fn().mockResolvedValue({ repositories: [] }),
    getRepository: jest.fn().mockResolvedValue({
      id: 1,
      name: 'repo',
      full_name: 'user/repo',
      description: null,
      private: false,
      default_branch: 'main',
      language: 'TypeScript',
      html_url: 'https://github.com/user/repo',
      clone_url: 'https://github.com/user/repo.git',
      updated_at: null,
      size: 100,
      owner: { login: 'user', avatar_url: 'https://avatar.url' },
    }),
    getRepositoryTree: jest
      .fn()
      .mockResolvedValue({ tree: [], truncated: false, sha: 'abc' }),
    getFileContent: jest.fn().mockResolvedValue({
      content: 'Y29udGVudA==',
      encoding: 'base64',
      size: 7,
      sha: 'abc',
      path: 'file.ts',
    }),
    listBranches: jest.fn().mockResolvedValue([]),
    createRepository: jest.fn().mockResolvedValue({
      id: 1,
      name: 'new-repo',
      full_name: 'user/new-repo',
      description: null,
      private: false,
      default_branch: 'main',
      language: null,
      html_url: 'https://github.com/user/new-repo',
      clone_url: 'https://github.com/user/new-repo.git',
      updated_at: null,
      size: 0,
      owner: { login: 'user', avatar_url: 'https://avatar.url' },
    }),
  } as any;

  beforeEach(() => {
    adapter = new GitHubHostAdapter(mockGitService);
  });

  const requiredMethods: (keyof IGitHostProvider)[] = [
    'listRepos',
    'getRepo',
    'getTree',
    'getFileContent',
    'listBranches',
    'createRepo',
  ];

  it.each(requiredMethods)('should implement %s as a function', (method) => {
    expect(typeof adapter[method]).toBe('function');
  });

  it('listRepos should return a Promise<IGitHostRepo[]>', async () => {
    const result = await adapter.listRepos('token');
    expect(Array.isArray(result)).toBe(true);
  });

  it('getTree should return { tree, truncated, sha }', async () => {
    const result = await adapter.getTree('user', 'repo', 'token');
    expect(result).toHaveProperty('tree');
    expect(result).toHaveProperty('truncated');
    expect(result).toHaveProperty('sha');
    expect(Array.isArray(result.tree)).toBe(true);
  });

  it('listBranches should return a Promise<IGitHostBranch[]>', async () => {
    const result = await adapter.listBranches('user', 'repo', 'token');
    expect(Array.isArray(result)).toBe(true);
  });

  it('createRepo should return a Promise<IGitHostRepo>', async () => {
    const result = await adapter.createRepo('new-repo', 'desc', false, 'token');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('fullName');
    expect(result).toHaveProperty('cloneUrl');
  });
});
