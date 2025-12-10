import { Test, TestingModule } from '@nestjs/testing';
import { NeonExecutor } from './NeonExecutor';
import { NeonSetupService } from '../neon-setup.service';
import { SetupProvider, SetupTaskStatus, NeonSetupResult } from '../dto/setup.dto';

describe('NeonExecutor', () => {
    let executor: NeonExecutor;
    let neonSetupService: NeonSetupService;

    const mockNeonSetupService = {
        execute: jest.fn(),
        rollback: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NeonExecutor,
                {
                    provide: NeonSetupService,
                    useValue: mockNeonSetupService,
                },
            ],
        }).compile();

        executor = module.get<NeonExecutor>(NeonExecutor);
        neonSetupService = module.get<NeonSetupService>(NeonSetupService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('canExecute', () => {
        it('should return true for NEON provider', () => {
            expect(executor.canExecute(SetupProvider.NEON)).toBe(true);
        });

        it('should return false for other providers', () => {
            expect(executor.canExecute(SetupProvider.VERCEL)).toBe(false);
            expect(executor.canExecute(SetupProvider.RAILWAY)).toBe(false);
        });
    });

    describe('execute', () => {
        const mockConfig = {
            userId: 'user-1',
            projectId: 'project-1',
            projectName: 'Test Project',
            providers: {
                neon: {
                    projectName: 'test-project',
                    region: 'us-east-1',
                },
            },
        };

        const mockState = {
            setupId: 'setup-1',
            userId: 'user-1',
            projectId: 'project-1',
            status: 'in_progress',
            tasks: [],
            credentials: {},
            urls: { dashboards: {} },
        } as any;

        const mockTask = {
            id: 'task-1',
            name: 'Setup Neon Database',
            provider: SetupProvider.NEON,
            status: SetupTaskStatus.PENDING,
            estimatedDuration: 120,
            steps: [],
        };

        const mockResult: NeonSetupResult = {
            success: true,
            projectId: 'neon-project-123',
            dashboardUrl: 'https://console.neon.tech/projects/neon-project-123',
            connectionStrings: {
                main: 'postgresql://user:pass@host/db',
                pooler: 'postgresql://user:pass@pooler/db',
            },
            region: 'us-east-1',
            steps: ['Created project', 'Set up database'],
        };

        it('should execute Neon setup successfully', async () => {
            mockNeonSetupService.execute.mockResolvedValue(mockResult);

            const result = await executor.execute(mockConfig, mockState, mockTask, 'token-123');

            expect(neonSetupService.execute).toHaveBeenCalledWith(
                mockConfig.providers.neon,
                'token-123',
            );
            expect(result).toEqual(mockResult);
        });

        it('should throw error if Neon configuration is missing', async () => {
            const configWithoutNeon = {
                ...mockConfig,
                providers: {},
            };

            await expect(
                executor.execute(configWithoutNeon, mockState, mockTask),
            ).rejects.toThrow('Neon configuration missing');
        });

        it('should pass token to service', async () => {
            mockNeonSetupService.execute.mockResolvedValue(mockResult);
            const token = 'my-neon-token';

            await executor.execute(mockConfig, mockState, mockTask, token);

            expect(neonSetupService.execute).toHaveBeenCalledWith(
                mockConfig.providers.neon,
                token,
            );
        });
    });

    describe('rollback', () => {
        it('should call rollback on NeonSetupService', async () => {
            const resourceId = 'neon-project-123';
            const token = 'token-123';

            await executor.rollback(resourceId, token);

            expect(neonSetupService.rollback).toHaveBeenCalledWith(resourceId, token);
        });

        it('should work without token', async () => {
            const resourceId = 'neon-project-123';

            await executor.rollback(resourceId);

            expect(neonSetupService.rollback).toHaveBeenCalledWith(resourceId, undefined);
        });
    });
});
