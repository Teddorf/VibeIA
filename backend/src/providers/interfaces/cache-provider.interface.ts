export interface ICacheProvider {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  delete(key: string): Promise<void>;
  flush(): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
}
