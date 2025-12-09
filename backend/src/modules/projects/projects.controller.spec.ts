import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

describe('ProjectsController', () => {
    let controller: ProjectsController;
    let service: ProjectsService;

    const mockProjectsService = {
        createProject: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        importFromGitHub: jest.fn(),
        findImportedProjects: jest.fn(),
        resyncProject: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProjectsController],
            providers: [
                {
                    provide: ProjectsService,
                    useValue: mockProjectsService,
                },
            ],
        }).compile();

        controller = module.get<ProjectsController>(ProjectsController);
        service = module.get<ProjectsService>(ProjectsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should call service.createProject with correct params', async () => {
            const dto: CreateProjectDto = { name: 'Test Project', description: 'Desc' };
            const userId = 'user1';

            await controller.create(userId, dto);

            expect(service.createProject).toHaveBeenCalledWith(userId, dto.name, dto.description);
        });

        it('should call service.createProject with default description if missing', async () => {
            const dto: CreateProjectDto = { name: 'Test Project' };
            const userId = 'user1';

            await controller.create(userId, dto);

            expect(service.createProject).toHaveBeenCalledWith(userId, dto.name, '');
        });
    });

    describe('update', () => {
        it('should call service.update with correct params', async () => {
            const dto: UpdateProjectDto = { name: 'Updated' };
            const userId = 'user1';
            const projectId = 'p1';

            await controller.update(userId, projectId, dto);

            expect(service.update).toHaveBeenCalledWith(projectId, userId, dto);
        });
    });
});
