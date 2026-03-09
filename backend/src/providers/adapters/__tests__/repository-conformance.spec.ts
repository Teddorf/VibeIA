import { MongooseRepository } from '../mongoose-repository.adapter';
import { IRepository } from '../../interfaces/database-provider.interface';

/**
 * Conformance tests verify that MongooseRepository implements
 * every method defined by IRepository<T>.
 */
describe('IRepository conformance — MongooseRepository', () => {
  let repo: IRepository<any>;

  const mockModel = {
    findById: jest
      .fn()
      .mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
    findOne: jest
      .fn()
      .mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
    findByIdAndUpdate: jest
      .fn()
      .mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
    findByIdAndDelete: jest
      .fn()
      .mockReturnValue({ exec: () => Promise.resolve(null) }),
    findOneAndUpdate: jest
      .fn()
      .mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
    findOneAndDelete: jest
      .fn()
      .mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
    updateMany: jest
      .fn()
      .mockReturnValue({ exec: () => Promise.resolve({ modifiedCount: 0 }) }),
    deleteMany: jest
      .fn()
      .mockReturnValue({ exec: () => Promise.resolve({ deletedCount: 0 }) }),
    countDocuments: jest
      .fn()
      .mockReturnValue({ exec: () => Promise.resolve(0) }),
    insertMany: jest.fn().mockResolvedValue([]),
  } as any;

  beforeEach(() => {
    repo = new MongooseRepository(mockModel);
  });

  const requiredMethods: (keyof IRepository<any>)[] = [
    'findById',
    'findOne',
    'find',
    'create',
    'update',
    'delete',
    'findOneAndUpdate',
    'findOneAndDelete',
    'updateMany',
    'deleteMany',
    'count',
    'insertMany',
  ];

  it.each(requiredMethods)('should implement %s as a function', (method) => {
    expect(typeof repo[method]).toBe('function');
  });

  it('should return a promise from findById', async () => {
    const result = repo.findById('abc');
    expect(result).toBeInstanceOf(Promise);
  });

  it('should return a promise from find', async () => {
    const result = repo.find({});
    expect(result).toBeInstanceOf(Promise);
  });

  it('should accept FindOptions in find', async () => {
    const result = repo.find(
      {},
      { sort: { createdAt: -1 }, skip: 0, limit: 10 },
    );
    expect(result).toBeInstanceOf(Promise);
  });

  it('should return a promise from count', async () => {
    const result = repo.count({});
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBe(0);
  });

  it('should return { modifiedCount } from updateMany', async () => {
    const result = await repo.updateMany({}, { $set: { active: false } });
    expect(result).toHaveProperty('modifiedCount');
    expect(typeof result.modifiedCount).toBe('number');
  });

  it('should return { deletedCount } from deleteMany', async () => {
    const result = await repo.deleteMany({});
    expect(result).toHaveProperty('deletedCount');
    expect(typeof result.deletedCount).toBe('number');
  });
});
