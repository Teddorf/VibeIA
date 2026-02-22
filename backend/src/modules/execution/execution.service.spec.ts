import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionService } from './execution.service';

// Mock external dependencies
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@octokit/auth-app', () => ({
  createAppAuth: jest.fn(),
}));

// Mock Anthropic and OpenAI
jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  })),
}));

jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
  })),
}));

import { PlansService } from '../plans/plans.service';
import { ProjectsService } from '../projects/projects.service';
import { GitService } from '../git/git.service';
import { LlmService } from '../llm/llm.service';
import { UsersService } from '../users/users.service';
import { QualityGatesService } from '../quality-gates/quality-gates.service';
import { ManualTasksService } from '../manual-tasks/manual-tasks.service';
import { EventsGateway } from '../events/events.gateway';

describe('ExecutionService', () => {
  let service: ExecutionService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let plansService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let projectsService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let gitService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let llmService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let qualityGatesService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let manualTasksService: any;

  const mockPlan = {
    _id: 'plan-123',
    projectId: 'project-456',
    userId: 'user-123',
    status: 'pending',
    estimatedTime: 50,
    phases: [
      {
        name: 'Phase 1: Setup',
        tasks: [
          { id: 'task-1', name: 'Create user model', description: 'MongoDB schema', status: 'pending' },
          { id: 'task-2', name: 'Setup API routes', description: 'Express routes', status: 'pending' },
        ],
        estimatedTime: 30,
      },
      {
        name: 'Phase 2: Features',
        tasks: [
          { id: 'task-3', name: 'Configure Stripe', description: 'Payment integration', status: 'pending' },
        ],
        estimatedTime: 20,
      },
    ],
    wizardData: {
      stage1: { projectName: 'Test Project', description: 'Test' },
      stage3: { selectedArchetypes: ['auth-jwt'], technologies: ['node', 'mongodb'] },
    },
  } as any;

  const mockProject = {
    _id: 'project-456',
    name: 'Test Project',
    ownerId: 'user-123',
  } as any;

  const mockGeneratedCode = {
    files: [
      { path: 'src/models/user.ts', content: 'export interface User {}' },
    ],
  };

  const mockQualityResult = {
    passed: true,
    overallScore: 95,
    checks: [],
    blockers: [],
  };

  beforeEach(async () => {
    const mockPlansService = {
      findOne: jest.fn(),
      updateStatus: jest.fn(),
      updateTaskStatus: jest.fn(),
    };

    const mockProjectsService = {
      findOne: jest.fn(),
    };

    const mockGitService = {
      createCommit: jest.fn(),
    };

    const mockLlmService = {
      generateCode: jest.fn(),
    };

    const mockQualityGatesService = {
      runAllChecks: jest.fn(),
      generateReport: jest.fn().mockReturnValue('Quality Report'),
    };

    const mockManualTasksService = {
      detectManualTasks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionService,
        { provide: PlansService, useValue: mockPlansService },
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: GitService, useValue: mockGitService },
        { provide: LlmService, useValue: mockLlmService },
        { provide: QualityGatesService, useValue: mockQualityGatesService },
        { provide: ManualTasksService, useValue: mockManualTasksService },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: EventsGateway,
          useValue: {
            emitToExecution: jest.fn(),
            emitStatusUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExecutionService>(ExecutionService);
    plansService = module.get(PlansService);
    projectsService = module.get(ProjectsService);
    gitService = module.get(GitService);
    llmService = module.get(LlmService);
    qualityGatesService = module.get(QualityGatesService);
    manualTasksService = module.get(ManualTasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executePlan', () => {
    it('should throw error if plan not found', async () => {
      plansService.findOne.mockResolvedValue(null);

      await expect(service.executePlan('invalid-id')).rejects.toThrow('Plan not found');
    });

    it('should throw error if project not found', async () => {
      plansService.findOne.mockResolvedValue(mockPlan);
      projectsService.findOne.mockResolvedValue(null);

      await expect(service.executePlan('plan-123')).rejects.toThrow('Project not found');
    });

    it('should execute all automated tasks in plan', async () => {
      plansService.findOne.mockResolvedValue(mockPlan);
      projectsService.findOne.mockResolvedValue(mockProject);
      llmService.generateCode.mockResolvedValue(mockGeneratedCode);
      qualityGatesService.runAllChecks.mockResolvedValue(mockQualityResult);
      manualTasksService.detectManualTasks.mockReturnValue(null);
      gitService.createCommit.mockResolvedValue({});

      await service.executePlan('plan-123');

      expect(plansService.updateStatus).toHaveBeenCalledWith('plan-123', 'in_progress');
      expect(llmService.generateCode).toHaveBeenCalled();
      expect(qualityGatesService.runAllChecks).toHaveBeenCalled();
    });

    it('should pause execution when manual task detected', async () => {
      const planWithManualTask = {
        ...mockPlan,
        phases: [
          {
            name: 'Phase 1',
            tasks: [
              { id: 'task-1', name: 'Configure Stripe', description: 'Payment setup', status: 'pending' },
            ],
            estimatedTime: 10,
          },
        ],
      };

      plansService.findOne.mockResolvedValue(planWithManualTask);
      projectsService.findOne.mockResolvedValue(mockProject);
      manualTasksService.detectManualTasks.mockReturnValue({
        id: 'manual-1',
        type: 'stripe_setup',
        title: 'Configure Stripe',
        description: 'Setup payment',
        instructions: [],
        requiredInputs: [],
        validationRules: [],
        estimatedMinutes: 10,
        category: 'api_setup',
      });

      await service.executePlan('plan-123');

      expect(plansService.updateTaskStatus).toHaveBeenCalledWith(
        'plan-123',
        0,
        'task-1',
        'paused'
      );
    });

    it('should continue execution after quality gates pass', async () => {
      const singleTaskPlan = {
        ...mockPlan,
        phases: [
          {
            name: 'Phase 1',
            tasks: [{ id: 'task-1', name: 'Create model', description: 'Test', status: 'pending' }],
            estimatedTime: 10,
          },
        ],
      };

      plansService.findOne.mockResolvedValue(singleTaskPlan);
      projectsService.findOne.mockResolvedValue(mockProject);
      llmService.generateCode.mockResolvedValue(mockGeneratedCode);
      qualityGatesService.runAllChecks.mockResolvedValue(mockQualityResult);
      manualTasksService.detectManualTasks.mockReturnValue(null);

      await service.executePlan('plan-123');

      expect(plansService.updateTaskStatus).toHaveBeenCalledWith(
        'plan-123',
        0,
        'task-1',
        'completed'
      );
      expect(plansService.updateStatus).toHaveBeenCalledWith('plan-123', 'completed');
    });

    it('should mark task as failed when quality gates fail', async () => {
      const failedQualityResult = {
        passed: false,
        overallScore: 40,
        checks: [],
        blockers: [{ severity: 'error', file: 'test.ts', message: 'Security issue' }],
      };

      const singleTaskPlan = {
        ...mockPlan,
        phases: [
          {
            name: 'Phase 1',
            tasks: [{ id: 'task-1', name: 'Create model', description: 'Test', status: 'pending' }],
            estimatedTime: 10,
          },
        ],
      };

      plansService.findOne.mockResolvedValue(singleTaskPlan);
      projectsService.findOne.mockResolvedValue(mockProject);
      llmService.generateCode.mockResolvedValue(mockGeneratedCode);
      qualityGatesService.runAllChecks.mockResolvedValue(failedQualityResult);
      manualTasksService.detectManualTasks.mockReturnValue(null);

      await service.executePlan('plan-123');

      expect(plansService.updateTaskStatus).toHaveBeenCalledWith(
        'plan-123',
        0,
        'task-1',
        'failed'
      );
    });

    it('should skip tasks that are already completed', async () => {
      const planWithCompletedTask = {
        ...mockPlan,
        phases: [
          {
            name: 'Phase 1',
            tasks: [
              { id: 'task-1', name: 'Completed task', description: 'Done', status: 'completed' },
              { id: 'task-2', name: 'Pending task', description: 'Todo', status: 'pending' },
            ],
            estimatedTime: 20,
          },
        ],
      };

      plansService.findOne.mockResolvedValue(planWithCompletedTask);
      projectsService.findOne.mockResolvedValue(mockProject);
      llmService.generateCode.mockResolvedValue(mockGeneratedCode);
      qualityGatesService.runAllChecks.mockResolvedValue(mockQualityResult);
      manualTasksService.detectManualTasks.mockReturnValue(null);

      await service.executePlan('plan-123');

      // Should only be called once for the pending task
      expect(llmService.generateCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('getExecutionStatus', () => {
    it('should return plan with execution state', async () => {
      plansService.findOne.mockResolvedValue(mockPlan);

      const result = await service.getExecutionStatus('plan-123');

      expect(result).toHaveProperty('executionState');
      expect(result.executionState.planId).toBe('plan-123');
    });

    it('should throw error if plan not found', async () => {
      plansService.findOne.mockResolvedValue(null);

      await expect(service.getExecutionStatus('invalid-id')).rejects.toThrow('Plan not found');
    });
  });

  describe('pauseExecution', () => {
    it('should pause execution and update plan status', async () => {
      // First start execution to create state
      plansService.findOne.mockResolvedValue(mockPlan);
      projectsService.findOne.mockResolvedValue(mockProject);
      manualTasksService.detectManualTasks.mockReturnValue({
        id: 'manual-1',
        type: 'stripe_setup',
        title: 'Configure Stripe',
        description: 'Setup',
        instructions: [],
        requiredInputs: [],
        validationRules: [],
        estimatedMinutes: 10,
        category: 'api_setup',
      });

      await service.executePlan('plan-123');

      const result = await service.pauseExecution('plan-123');

      expect(result.message).toBe('Execution paused');
      expect(plansService.updateStatus).toHaveBeenCalledWith('plan-123', 'paused');
    });
  });

  describe('resumeExecution', () => {
    it('should throw error if no execution state found', async () => {
      await expect(service.resumeExecution('unknown-plan')).rejects.toThrow('No execution state found');
    });

    it('should resume from paused state', async () => {
      // First start and pause execution
      plansService.findOne.mockResolvedValue(mockPlan);
      projectsService.findOne.mockResolvedValue(mockProject);
      manualTasksService.detectManualTasks.mockReturnValueOnce({
        id: 'manual-1',
        type: 'stripe_setup',
        title: 'Configure Stripe',
        description: 'Setup',
        instructions: [],
        requiredInputs: [],
        validationRules: [],
        estimatedMinutes: 10,
        category: 'api_setup',
      });

      await service.executePlan('plan-123');

      // Now resume - manual task should be skipped on resume
      manualTasksService.detectManualTasks.mockReturnValue(null);
      llmService.generateCode.mockResolvedValue(mockGeneratedCode);
      qualityGatesService.runAllChecks.mockResolvedValue(mockQualityResult);

      await service.resumeExecution('plan-123');

      expect(plansService.updateStatus).toHaveBeenCalledWith('plan-123', 'in_progress');
    });
  });

  describe('task execution with no files generated', () => {
    it('should complete task even if no files are generated', async () => {
      const singleTaskPlan = {
        ...mockPlan,
        phases: [
          {
            name: 'Phase 1',
            tasks: [{ id: 'task-1', name: 'Documentation task', description: 'Test', status: 'pending' }],
            estimatedTime: 10,
          },
        ],
      };

      plansService.findOne.mockResolvedValue(singleTaskPlan);
      projectsService.findOne.mockResolvedValue(mockProject);
      llmService.generateCode.mockResolvedValue({ files: [] });
      manualTasksService.detectManualTasks.mockReturnValue(null);

      await service.executePlan('plan-123');

      expect(plansService.updateTaskStatus).toHaveBeenCalledWith(
        'plan-123',
        0,
        'task-1',
        'completed'
      );
      expect(qualityGatesService.runAllChecks).not.toHaveBeenCalled();
    });
  });

  describe('git commit error handling', () => {
    it('should not fail task if git commit fails', async () => {
      const singleTaskPlan = {
        ...mockPlan,
        phases: [
          {
            name: 'Phase 1',
            tasks: [{ id: 'task-1', name: 'Create model', description: 'Test', status: 'pending' }],
            estimatedTime: 10,
          },
        ],
      };

      plansService.findOne.mockResolvedValue(singleTaskPlan);
      projectsService.findOne.mockResolvedValue(mockProject);
      llmService.generateCode.mockResolvedValue(mockGeneratedCode);
      qualityGatesService.runAllChecks.mockResolvedValue(mockQualityResult);
      manualTasksService.detectManualTasks.mockReturnValue(null);
      gitService.createCommit.mockRejectedValue(new Error('Git error'));

      await service.executePlan('plan-123');

      // Task should still be marked as completed
      expect(plansService.updateTaskStatus).toHaveBeenCalledWith(
        'plan-123',
        0,
        'task-1',
        'completed'
      );
    });
  });
});
