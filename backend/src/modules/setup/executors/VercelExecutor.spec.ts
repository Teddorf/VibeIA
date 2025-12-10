import { Test, TestingModule } from '@nestjs/testing';
import { VercelExecutor } from './VercelExecutor';
import { VercelSetupService } from '../vercel-setup.service';
import { SetupProvider, SetupTaskStatus, VercelSetupResult } from '../dto/setup.dto';

describe('VercelExecutor', () => {
    let executor: VercelExecutor;
    let vercelSetupService: VercelSetupService;

    const mockVercelSetupService = {
        execute: jest.fn(),
        rollback: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VercelExecutor,
                {
                    provide: VercelSetupService,
                    useValue: mockVercelSetupService,
                },
            ],
        }).compile();

        executor = module.get<VercelExecutor>(VercelExecutor);
        vercelSetupService = module.get<VercelSetupService>(VercelSetupService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('canExecute', () => {
        it('should return true for VERCEL provider', () => {
            expect(executor.canExecute(SetupProvider.VERCEL)).toBe(true);
        });

        it('should return false for other providers', () => {
            expect(executor.canExecute(SetupProvider.NEON)).toBe(false);
            expect(executor.canExecute(SetupProvider.RAILWAY)).toBe(false);
        });
    });

    describe('execute', () => {
        const mockConfig = {
            userId: 'user-1',
            projectId: 'project-1',
            projectName: 'Test Project',
            providers: {
                vercel: {
                    projectName: 'test-project',
                    framework: 'nextjs',
                },
            },
            envVars: {
                NEXT_PUBLIC_API_URL: 'https://api.example.com',
            },
        };

        const mockState = {
            setupId: 'setup-1',
            credentials: {
                databaseUrl: 'postgresql://db.example.com/mydb',
            },
        } as any;

        const mockTask = {
            id: 'task-1',
            name: 'Setup Vercel Frontend',
            provider: SetupProvider.VERCEL,
            status: SetupTaskStatus.PENDING,
            estimatedDuration: 180,
            steps: [],
        };

        const mockResult: VercelSetupResult = {
            projectId: 'vercel-project-123',
            url: 'https://test-project.vercel.app',
            dashboardUrl: 'https://vercel.com/user/test-project',
            deploymentUrl: 'https://test-project-abc123.vercel.app',
            steps: ['Created project', 'Deployed application'],
        };

        it('should execute Vercel setup successfully', async () => {
            mockVercelSetupService.execute.mockResolvedValue(mockResult);

            const result = await executor.execute(mockConfig, mockState, mockTask, 'token-123');

            expect(vercelSetupService.execute).toHaveBeenCalledWith(
                mockConfig.providers.vercel,
                expect.arrayContaining([
                    expect.objectContaining({
                        key: 'DATABASE_URL',
                        value: 'postgresql://db.example.com/mydb',
                        target: ['production', 'preview'],
                    }),
                    expect.objectContaining({
                        key: 'NEXT_PUBLIC_API_URL',
                        value: 'https://api.example.com',
                        target: ['production', 'preview', 'development'],
                    }),
                ]),
                undefined,
                'token-123',
            );
            expect(result).toEqual(mockResult);
        });

        it('should throw error if Vercel configuration is missing', async () => {
            const configWithoutVercel = {
                ...mockConfig,
                providers: {},
            };

            await expect(
                executor.execute(configWithoutVercel, mockState, mockTask),
            ).rejects.toThrow('Vercel configuration missing');
        });

        it('should include database URL as environment variable', async () => {
            mockVercelSetupService.execute.mockResolvedValue(mockResult);

            await executor.execute(mockConfig, mockState, mockTask);

            expect(vercelSetupService.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    expect.objectContaining({
                        key: 'DATABASE_URL',
                        value: 'postgresql://db.example.com/mydb',
                    }),
                ]),
                undefined,
                undefined,
            );
        });

        it('should convert config envVars to Vercel format', async () => {
            mockVercelSetupService.execute.mockResolvedValue(mockResult);

            await executor.execute(mockConfig, mockState, mockTask);

            expect(vercelSetupService.execute).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    expect.objectContaining({
                        key: 'NEXT_PUBLIC_API_URL',
                        value: 'https://api.example.com',
                        target: ['production', 'preview', 'development'],
                    }),
                ]),
                undefined,
                undefined,
            );
        });

        it('should work without database URL', async () => {
            const stateWithoutDb = { ...mockState, credentials: {} };
            mockVercelSetupService.execute.mockResolvedValue(mockResult);

            await executor.execute(mockConfig, stateWithoutDb, mockTask);

            const envVars = mockVercelSetupService.execute.mock.calls[0][1];
            const dbEnvVar = envVars.find((v: any) => v.key === 'DATABASE_URL');
            expect(dbEnvVar).toBeUndefined();
        });
    });

    describe('rollback', () => {
        it('should call rollback on VercelSetupService', async () => {
            const resourceId = 'vercel-project-123';
            const token = 'token-123';

            await executor.rollback(resourceId, token);

            expect(vercelSetupService.rollback).toHaveBeenCalledWith(resourceId, token);
        });
    });
});
