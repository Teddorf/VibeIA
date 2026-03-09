export interface FindOptions {
  sort?: Record<string, 1 | -1>;
  skip?: number;
  limit?: number;
  select?: string | Record<string, 0 | 1>;
  lean?: boolean;
}

export type QueryFilter<T> = Record<string, any>;
export type QueryOptions = FindOptions;

export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findOne(filter: Record<string, any>): Promise<T | null>;
  find(filter: Record<string, any>, options?: FindOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Record<string, any>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  findOneAndUpdate(
    filter: Record<string, any>,
    update: Record<string, any>,
    options?: { new?: boolean; upsert?: boolean },
  ): Promise<T | null>;
  findOneAndDelete(filter: Record<string, any>): Promise<T | null>;
  updateMany(
    filter: Record<string, any>,
    update: Record<string, any>,
  ): Promise<{ modifiedCount: number }>;
  deleteMany(filter: Record<string, any>): Promise<{ deletedCount: number }>;
  count(filter?: Record<string, any>): Promise<number>;
  insertMany(data: Partial<T>[]): Promise<T[]>;
  findMany(filter: Record<string, any>, options?: FindOptions): Promise<T[]>;
  createMany(data: Partial<T>[]): Promise<T[]>;
  exists(filter: Record<string, any>): Promise<boolean>;
}

export interface IDatabaseProvider {
  getRepository<T>(collectionName: string): IRepository<T>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
}
