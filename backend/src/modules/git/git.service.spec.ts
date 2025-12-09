import { Test, TestingModule } from '@nestjs/testing';
import { GitService } from './git.service';

// Mock Octokit
const mockOctokit = {
  repos: {
    createForAuthenticatedUser: jest.fn(),
  },
  git: {
    getRef: jest.fn(),
    createRef: jest.fn(),
    getCommit: jest.fn(),
    createBlob: jest.fn(),
    createTree: jest.fn(),
    createCommit: jest.fn(),
    updateRef: jest.fn(),
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [GitService],
    }).compile();

    service = module.get<GitService>(GitService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
});