import { Test, TestingModule } from '@nestjs/testing';
import { RetryService } from './retry.service';
import { RollbackEngineService } from './rollback-engine.service';
import { RecoveryService } from './recovery.service';
import {
  ErrorType,
  BackoffType,
  RecoveryStrategy,
  UserAction,
} from './dto/error-handling.dto';

describe('RetryService', () => {
  let service: RetryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RetryService],
    }).compile();

    service = module.get<RetryService>(RetryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classifyError', () => {
    it('should classify network errors', () => {
      const error = new Error('Network connection failed');
      const result = service.classifyError(error);
      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.recoverable).toBe(true);
    });

    it('should classify rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      const result = service.classifyError(error);
      expect(result.type).toBe(ErrorType.RATE_LIMIT);
    });

    it('should classify auth errors as non-recoverable', () => {
      const error = new Error('Unauthorized - invalid token');
      const result = service.classifyError(error);
      expect(result.type).toBe(ErrorType.AUTH);
      expect(result.recoverable).toBe(false);
      expect(result.suggestedAction).toBe(UserAction.REAUTH);
    });

    it('should classify validation errors', () => {
      const error = new Error('Validation failed: invalid input');
      const result = service.classifyError(error);
      expect(result.type).toBe(ErrorType.VALIDATION);
      expect(result.recoverable).toBe(false);
    });

    it('should classify quota errors', () => {
      const error = new Error('Quota limit exceeded for this plan');
      const result = service.classifyError(error);
      expect(result.type).toBe(ErrorType.QUOTA);
      expect(result.suggestedAction).toBe(UserAction.UPGRADE_PLAN);
    });

    it('should classify timeout errors', () => {
      const error = new Error('Request timed out');
      const result = service.classifyError(error);
      expect(result.type).toBe(ErrorType.TIMEOUT);
    });

    it('should classify server errors', () => {
      const error = new Error('Internal server error 500');
      const result = service.classifyError(error);
      expect(result.type).toBe(ErrorType.SERVER);
    });

    it('should handle unknown errors', () => {
      const error = new Error('Something went wrong');
      const result = service.classifyError(error);
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.recoverable).toBe(true);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff', () => {
      const strategy = {
        retry: true,
        maxRetries: 3,
        backoff: BackoffType.EXPONENTIAL,
        initialDelay: 1000,
        maxDelay: 60000,
        rollbackOnFailure: true,
      };

      const delay1 = service.calculateDelay(1, strategy);
      const delay2 = service.calculateDelay(2, strategy);
      const delay3 = service.calculateDelay(3, strategy);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThan(1200);
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay3).toBeGreaterThanOrEqual(4000);
    });

    it('should calculate linear backoff', () => {
      const strategy = {
        retry: true,
        maxRetries: 3,
        backoff: BackoffType.LINEAR,
        initialDelay: 1000,
        maxDelay: 60000,
        rollbackOnFailure: true,
      };

      const delay1 = service.calculateDelay(1, strategy);
      const delay2 = service.calculateDelay(2, strategy);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeGreaterThanOrEqual(2000);
    });

    it('should respect maxDelay', () => {
      const strategy = {
        retry: true,
        maxRetries: 10,
        backoff: BackoffType.EXPONENTIAL,
        initialDelay: 1000,
        maxDelay: 5000,
        rollbackOnFailure: true,
      };

      const delay = service.calculateDelay(10, strategy);
      expect(delay).toBeLessThanOrEqual(5500);
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await service.executeWithRetry(operation, ErrorType.NETWORK, {
        initialDelay: 10,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(result.errors.length).toBe(1);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));

      const result = await service.executeWithRetry(operation, ErrorType.NETWORK, {
        maxRetries: 2,
        initialDelay: 10,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Unauthorized'));

      const result = await service.executeWithRetry(operation, ErrorType.AUTH);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
    });
  });

  describe('isRetryable', () => {
    it('should return true for network errors', () => {
      const error = service.classifyError(new Error('Network error'));
      expect(service.isRetryable(error)).toBe(true);
    });

    it('should return false for auth errors', () => {
      const error = service.classifyError(new Error('Unauthorized'));
      expect(service.isRetryable(error)).toBe(false);
    });
  });
});

