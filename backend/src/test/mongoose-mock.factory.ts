/**
 * Mongoose Mock Factory
 *
 * Provides utilities for creating mock Mongoose models in unit tests.
 * This allows testing services that use @InjectModel decorators without
 * requiring a real MongoDB connection.
 */

import { Types } from 'mongoose';

export interface MockDocument {
  _id: Types.ObjectId;
  toObject: () => Record<string, any>;
  save: jest.Mock;
  [key: string]: any;
}

export interface MockModelInstance {
  create: jest.Mock;
  findById: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
  findOneAndUpdate: jest.Mock;
  updateMany: jest.Mock;
  deleteMany: jest.Mock;
  countDocuments: jest.Mock;
  aggregate: jest.Mock;
  new: (doc: any) => MockDocument;
}

/**
 * Creates a mock document with standard Mongoose document methods
 */
export function createMockDocument(data: Record<string, any> = {}): MockDocument {
  const _id = data._id || new Types.ObjectId();
  const doc: MockDocument = {
    _id,
    ...data,
    toObject: jest.fn().mockReturnValue({ _id, ...data }),
    save: jest.fn().mockResolvedValue({ _id, ...data }),
  };
  return doc;
}

/**
 * Creates a mock Mongoose Model that can be used with NestJS's @InjectModel
 *
 * @example
 * ```typescript
 * const mockModel = createMockModel();
 *
 * const module = await Test.createTestingModule({
 *   providers: [
 *     MyService,
 *     {
 *       provide: getModelToken(MySchema.name),
 *       useValue: mockModel,
 *     },
 *   ],
 * }).compile();
 * ```
 */
export function createMockModel(): MockModelInstance {
  const documents: Map<string, MockDocument> = new Map();

  // Constructor function for new Model(doc)
  function MockModel(this: any, doc: any) {
    const _id = new Types.ObjectId();
    Object.assign(this, { _id, ...doc });
    this.toObject = jest.fn().mockReturnValue({ _id, ...doc });
    this.save = jest.fn().mockImplementation(async () => {
      documents.set(_id.toString(), this);
      return this;
    });
  }

  MockModel.create = jest.fn().mockImplementation(async (doc: any) => {
    const instance = new (MockModel as any)(doc);
    await instance.save();
    return instance;
  });

  MockModel.findById = jest.fn().mockImplementation((id: string) => {
    return {
      exec: jest.fn().mockResolvedValue(documents.get(id) || null),
    };
  });

  MockModel.findOne = jest.fn().mockImplementation((query: any) => {
    return {
      exec: jest.fn().mockResolvedValue(null),
    };
  });

  MockModel.find = jest.fn().mockImplementation((query?: any) => {
    const result = Array.from(documents.values());
    return {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(result),
    };
  });

  MockModel.findByIdAndUpdate = jest.fn().mockImplementation((id: string, update: any, options?: any) => {
    const doc = documents.get(id);
    if (doc && update) {
      Object.assign(doc, update);
      if (options?.new) {
        return { exec: jest.fn().mockResolvedValue(doc) };
      }
    }
    return { exec: jest.fn().mockResolvedValue(doc || null) };
  });

  MockModel.findByIdAndDelete = jest.fn().mockImplementation((id: string) => {
    const doc = documents.get(id);
    documents.delete(id);
    return { exec: jest.fn().mockResolvedValue(doc || null) };
  });

  MockModel.findOneAndUpdate = jest.fn().mockImplementation((query: any, update: any, options?: any) => {
    return { exec: jest.fn().mockResolvedValue(null) };
  });

  MockModel.updateMany = jest.fn().mockImplementation((query: any, update: any) => {
    return { exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }) };
  });

  MockModel.deleteMany = jest.fn().mockImplementation((query: any) => {
    return { exec: jest.fn().mockResolvedValue({ deletedCount: 0 }) };
  });

  MockModel.countDocuments = jest.fn().mockImplementation((query?: any) => {
    return { exec: jest.fn().mockResolvedValue(documents.size) };
  });

  MockModel.aggregate = jest.fn().mockImplementation((pipeline: any[]) => {
    return { exec: jest.fn().mockResolvedValue([]) };
  });

  return MockModel as unknown as MockModelInstance;
}

/**
 * Creates a mock model with pre-populated data for testing
 */
export function createMockModelWithData<T extends Record<string, any>>(
  initialData: T[],
): MockModelInstance {
  const mockModel = createMockModel();
  const documents: Map<string, MockDocument> = new Map();

  // Populate with initial data
  initialData.forEach((data) => {
    const _id = data._id || new Types.ObjectId();
    const doc = createMockDocument({ ...data, _id });
    documents.set(_id.toString(), doc);
  });

  // Override methods to use populated data
  mockModel.findById = jest.fn().mockImplementation((id: string | Types.ObjectId) => {
    const idStr = id.toString();
    return {
      exec: jest.fn().mockResolvedValue(documents.get(idStr) || null),
    };
  });

  mockModel.find = jest.fn().mockImplementation((query?: any) => {
    let results = Array.from(documents.values());

    // Simple query filtering
    if (query) {
      results = results.filter((doc) => {
        return Object.entries(query).every(([key, value]) => {
          if (key === '$or') return true; // Skip complex queries
          return doc[key] === value;
        });
      });
    }

    return {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(results),
    };
  });

  mockModel.findOne = jest.fn().mockImplementation((query: any) => {
    const results = Array.from(documents.values());
    const found = results.find((doc) => {
      return Object.entries(query).every(([key, value]) => {
        if (key === '$or') return true;
        return doc[key] === value;
      });
    });
    return {
      exec: jest.fn().mockResolvedValue(found || null),
    };
  });

  mockModel.countDocuments = jest.fn().mockImplementation((query?: any) => {
    let count = documents.size;
    if (query) {
      count = Array.from(documents.values()).filter((doc) => {
        return Object.entries(query).every(([key, value]) => doc[key] === value);
      }).length;
    }
    return { exec: jest.fn().mockResolvedValue(count) };
  });

  return mockModel;
}

/**
 * Helper to reset all mocks in a model
 */
export function resetMockModel(model: MockModelInstance): void {
  model.create.mockClear();
  model.findById.mockClear();
  model.findOne.mockClear();
  model.find.mockClear();
  model.findByIdAndUpdate.mockClear();
  model.findByIdAndDelete.mockClear();
  model.findOneAndUpdate.mockClear();
  model.updateMany.mockClear();
  model.deleteMany.mockClear();
  model.countDocuments.mockClear();
  model.aggregate.mockClear();
}