import { LocalGitVCSAdapter } from './local-git-vcs.adapter';

jest.mock('simple-git', () => {
  const mockGit = {
    clone: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue({ commit: 'abc123' }),
    push: jest.fn().mockResolvedValue(undefined),
    pull: jest.fn().mockResolvedValue(undefined),
    status: jest
      .fn()
      .mockResolvedValue({ modified: ['file.ts'], not_added: ['new.ts'] }),
    checkoutLocalBranch: jest.fn().mockResolvedValue(undefined),
    checkout: jest.fn().mockResolvedValue(undefined),
  };
  return jest.fn(() => mockGit);
});

describe('LocalGitVCSAdapter', () => {
  let adapter: LocalGitVCSAdapter;

  beforeEach(() => {
    adapter = new LocalGitVCSAdapter();
  });

  it('should clone a repository', async () => {
    await expect(
      adapter.clone('https://github.com/user/repo.git', '/tmp/repo'),
    ).resolves.not.toThrow();
  });

  it('should commit files', async () => {
    const sha = await adapter.commit('/tmp/repo', 'test commit', ['file.ts']);
    expect(sha).toBe('abc123');
  });

  it('should push', async () => {
    await expect(
      adapter.push('/tmp/repo', 'origin', 'main'),
    ).resolves.not.toThrow();
  });

  it('should pull', async () => {
    await expect(adapter.pull('/tmp/repo')).resolves.not.toThrow();
  });

  it('should get status', async () => {
    const status = await adapter.getStatus('/tmp/repo');
    expect(status.modified).toContain('file.ts');
    expect(status.untracked).toContain('new.ts');
  });

  it('should create branch', async () => {
    await expect(
      adapter.createBranch('/tmp/repo', 'feature-x'),
    ).resolves.not.toThrow();
  });

  it('should checkout branch', async () => {
    await expect(adapter.checkout('/tmp/repo', 'main')).resolves.not.toThrow();
  });
});