describe('RollbackEngineService', () => {
  let service: RollbackEngineService;
  let retryService: RetryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RollbackEngineService, RetryService],
    }).compile();

    service = module.get<RollbackEngineService>(RollbackEngineService);
    retryService = module.get<RetryService>(RetryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeStack', () => {
    it('should create empty stack for setupId', () => {
      service.initializeStack('setup-123');
      const status = service.getStatus('setup-123');
      expect(status.pending).toBe(0);
      expect(status.executed).toBe(0);
    });
  });

  describe('registerAction', () => {
    it('should add action to stack', () => {
      service.initializeStack('setup-123');
      service.registerAction('setup-123', {
        id: 'action-1',
        taskId: 'task-1',
        provider: 'neon',
        action: 'delete-project',
        resourceId: 'proj-123',
        resourceType: 'project',
        priority: 1,
        createdAt: new Date(),
      });

      const status = service.getStatus('setup-123');
      expect(status.pending).toBe(1);
      expect(status.actions.length).toBe(1);
    });
  });

  describe('hasActions', () => {
    it('should return false for empty stack', () => {
      expect(service.hasActions('unknown-setup')).toBe(false);
    });

    it('should return true when actions exist', () => {
      service.initializeStack('setup-123');
      service.registerAction('setup-123', {
        id: 'action-1',
        taskId: 'task-1',
        provider: 'neon',
        action: 'delete-project',
        resourceId: 'proj-123',
        resourceType: 'project',
        priority: 1,
        createdAt: new Date(),
      });

      expect(service.hasActions('setup-123')).toBe(true);
    });
  });

  describe('rollback', () => {
    it('should return success for empty stack', async () => {
      const result = await service.rollback('unknown-setup', 'test');

      expect(result.success).toBe(true);
      expect(result.actionsExecuted).toBe(0);
    });
  });

  describe('calculateCostAvoided', () => {
    it('should calculate costs for different providers', () => {
      const actions = [
        {
          id: '1',
          taskId: 't1',
          provider: 'vercel',
          action: 'delete',
          resourceId: 'r1',
          resourceType: 'project',
          priority: 1,
          createdAt: new Date(),
        },
        {
          id: '2',
          taskId: 't2',
          provider: 'railway',
          action: 'delete',
          resourceId: 'r2',
          resourceType: 'project',
          priority: 1,
          createdAt: new Date(),
        },
        {
          id: '3',
          taskId: 't3',
          provider: 'neon',
          action: 'delete',
          resourceId: 'r3',
          resourceType: 'database',
          priority: 1,
          createdAt: new Date(),
        },
      ];

      const cost = service.calculateCostAvoided(actions);

      expect(cost.vercel.monthly).toBe(0);
      expect(cost.railway.monthly).toBe(5);
      expect(cost.neon.monthly).toBe(0);
      expect(cost.totalMonthly).toBe(5);
    });
  });

  describe('clearStack', () => {
    it('should remove all actions for setupId', () => {
      service.initializeStack('setup-123');
      service.registerAction('setup-123', {
        id: 'action-1',
        taskId: 'task-1',
        provider: 'neon',
        action: 'delete-project',
        resourceId: 'proj-123',
        resourceType: 'project',
        priority: 1,
        createdAt: new Date(),
      });

      service.clearStack('setup-123');

      expect(service.hasActions('setup-123')).toBe(false);
    });
  });
});

