import { Model, Document } from 'mongoose';
import {
  IRepository,
  FindOptions,
} from '../interfaces/database-provider.interface';

export class MongooseRepository<T> implements IRepository<T> {
  constructor(private readonly model: Model<T & Document>) {}

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).lean().exec() as Promise<T | null>;
  }

  async findOne(filter: Record<string, any>): Promise<T | null> {
    return this.model.findOne(filter).lean().exec() as Promise<T | null>;
  }

  async find(filter: Record<string, any>, options?: FindOptions): Promise<T[]> {
    let query: any = this.model.find(filter);

    if (options?.sort) {
      query = query.sort(options.sort);
    }
    if (options?.skip !== undefined) {
      query = query.skip(options.skip);
    }
    if (options?.limit !== undefined) {
      query = query.limit(options.limit);
    }
    if (options?.select) {
      query = query.select(options.select);
    }
    if (options?.lean !== false) {
      query = query.lean();
    }

    return query.exec() as Promise<T[]>;
  }

  async create(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    const saved = await doc.save();
    return saved.toObject() as T;
  }

  async update(id: string, data: Record<string, any>): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as Promise<T | null>;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async findOneAndUpdate(
    filter: Record<string, any>,
    update: Record<string, any>,
    options?: { new?: boolean; upsert?: boolean },
  ): Promise<T | null> {
    return this.model
      .findOneAndUpdate(filter, update, {
        new: options?.new ?? true,
        upsert: options?.upsert ?? false,
      })
      .lean()
      .exec() as Promise<T | null>;
  }

  async findOneAndDelete(filter: Record<string, any>): Promise<T | null> {
    return this.model
      .findOneAndDelete(filter)
      .lean()
      .exec() as Promise<T | null>;
  }

  async updateMany(
    filter: Record<string, any>,
    update: Record<string, any>,
  ): Promise<{ modifiedCount: number }> {
    const result = await this.model.updateMany(filter, update).exec();
    return { modifiedCount: result.modifiedCount };
  }

  async deleteMany(
    filter: Record<string, any>,
  ): Promise<{ deletedCount: number }> {
    const result = await this.model.deleteMany(filter).exec();
    return { deletedCount: result.deletedCount };
  }

  async count(filter: Record<string, any> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async insertMany(data: Partial<T>[]): Promise<T[]> {
    const docs = await this.model.insertMany(data);
    return docs.map((doc) => (doc as any).toObject()) as T[];
  }
}
