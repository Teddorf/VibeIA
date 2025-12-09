
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { getModelToken } from '@nestjs/mongoose';
import { Project } from '../../schemas/project.schema';
import { GitService } from '../git/git.service';
import { CodebaseAnalysisService } from '../codebase-analysis/codebase-analysis.service';
import { UsersService } from '../users/users.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('ProjectsService', () => {
    let service: ProjectsService;
    let model: any;

    const mockProjectModel = {
        findById: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
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
                    provide: getModelToken(Project.name),
                    useValue: mockProjectModel,
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
        model = module.get(getModelToken(Project.name));
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
                exec: jest.fn().mockResolvedValue({
                    _id: 'project1',
                    name: 'Test Project',
                    ownerId: 'user1',
                }),
            };
            mockProjectModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockProject),
            });

            const result = await service.findOne('project1', 'user1');
            expect(result).toEqual(mockProject);
            expect(mockProjectModel.findById).toHaveBeenCalledWith('project1');
        });

        it('should throw NotFoundException if project not found', async () => {
            mockProjectModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

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
            mockProjectModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockProject),
            });

            await expect(service.findOne('project1', 'user1')).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });
});
