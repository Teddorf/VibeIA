import { AgentExecutionRepositoryAdapter } from './agent-execution-repository.adapter';

describe('AgentExecutionRepositoryAdapter', () => {
  let adapter: AgentExecutionRepositoryAdapter;
  let mockModel: any;

  beforeEach(() => {
    mockModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      countDocuments: jest.fn(),
      insertMany: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findOneAndDelete: jest.fn(),
    };
    adapter = new AgentExecutionRepositoryAdapter(mockModel);
  });

  describe('getMetricsForPipeline', () => {
    it('should compute metrics from executions', async () => {
      const executions = [
        {
          status: 'completed',
          metrics: { costUSD: 0.5, tokensUsed: 1000, durationMs: 2000 },
        },
        {
          status: 'completed',
          metrics: { costUSD: 0.3, tokensUsed: 800, durationMs: 1500 },
        },
        {
          status: 'failed',
          metrics: { costUSD: 0.1, tokensUsed: 200, durationMs: 500 },
        },
      ];
      jest.spyOn(adapter, 'find').mockResolvedValue(executions as any);

      const result = await adapter.getMetricsForPipeline('pipe1');
      expect(result.totalExecutions).toBe(3);
      expect(result.completedExecutions).toBe(2);
      expect(result.failedExecutions).toBe(1);
      expect(result.totalCostUSD).toBeCloseTo(0.9);
      expect(result.totalTokensUsed).toBe(2000);
      expect(result.averageDurationMs).toBeCloseTo(4000 / 3);
    });

    it('should return zero metrics for empty pipeline', async () => {
      jest.spyOn(adapter, 'find').mockResolvedValue([]);

      const result = await adapter.getMetricsForPipeline('pipe1');
      expect(result.totalExecutions).toBe(0);
      expect(result.completedExecutions).toBe(0);
      expect(result.failedExecutions).toBe(0);
      expect(result.totalCostUSD).toBe(0);
      expect(result.totalTokensUsed).toBe(0);
      expect(result.averageDurationMs).toBe(0);
    });

    it('should handle executions without metrics', async () => {
      const executions = [
        { status: 'completed', metrics: undefined },
        { status: 'failed' },
      ];
      jest.spyOn(adapter, 'find').mockResolvedValue(executions as any);

      const result = await adapter.getMetricsForPipeline('pipe1');
      expect(result.totalCostUSD).toBe(0);
      expect(result.totalTokensUsed).toBe(0);
      expect(result.averageDurationMs).toBe(0);
    });
  });

  describe('getCostForProject', () => {
    it('should sum costUSD across all executions', async () => {
      const executions = [
        { metrics: { costUSD: 1.5 } },
        { metrics: { costUSD: 2.3 } },
        { metrics: { costUSD: 0.7 } },
      ];
      jest.spyOn(adapter, 'find').mockResolvedValue(executions as any);

      const result = await adapter.getCostForProject('proj1');
      expect(result).toBeCloseTo(4.5);
    });

    it('should return 0 when no executions exist', async () => {
      jest.spyOn(adapter, 'find').mockResolvedValue([]);

      const result = await adapter.getCostForProject('proj1');
      expect(result).toBe(0);
    });

    it('should handle executions without metrics gracefully', async () => {
      const executions = [
        { metrics: { costUSD: 1.0 } },
        { metrics: undefined },
        {},
      ];
      jest.spyOn(adapter, 'find').mockResolvedValue(executions as any);

      const result = await adapter.getCostForProject('proj1');
      expect(result).toBeCloseTo(1.0);
    });
  });
});
