import { Injectable } from '@nestjs/common';
import { ICacheProvider } from '../interfaces/cache-provider.interface';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

@Injectable()
export class InMemoryCacheAdapter implements ICacheProvider {
  private store = new Map<string, CacheEntry<unknown>>();

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async delete(key: string): Promise<void> {
    return this.del(key);
  }

  async flush(): Promise<void> {
    return this.clear();
  }

  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }
}
