import { ExecutionPlanRepositoryAdapter } from './execution-plan-repository.adapter';

describe('ExecutionPlanRepositoryAdapter', () => {
  let adapter: ExecutionPlanRepositoryAdapter;
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
    adapter = new ExecutionPlanRepositoryAdapter(mockModel);
  });

  describe('findByProjectAndStatus', () => {
    it('should call find with projectId and status', async () => {
      const expected = [{ projectId: 'p1', status: 'executing' }];
      const query = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(expected),
      };
      mockModel.find.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({
            skip: jest
              .fn()
              .mockReturnValue({
                limit: jest
                  .fn()
                  .mockReturnValue({
                    select: jest.fn().mockReturnValue(query),
                  }),
              }),
          }),
      });
      // Simplify: mock find on the adapter directly via prototype
      jest.spyOn(adapter, 'find').mockResolvedValue(expected as any);

      const result = await adapter.findByProjectAndStatus('p1', 'executing');
      expect(result).toEqual(expected);
      expect(adapter.find).toHaveBeenCalledWith({
        projectId: 'p1',
        status: 'executing',
      });
    });
  });

  describe('updateNodeStatus', () => {
    it('should call findOneAndUpdate with correct filter and update', async () => {
      const expected = {
        _id: 'plan1',
        dag: [{ nodeId: 'n1', status: 'running' }],
      };
      jest
        .spyOn(adapter, 'findOneAndUpdate')
        .mockResolvedValue(expected as any);

      const result = await adapter.updateNodeStatus('plan1', 'n1', 'running');
      expect(result).toEqual(expected);
      expect(adapter.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'plan1', 'dag.nodeId': 'n1' },
        { $set: { 'dag.$.status': 'running' } },
      );
    });
  });

  describe('getReadyNodes', () => {
    it('should return nodes whose dependencies are all completed', async () => {
      const plan = {
        dag: [
          {
            nodeId: 'n1',
            agentId: 'a1',
            status: 'completed',
            dependencies: [],
          },
          {
            nodeId: 'n2',
            agentId: 'a2',
            status: 'pending',
            dependencies: ['n1'],
          },
          {
            nodeId: 'n3',
            agentId: 'a3',
            status: 'pending',
            dependencies: ['n1', 'n4'],
          },
          { nodeId: 'n4', agentId: 'a4', status: 'pending', dependencies: [] },
        ],
      };
      jest.spyOn(adapter, 'findById').mockResolvedValue(plan as any);

      const result = await adapter.getReadyNodes('plan1');
      expect(result).toEqual([
        { nodeId: 'n2', agentId: 'a2' },
        { nodeId: 'n4', agentId: 'a4' },
      ]);
    });

    it('should return empty array if plan not found', async () => {
      jest.spyOn(adapter, 'findById').mockResolvedValue(null);
      const result = await adapter.getReadyNodes('nonexistent');
      expect(result).toEqual([]);
    });

    it('should return empty array if no pending nodes', async () => {
      const plan = {
        dag: [
          {
            nodeId: 'n1',
            agentId: 'a1',
            status: 'completed',
            dependencies: [],
          },
          {
            nodeId: 'n2',
            agentId: 'a2',
            status: 'running',
            dependencies: ['n1'],
          },
        ],
      };
      jest.spyOn(adapter, 'findById').mockResolvedValue(plan as any);

      const result = await adapter.getReadyNodes('plan1');
      expect(result).toEqual([]);
    });
  });
});
