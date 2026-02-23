import { LocalGitVCSAdapter } from '../local-git-vcs.adapter';
import { IVCSProvider } from '../../interfaces/vcs-provider.interface';

jest.mock('simple-git', () => {
  const mockGit = {
    clone: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue({ commit: 'abc123' }),
    push: jest.fn().mockResolvedValue(undefined),
    pull: jest.fn().mockResolvedValue(undefined),
    status: jest.fn().mockResolvedValue({ modified: [], not_added: [] }),
    checkoutLocalBranch: jest.fn().mockResolvedValue(undefined),
    checkout: jest.fn().mockResolvedValue(undefined),
  };
  return jest.fn(() => mockGit);
});

/**
 * Conformance tests verify that LocalGitVCSAdapter implements
 * every method defined by IVCSProvider.
 */
describe('IVCSProvider conformance — LocalGitVCSAdapter', () => {
  let adapter: IVCSProvider;

  beforeEach(() => {
    adapter = new LocalGitVCSAdapter();
  });

  const requiredMethods: (keyof IVCSProvider)[] = [
    'clone',
    'commit',
    'push',
    'pull',
    'getStatus',
    'createBranch',
    'checkout',
  ];

  it.each(requiredMethods)('should implement %s as a function', (method) => {
    expect(typeof adapter[method]).toBe('function');
  });

  it('clone should return a Promise<void>', async () => {
    const result = adapter.clone(
      'https://github.com/user/repo.git',
      '/tmp/test',
    );
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBeUndefined();
  });

  it('commit should return a Promise<string> (sha)', async () => {
    const sha = await adapter.commit('/tmp/test', 'msg', ['file.ts']);
    expect(typeof sha).toBe('string');
    expect(sha.length).toBeGreaterThan(0);
  });

  it('getStatus should return { modified, untracked }', async () => {
    const status = await adapter.getStatus('/tmp/test');
    expect(status).toHaveProperty('modified');
    expect(status).toHaveProperty('untracked');
    expect(Array.isArray(status.modified)).toBe(true);
    expect(Array.isArray(status.untracked)).toBe(true);
  });

  it('push should return a Promise<void>', async () => {
    await expect(adapter.push('/tmp/test')).resolves.toBeUndefined();
  });

  it('pull should return a Promise<void>', async () => {
    await expect(adapter.pull('/tmp/test')).resolves.toBeUndefined();
  });

  it('createBranch should return a Promise<void>', async () => {
    await expect(
      adapter.createBranch('/tmp/test', 'feature-x'),
    ).resolves.toBeUndefined();
  });

  it('checkout should return a Promise<void>', async () => {
    await expect(
      adapter.checkout('/tmp/test', 'main'),
    ).resolves.toBeUndefined();
  });
});
