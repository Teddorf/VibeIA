import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { GitService } from './git.service';

// Mock Octokit
const mockOctokit = {
  repos: {
    createForAuthenticatedUser: jest.fn(),
    listForAuthenticatedUser: jest.fn(),
    get: jest.fn(),
    getContent: jest.fn(),
    listBranches: jest.fn(),
  },
  git: {
    getRef: jest.fn(),
    createRef: jest.fn(),
    getCommit: jest.fn(),
    createBlob: jest.fn(),
    createTree: jest.fn(),
    createCommit: jest.fn(),
    updateRef: jest.fn(),
    getTree: jest.fn(),
  },
  users: {
    getAuthenticated: jest.fn(),
  },
  search: {
    repos: jest.fn(),
  },
};

jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => mockOctokit),
  };
});

describe('GitService', () => {
  let service: GitService;

  beforeEach(async () => {
    // Set env variable for legacy methods that need defaultOctokit
    process.env.GITHUB_ACCESS_TOKEN = 'test-server-token';

    const module: TestingModule = await Test.createTestingModule({
      providers: [GitService],
    }).compile();

    service = module.get<GitService>(GitService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.GITHUB_ACCESS_TOKEN;
  });

  // ============================================
  // Legacy method tests
  // ============================================

  describe('createRepository', () => {
    it('should create a repository', async () => {
      const mockRepo = { name: 'test-repo', html_url: 'http://github.com/user/test-repo' };
      mockOctokit.repos.createForAuthenticatedUser.mockResolvedValue({ data: mockRepo });

      const result = await service.createRepository('test-repo', 'desc');

      expect(mockOctokit.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: 'test-repo',
        description: 'desc',
        private: true,
        auto_init: true,
      });
      expect(result).toEqual(mockRepo);
    });
  });

  describe('createBranch', () => {
    it('should create a branch from main', async () => {
      mockOctokit.git.getRef.mockResolvedValue({ data: { object: { sha: 'sha1' } } });
      mockOctokit.git.createRef.mockResolvedValue({ data: {} });

      await service.createBranch('user', 'repo', 'feature/1');

      expect(mockOctokit.git.getRef).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        ref: 'heads/main',
      });
      expect(mockOctokit.git.createRef).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        ref: 'refs/heads/feature/1',
        sha: 'sha1',
      });
    });
  });

  // ============================================
  // New method tests (user token based)
  // ============================================

  describe('listUserRepos', () => {
    it('should list repositories for authenticated user', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'repo1',
          full_name: 'user/repo1',
          description: 'Test repo 1',
          private: false,
          default_branch: 'main',
          language: 'TypeScript',
          html_url: 'https://github.com/user/repo1',
          clone_url: 'https://github.com/user/repo1.git',
          updated_at: '2024-01-01T00:00:00Z',
          pushed_at: '2024-01-01T00:00:00Z',
          size: 100,
          stargazers_count: 10,
          forks_count: 5,
          open_issues_count: 2,
          owner: { login: 'user', avatar_url: 'https://avatar.url' },
        },
      ];

      mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({ data: mockRepos });

      const result = await service.listUserRepos('valid-token');

      expect(mockOctokit.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
        page: 1,
        affiliation: 'owner,collaborator,organization_member',
      });
      expect(result.repositories).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.repositories[0].name).toBe('repo1');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const error = new Error('Unauthorized');
      (error as any).status = 401;
      mockOctokit.repos.listForAuthenticatedUser.mockRejectedValue(error);

      await expect(service.listUserRepos('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getRepository', () => {
    it('should get repository details', async () => {
      const mockRepo = {
        id: 1,
        name: 'repo1',
        full_name: 'user/repo1',
        description: 'Test repo',
        private: false,
        default_branch: 'main',
        language: 'TypeScript',
        html_url: 'https://github.com/user/repo1',
        clone_url: 'https://github.com/user/repo1.git',
        updated_at: '2024-01-01T00:00:00Z',
        pushed_at: '2024-01-01T00:00:00Z',
        size: 100,
        stargazers_count: 10,
        forks_count: 5,
        open_issues_count: 2,
        owner: { login: 'user', avatar_url: 'https://avatar.url' },
        topics: ['typescript', 'nestjs'],
        has_wiki: true,
        has_issues: true,
        has_projects: true,
        license: { key: 'mit', name: 'MIT License' },
      };

      mockOctokit.repos.get.mockResolvedValue({ data: mockRepo });

      const result = await service.getRepository('user', 'repo1', 'valid-token');

      expect(mockOctokit.repos.get).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo1',
      });
      expect(result.name).toBe('repo1');
      expect(result.topics).toContain('typescript');
    });

    it('should throw NotFoundException for non-existent repo', async () => {
      const error = new Error('Not Found');
      (error as any).status = 404;
      mockOctokit.repos.get.mockRejectedValue(error);

      await expect(
        service.getRepository('user', 'nonexistent', 'valid-token'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRepositoryTree', () => {
    it('should get repository tree structure', async () => {
      const mockTree = {
        sha: 'tree-sha',
        tree: [
          { path: 'src/index.ts', type: 'blob', size: 1000, sha: 'file-sha-1' },
          { path: 'src', type: 'tree', sha: 'dir-sha-1' },
        ],
        truncated: false,
      };

      mockOctokit.repos.get.mockResolvedValue({ data: { default_branch: 'main' } });
      mockOctokit.git.getTree.mockResolvedValue({ data: mockTree });

      const result = await service.getRepositoryTree('user', 'repo1', 'valid-token');

      expect(mockOctokit.git.getTree).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo1',
        tree_sha: 'main',
        recursive: 'true',
      });
      expect(result.tree).toHaveLength(2);
      expect(result.truncated).toBe(false);
    });

    it('should use specified branch', async () => {
      const mockTree = {
        sha: 'tree-sha',
        tree: [],
        truncated: false,
      };

      mockOctokit.git.getTree.mockResolvedValue({ data: mockTree });

      await service.getRepositoryTree('user', 'repo1', 'valid-token', 'develop');

      expect(mockOctokit.git.getTree).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo1',
        tree_sha: 'develop',
        recursive: 'true',
      });
    });
  });

  describe('getFileContent', () => {
    it('should get file content', async () => {
      const mockContent = {
        content: Buffer.from('console.log("Hello")').toString('base64'),
        encoding: 'base64',
        size: 20,
        sha: 'file-sha',
        path: 'src/index.ts',
        type: 'file',
      };

      mockOctokit.repos.getContent.mockResolvedValue({ data: mockContent });

      const result = await service.getFileContent(
        'user',
        'repo1',
        'src/index.ts',
        'valid-token',
      );

      expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo1',
        path: 'src/index.ts',
        ref: undefined,
      });
      expect(result.content).toBe('console.log("Hello")');
    });

    it('should throw BadRequestException for directory', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({ data: [] });

      await expect(
        service.getFileContent('user', 'repo1', 'src', 'valid-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent file', async () => {
      const error = new Error('Not Found');
      (error as any).status = 404;
      mockOctokit.repos.getContent.mockRejectedValue(error);

      await expect(
        service.getFileContent('user', 'repo1', 'nonexistent.ts', 'valid-token'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchRepos', () => {
    it('should search repositories', async () => {
      mockOctokit.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser' },
      });

      mockOctokit.search.repos.mockResolvedValue({
        data: {
          items: [
            {
              id: 1,
              name: 'test-repo',
              full_name: 'testuser/test-repo',
              description: 'A test repo',
              private: false,
              default_branch: 'main',
              language: 'TypeScript',
              html_url: 'https://github.com/testuser/test-repo',
              clone_url: 'https://github.com/testuser/test-repo.git',
              updated_at: '2024-01-01T00:00:00Z',
              pushed_at: '2024-01-01T00:00:00Z',
              size: 100,
              stargazers_count: 5,
              forks_count: 2,
              open_issues_count: 1,
              owner: { login: 'testuser', avatar_url: 'https://avatar.url' },
            },
          ],
        },
      });

      const result = await service.searchRepos('test', 'valid-token');

      expect(mockOctokit.search.repos).toHaveBeenCalledWith({
        q: 'test user:testuser',
        sort: 'updated',
        order: 'desc',
        per_page: 50,
      });
      expect(result.repositories).toHaveLength(1);
      expect(result.repositories[0].name).toBe('test-repo');
    });

    it('should filter by language', async () => {
      mockOctokit.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser' },
      });

      mockOctokit.search.repos.mockResolvedValue({
        data: { items: [] },
      });

      await service.searchRepos('test', 'valid-token', { language: 'typescript' });

      expect(mockOctokit.search.repos).toHaveBeenCalledWith({
        q: 'test user:testuser language:typescript',
        sort: 'updated',
        order: 'desc',
        per_page: 50,
      });
    });
  });

  describe('listBranches', () => {
    it('should list branches', async () => {
      const mockBranches = [
        {
          name: 'main',
          commit: { sha: 'commit-sha-1', url: 'https://commit.url/1' },
          protected: true,
        },
        {
          name: 'develop',
          commit: { sha: 'commit-sha-2', url: 'https://commit.url/2' },
          protected: false,
        },
      ];

      mockOctokit.repos.listBranches.mockResolvedValue({ data: mockBranches });

      const result = await service.listBranches('user', 'repo1', 'valid-token');

      expect(mockOctokit.repos.listBranches).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo1',
        per_page: 100,
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('main');
      expect(result[0].protected).toBe(true);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      mockOctokit.users.getAuthenticated.mockResolvedValue({
        data: { login: 'testuser' },
        headers: { 'x-oauth-scopes': 'repo, read:user' },
      });

      const result = await service.verifyToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.username).toBe('testuser');
      expect(result.scopes).toContain('repo');
    });

    it('should return invalid for bad token', async () => {
      mockOctokit.users.getAuthenticated.mockRejectedValue(new Error('Unauthorized'));

      const result = await service.verifyToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.username).toBeUndefined();
    });
  });
});
