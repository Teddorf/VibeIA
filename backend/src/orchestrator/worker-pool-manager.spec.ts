import { WorkerPoolManager } from './worker-pool-manager';
import { loadVibeConfig } from '../config/vibe-config';

describe('WorkerPoolManager', () => {
  let manager: WorkerPoolManager;
  let mockQueueProvider: any;
  let mockCache: any;
  let mockRegistry: any;
  let mockQueue: any;

  beforeEach(() => {
    mockQueue = {
      add: jest.fn(),
      process: jest.fn(),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
    };
    mockQueueProvider = {
      getQueue: jest.fn().mockReturnValue(mockQueue),
    };
    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    mockRegistry = { getAll: jest.fn().mockReturnValue([]) };

    manager = new WorkerPoolManager(
      mockQueueProvider,
      mockCache,
      mockRegistry,
      loadVibeConfig(),
    );
  });

  describe('setupAgentQueue', () => {
    it('should create a queue for an agent', async () => {
      await manager.setupAgentQueue('coder', 3);
      expect(mockQueueProvider.getQueue).toHaveBeenCalledWith('agent:coder');

      const status = await manager.getPoolStatus('coder');
      expect(status.maxWorkers).toBe(3);
    });
  });

  describe('updateWorkerCount', () => {
    it('should update max workers', async () => {
      await manager.setupAgentQueue('coder', 2);
      await manager.updateWorkerCount('coder', 4);

      const status = await manager.getPoolStatus('coder');
      expect(status.maxWorkers).toBe(4);
    });

    it('should throw for unknown agent', async () => {
      await expect(manager.updateWorkerCount('unknown', 5)).rejects.toThrow(
        'No pool found',
      );
    });
  });

  describe('getPoolStatus', () => {
    it('should return default status for unknown agent', async () => {
      const status = await manager.getPoolStatus('unknown');
      expect(status.depth).toBe(0);
      expect(status.activeCount).toBe(0);
    });

    it('should return queue depth and active count', async () => {
      await manager.setupAgentQueue('coder');
      mockQueue.getWaiting.mockResolvedValue([{}, {}]);
      mockQueue.getActive.mockResolvedValue([{}]);

      const status = await manager.getPoolStatus('coder');
      expect(status.depth).toBe(2);
      expect(status.activeCount).toBe(1);
    });
  });

  describe('pauseQueue / resumeQueue', () => {
    it('should pause and resume a queue', async () => {
      await manager.setupAgentQueue('coder');

      await manager.pauseQueue('coder');
      let status = await manager.getPoolStatus('coder');
      expect(status.paused).toBe(true);

      await manager.resumeQueue('coder');
      status = await manager.getPoolStatus('coder');
      expect(status.paused).toBe(false);
    });
  });

  describe('context affinity', () => {
    it('should track and retrieve worker affinity', async () => {
      await manager.trackContextAffinity('coder', 'worker-1', 'auth-module');
      expect(mockCache.set).toHaveBeenCalledWith(
        'affinity:coder:auth-module',
        'worker-1',
        expect.any(Number),
      );
    });

    it('should return null when no affinity cached', async () => {
      const worker = await manager.getPreferredWorker('coder', 'auth');
      expect(worker).toBeNull();
    });
  });

  describe('getAllPoolStatuses', () => {
    it('should return statuses for all pools', async () => {
      await manager.setupAgentQueue('coder');
      await manager.setupAgentQueue('reviewer');

      const statuses = await manager.getAllPoolStatuses();
      expect(statuses).toHaveLength(2);
    });
  });
});
