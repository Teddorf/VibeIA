import { Test, TestingModule } from '@nestjs/testing';
import { RailwayExecutor } from './RailwayExecutor';
import { RailwaySetupService } from '../railway-setup.service';
import { SetupProvider, SetupTaskStatus, RailwaySetupResult } from '../dto/setup.dto';

describe('RailwayExecutor', () => {
    let executor: RailwayExecutor;
    let railwaySetupService: RailwaySetupService;

    const mockRailwaySetupService = {
        execute: jest.fn(),
        rollback: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RailwayExecutor,
                {
                    provide: RailwaySetupService,
                    useValue: mockRailwaySetupService,
                },
            ],
        }).compile();

        executor = module.get<RailwayExecutor>(RailwayExecutor);
        railwaySetupService = module.get<RailwaySetupService>(RailwaySetupService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('canExecute', () => {
        it('should return true for RAILWAY provider', () => {
            expect(executor.canExecute(SetupProvider.RAILWAY)).toBe(true);
        });

        it('should return false for other providers', () => {
            expect(executor.canExecute(SetupProvider.NEON)).toBe(false);
            expect(executor.canExecute(SetupProvider.VERCEL)).toBe(false);
        });
    });

    describe('execute', () => {
        const mockConfig = {
            userId: 'user-1',
            projectId: 'project-1',
            projectName: 'Test Project',
            providers: {
                railway: {
                    projectName: 'test-project',
                    region: 'us-west1',
                },
            },
            envVars: {
                NODE_ENV: 'production',
            },
        };

        const mockState = {
            setupId: 'setup-1',
            credentials: {
                databaseUrl: 'postgresql://db.example.com/mydb',
            },
            urls: {
                frontend: 'https://frontend.example.com',
            },
        } as any;

        const mockTask = {
            id: 'task-1',
            name: 'Setup Railway Backend',
            provider: SetupProvider.RAILWAY,
            status: SetupTaskStatus.PENDING,
            estimatedDuration: 180,
            steps: [],
        };

        const mockResult: RailwaySetupResult = {
            success: true,
            projectId: 'railway-project-123',
            dashboardUrl: 'https://railway.app/project/railway-project-123',
            services: {
                api: {
                    id: 'service-api',
                    name: 'api',
                    url: 'https://api.railway.app',
                },
            },
            steps: ['Created project', 'Deployed API service'],
        };

        it('should execute Railway setup successfully', async () => {
            mockRailwaySetupService.execute.mockResolvedValue(mockResult);

            const result = await executor.execute(mockConfig, mockState, mockTask, 'token-123');

            expect(railwaySetupService.execute).toHaveBeenCalledWith(
                mockConfig.providers.railway,
                undefined,
                false,
                expect.objectContaining({
                    DATABASE_URL: 'postgresql://db.example.com/mydb',
                    FRONTEND_URL: 'https://frontend.example.com',
                    NODE_ENV: 'production',
                }),
                'token-123',
            );
            expect(result).toEqual(mockResult);
        });

        it('should throw error if Railway configuration is missing', async () => {
            const configWithoutRailway = {
                ...mockConfig,
                providers: {},
            };

            await expect(
                executor.execute(configWithoutRailway, mockState, mockTask),
            ).rejects.toThrow('Railway configuration missing');
        });

        it('should include database URL in env vars if present', async () => {
            mockRailwaySetupService.execute.mockResolvedValue(mockResult);

            await executor.execute(mockConfig, mockState, mockTask);

            expect(railwaySetupService.execute).toHaveBeenCalledWith(
                expect.anything(),
                undefined,
                false,
                expect.objectContaining({
                    DATABASE_URL: 'postgresql://db.example.com/mydb',
                }),
                undefined,
            );
        });

        it('should include frontend URL in env vars if present', async () => {
            mockRailwaySetupService.execute.mockResolvedValue(mockResult);

            await executor.execute(mockConfig, mockState, mockTask);

            expect(railwaySetupService.execute).toHaveBeenCalledWith(
                expect.anything(),
                undefined,
                false,
                expect.objectContaining({
                    FRONTEND_URL: 'https://frontend.example.com',
                }),
                undefined,
            );
        });
    });

    describe('rollback', () => {
        it('should call rollback on RailwaySetupService', async () => {
            const resourceId = 'railway-project-123';
            const token = 'token-123';

            await executor.rollback(resourceId, token);

            expect(railwaySetupService.rollback).toHaveBeenCalledWith(resourceId, token);
        });
    });
});
