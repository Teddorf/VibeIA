import { CostTracker } from './cost-tracker';

describe('CostTracker', () => {
  let tracker: CostTracker;
  let mockRepo: Record<string, jest.Mock>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    };
    tracker = new CostTracker(mockRepo as any);
  });

  describe('trackCost', () => {
    it('should store execution cost record', async () => {
      const execution = { projectId: 'p1', agentId: 'coder' };
      await tracker.trackCost(execution as any);
      expect(mockRepo.create).toHaveBeenCalledWith(execution);
    });
  });

  describe('getCostForProject', () => {
    it('should return empty summary for no executions', async () => {
      const summary = await tracker.getCostForProject('p1');
      expect(summary.totalCostUSD).toBe(0);
      expect(summary.totalTokensUsed).toBe(0);
      expect(summary.executionCount).toBe(0);
      expect(summary.byAgent).toEqual({});
    });

    it('should aggregate costs by agent', async () => {
      mockRepo.find.mockResolvedValue([
        { agentId: 'coder', metrics: { costUSD: 0.01, tokensUsed: 500 } },
        { agentId: 'coder', metrics: { costUSD: 0.02, tokensUsed: 1000 } },
        { agentId: 'reviewer', metrics: { costUSD: 0.005, tokensUsed: 200 } },
      ]);

      const summary = await tracker.getCostForProject('p1');
      expect(summary.totalCostUSD).toBeCloseTo(0.035);
      expect(summary.totalTokensUsed).toBe(1700);
      expect(summary.executionCount).toBe(3);
      expect(summary.byAgent['coder'].count).toBe(2);
      expect(summary.byAgent['reviewer'].count).toBe(1);
    });

    it('should handle missing metrics gracefully', async () => {
      mockRepo.find.mockResolvedValue([
        { agentId: 'coder', metrics: undefined },
        { agentId: 'coder', metrics: { costUSD: 0.01 } },
      ]);

      const summary = await tracker.getCostForProject('p1');
      expect(summary.totalCostUSD).toBeCloseTo(0.01);
      expect(summary.totalTokensUsed).toBe(0);
    });

    it('should support date range filter', async () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');
      await tracker.getCostForProject('p1', { from, to });
      expect(mockRepo.find).toHaveBeenCalledWith({
        projectId: 'p1',
        createdAt: { $gte: from, $lte: to },
      });
    });
  });

  describe('checkBudget', () => {
    it('should allow when within budget', async () => {
      mockRepo.find.mockResolvedValue([
        { agentId: 'coder', metrics: { costUSD: 1.0, tokensUsed: 100 } },
      ]);

      const result = await tracker.checkBudget('p1', 0.5, 10);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.currentSpend).toBe(1.0);
      expect(result.budgetLimit).toBe(10);
    });

    it('should deny when over budget', async () => {
      mockRepo.find.mockResolvedValue([
        { agentId: 'coder', metrics: { costUSD: 9.5, tokensUsed: 100 } },
      ]);

      const result = await tracker.checkBudget('p1', 1.0, 10);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0.5);
    });

    it('should use default budget limit', async () => {
      mockRepo.find.mockResolvedValue([]);
      const result = await tracker.checkBudget('p1', 0.1);
      expect(result.budgetLimit).toBe(10);
      expect(result.allowed).toBe(true);
    });
  });
});
