import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PROJECT_REPOSITORY } from '../../providers/repository-tokens';
import { GitService } from '../git/git.service';
import { CodebaseAnalysisService } from '../codebase-analysis/codebase-analysis.service';
import { UsersService } from '../users/users.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repo: any;

  const mockProjectRepo = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    insertMany: jest.fn(),
  };

  const mockGitService = {
    createRepository: jest.fn(),
    getRepository: jest.fn(),
  };

  const mockCodebaseAnalysisService = {
    analyzeRepository: jest.fn(),
    clearCache: jest.fn(),
  };

  const mockUsersService = {
    getGitHubAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PROJECT_REPOSITORY,
          useValue: mockProjectRepo,
        },
        {
          provide: GitService,
          useValue: mockGitService,
        },
        {
          provide: CodebaseAnalysisService,
          useValue: mockCodebaseAnalysisService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    repo = module.get(PROJECT_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return project if found and user is owner', async () => {
      const mockProject = {
        _id: 'project1',
        name: 'Test Project',
        ownerId: 'user1',
      };
      mockProjectRepo.findById.mockResolvedValue(mockProject);

      const result = await service.findOne('project1', 'user1');
      expect(result).toEqual(mockProject);
      expect(mockProjectRepo.findById).toHaveBeenCalledWith('project1');
    });

    it('should throw NotFoundException if project not found', async () => {
      mockProjectRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('project1', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if user is not owner', async () => {
      const mockProject = {
        _id: 'project1',
        name: 'Test Project',
        ownerId: 'otherUser',
      };
      mockProjectRepo.findById.mockResolvedValue(mockProject);

      await expect(service.findOne('project1', 'user1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all projects for a user', async () => {
      const mockProjects = [
        { _id: 'p1', name: 'Project 1', ownerId: 'user1' },
        { _id: 'p2', name: 'Project 2', ownerId: 'user1' },
      ];
      mockProjectRepo.find.mockResolvedValue(mockProjects);

      const result = await service.findAll('user1');
      expect(result).toEqual(mockProjects);
      expect(mockProjectRepo.find).toHaveBeenCalledWith({ ownerId: 'user1' });
    });
  });

  describe('createProject', () => {
    it('should create a project with a GitHub repository', async () => {
      const mockRepo = { html_url: 'https://github.com/user/test', id: 12345 };
      const mockCreated = {
        _id: 'project1',
        name: 'Test',
        description: 'A test project',
        ownerId: 'user1',
        repositoryUrl: 'https://github.com/user/test',
        githubRepoId: '12345',
        status: 'active',
      };
      mockGitService.createRepository.mockResolvedValue(mockRepo);
      mockProjectRepo.create.mockResolvedValue(mockCreated);

      const result = await service.createProject(
        'user1',
        'Test',
        'A test project',
      );
      expect(result).toEqual(mockCreated);
      expect(mockGitService.createRepository).toHaveBeenCalledWith(
        'Test',
        'A test project',
      );
      expect(mockProjectRepo.create).toHaveBeenCalledWith({
        name: 'Test',
        description: 'A test project',
        ownerId: 'user1',
        repositoryUrl: 'https://github.com/user/test',
        githubRepoId: '12345',
        status: 'active',
      });
    });
  });

  describe('update', () => {
    it('should update a project if user is owner', async () => {
      const mockProject = {
        _id: 'project1',
        name: 'Old Name',
        ownerId: 'user1',
      };
      const updatedProject = {
        _id: 'project1',
        name: 'New Name',
        ownerId: 'user1',
      };
      mockProjectRepo.findById.mockResolvedValue(mockProject);
      mockProjectRepo.update.mockResolvedValue(updatedProject);

      const result = await service.update('project1', 'user1', {
        name: 'New Name',
      });
      expect(result).toEqual(updatedProject);
      expect(mockProjectRepo.update).toHaveBeenCalledWith('project1', {
        name: 'New Name',
      });
    });

    it('should throw NotFoundException if project not found', async () => {
      mockProjectRepo.findById.mockResolvedValue(null);

      await expect(
        service.update('project1', 'user1', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user is not owner', async () => {
      const mockProject = {
        _id: 'project1',
        name: 'Test',
        ownerId: 'otherUser',
      };
      mockProjectRepo.findById.mockResolvedValue(mockProject);

      await expect(
        service.update('project1', 'user1', { name: 'New' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('delete', () => {
    it('should delete a project if user is owner', async () => {
      const mockProject = { _id: 'project1', name: 'Test', ownerId: 'user1' };
      mockProjectRepo.findById.mockResolvedValue(mockProject);
      mockProjectRepo.delete.mockResolvedValue(true);

      await service.delete('project1', 'user1');
      expect(mockProjectRepo.delete).toHaveBeenCalledWith('project1');
    });

    it('should throw NotFoundException if project not found', async () => {
      mockProjectRepo.findById.mockResolvedValue(null);

      await expect(service.delete('project1', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if user is not owner', async () => {
      const mockProject = {
        _id: 'project1',
        name: 'Test',
        ownerId: 'otherUser',
      };
      mockProjectRepo.findById.mockResolvedValue(mockProject);

      await expect(service.delete('project1', 'user1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
