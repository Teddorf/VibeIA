export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findOne(filter: Partial<T>): Promise<T | null>;
  find(filter: Partial<T>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

export interface IDatabaseProvider {
  getRepository<T>(collectionName: string): IRepository<T>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
}