describe('RecoveryService', () => {
  let service: RecoveryService;
  let rollbackEngine: RollbackEngineService;
  let retryService: RetryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecoveryService, RollbackEngineService, RetryService],
    }).compile();

    service = module.get<RecoveryService>(RecoveryService);
    rollbackEngine = module.get<RollbackEngineService>(RollbackEngineService);
    retryService = module.get<RetryService>(RetryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeFailure', () => {
    const baseState = {
      setupId: 'setup-123',
      status: 'failed',
      completedTasks: [],
      resources: new Map<string, string>(),
    };

    it('should analyze network errors as recoverable', () => {
      const error = {
        type: ErrorType.NETWORK,
        message: 'Network error',
        timestamp: new Date(),
        recoverable: true,
      };

      const analysis = service.analyzeFailure(baseState, error);

      expect(analysis.recoverable).toBe(true);
      expect(analysis.strategy).toBe(RecoveryStrategy.PARTIAL_ROLLBACK);
      expect(analysis.confidence).toBeGreaterThan(0.5);
    });

    it('should analyze rate limit errors', () => {
      const error = {
        type: ErrorType.RATE_LIMIT,
        message: 'Rate limit',
        timestamp: new Date(),
        recoverable: true,
      };

      const analysis = service.analyzeFailure(baseState, error);

      expect(analysis.recoverable).toBe(true);
      expect(analysis.strategy).toBe(RecoveryStrategy.SKIP);
    });

    it('should analyze auth errors as non-recoverable', () => {
      const error = {
        type: ErrorType.AUTH,
        message: 'Unauthorized',
        timestamp: new Date(),
        recoverable: false,
      };

      const analysis = service.analyzeFailure(baseState, error);

      expect(analysis.recoverable).toBe(false);
      expect(analysis.strategy).toBe(RecoveryStrategy.MANUAL);
      expect(analysis.suggestedActions).toContain(UserAction.REAUTH);
    });

    it('should analyze quota errors', () => {
      const error = {
        type: ErrorType.QUOTA,
        message: 'Quota exceeded',
        timestamp: new Date(),
        recoverable: false,
      };

      const analysis = service.analyzeFailure(baseState, error);

      expect(analysis.recoverable).toBe(false);
      expect(analysis.strategy).toBe(RecoveryStrategy.FULL_ROLLBACK);
      expect(analysis.suggestedActions).toContain(UserAction.UPGRADE_PLAN);
    });

    it('should handle critical task failures', () => {
      const stateWithCriticalTask = {
        ...baseState,
        failedTask: 'create_database',
      };

      const error = {
        type: ErrorType.SERVER,
        message: 'Server error',
        timestamp: new Date(),
        recoverable: true,
      };

      const analysis = service.analyzeFailure(stateWithCriticalTask, error);

      expect(analysis.strategy).toBe(RecoveryStrategy.FULL_ROLLBACK);
    });
  });

  describe('canRecover', () => {
    it('should return true for network errors', () => {
      const error = {
        type: ErrorType.NETWORK,
        message: 'Network error',
        timestamp: new Date(),
        recoverable: true,
      };

      expect(service.canRecover(error)).toBe(true);
    });

    it('should return false for auth errors', () => {
      const error = {
        type: ErrorType.AUTH,
        message: 'Auth error',
        timestamp: new Date(),
        recoverable: false,
      };

      expect(service.canRecover(error)).toBe(false);
    });
  });

  describe('getRecoveryConfidence', () => {
    it('should return high confidence for rate limit errors', () => {
      const error = {
        type: ErrorType.RATE_LIMIT,
        message: 'Rate limit',
        timestamp: new Date(),
        recoverable: true,
      };

      const confidence = service.getRecoveryConfidence(error, false);
      expect(confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should reduce confidence for critical tasks', () => {
      const error = {
        type: ErrorType.NETWORK,
        message: 'Network',
        timestamp: new Date(),
        recoverable: true,
      };

      const normalConfidence = service.getRecoveryConfidence(error, false);
      const criticalConfidence = service.getRecoveryConfidence(error, true);

      expect(criticalConfidence).toBeLessThan(normalConfidence);
    });

    it('should return zero for non-recoverable errors', () => {
      const error = {
        type: ErrorType.AUTH,
        message: 'Auth',
        timestamp: new Date(),
        recoverable: false,
      };

      const confidence = service.getRecoveryConfidence(error, false);
      expect(confidence).toBe(0);
    });
  });

  describe('attemptRecovery', () => {
    it('should return unsuccessful result for non-recoverable errors', async () => {
      const state = {
        setupId: 'setup-123',
        status: 'failed',
        completedTasks: [],
        resources: new Map<string, string>(),
      };

      const error = {
        type: ErrorType.AUTH,
        message: 'Unauthorized',
        timestamp: new Date(),
        recoverable: false,
      };

      const result = await service.attemptRecovery(state, error);

      expect(result.success).toBe(false);
      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps!.length).toBeGreaterThan(0);
    });
  });
});
