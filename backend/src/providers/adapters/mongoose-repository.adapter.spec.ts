import { MongooseRepository } from './mongoose-repository.adapter';

describe('MongooseRepository', () => {
  let repo: MongooseRepository<any>;
  let mockModel: any;

  beforeEach(() => {
    mockModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      countDocuments: jest.fn(),
      insertMany: jest.fn(),
    };
    repo = new MongooseRepository(mockModel);
  });

  const chainable = (value: any) => ({
    lean: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  });

  describe('findById', () => {
    it('should find a document by id', async () => {
      const doc = { _id: '1', name: 'test' };
      mockModel.findById.mockReturnValue(chainable(doc));
      const result = await repo.findById('1');
      expect(result).toEqual(doc);
      expect(mockModel.findById).toHaveBeenCalledWith('1');
    });

    it('should return null when not found', async () => {
      mockModel.findById.mockReturnValue(chainable(null));
      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should find one document matching filter', async () => {
      const doc = { _id: '1', email: 'a@b.com' };
      mockModel.findOne.mockReturnValue(chainable(doc));
      const result = await repo.findOne({ email: 'a@b.com' });
      expect(result).toEqual(doc);
    });
  });

  describe('find', () => {
    it('should find documents with options', async () => {
      const docs = [{ _id: '1' }, { _id: '2' }];
      const chain = chainable(docs);
      mockModel.find.mockReturnValue(chain);
      const result = await repo.find(
        {},
        { sort: { createdAt: -1 }, limit: 10, skip: 0 },
      );
      expect(result).toEqual(docs);
    });
  });

  describe('create', () => {
    it('should create a new document', async () => {
      const data = { name: 'test' };
      const saved = {
        _id: '1',
        name: 'test',
        toObject: () => ({ _id: '1', name: 'test' }),
      };
      const mockInstance = { save: jest.fn().mockResolvedValue(saved) };
      // Mock the model as a constructor
      const ConstructorModel = jest
        .fn()
        .mockImplementation(() => mockInstance) as any;
      ConstructorModel.findById = mockModel.findById;
      const constructorRepo = new MongooseRepository(ConstructorModel);
      const result = await constructorRepo.create(data);
      expect(result).toEqual({ _id: '1', name: 'test' });
    });
  });

  describe('update', () => {
    it('should update a document by id', async () => {
      const updated = { _id: '1', name: 'updated' };
      mockModel.findByIdAndUpdate.mockReturnValue(chainable(updated));
      const result = await repo.update('1', { name: 'updated' });
      expect(result).toEqual(updated);
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '1',
        { name: 'updated' },
        { new: true },
      );
    });
  });

  describe('delete', () => {
    it('should delete a document and return true', async () => {
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: '1' }),
      });
      const result = await repo.delete('1');
      expect(result).toBe(true);
    });

    it('should return false when not found', async () => {
      mockModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      const result = await repo.delete('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('findOneAndUpdate', () => {
    it('should find and update a document', async () => {
      const updated = { _id: '1', count: 5 };
      mockModel.findOneAndUpdate.mockReturnValue(chainable(updated));
      const result = await repo.findOneAndUpdate(
        { _id: '1' },
        { $inc: { count: 1 } },
      );
      expect(result).toEqual(updated);
    });
  });

  describe('findOneAndDelete', () => {
    it('should find and delete a document', async () => {
      const deleted = { _id: '1', name: 'test' };
      mockModel.findOneAndDelete.mockReturnValue(chainable(deleted));
      const result = await repo.findOneAndDelete({ _id: '1' });
      expect(result).toEqual(deleted);
    });
  });

  describe('updateMany', () => {
    it('should update many documents', async () => {
      mockModel.updateMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 3 }),
      });
      const result = await repo.updateMany(
        { status: 'old' },
        { status: 'new' },
      );
      expect(result).toEqual({ modifiedCount: 3 });
    });
  });

  describe('deleteMany', () => {
    it('should delete many documents', async () => {
      mockModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      });
      const result = await repo.deleteMany({ status: 'old' });
      expect(result).toEqual({ deletedCount: 2 });
    });
  });

  describe('count', () => {
    it('should count documents', async () => {
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(42),
      });
      const result = await repo.count({ active: true });
      expect(result).toBe(42);
    });
  });

  describe('insertMany', () => {
    it('should insert multiple documents', async () => {
      const docs = [
        { _id: '1', name: 'a', toObject: () => ({ _id: '1', name: 'a' }) },
        { _id: '2', name: 'b', toObject: () => ({ _id: '2', name: 'b' }) },
      ];
      mockModel.insertMany.mockResolvedValue(docs);
      const result = await repo.insertMany([{ name: 'a' }, { name: 'b' }]);
      expect(result).toEqual([
        { _id: '1', name: 'a' },
        { _id: '2', name: 'b' },
      ]);
    });
  });
});
