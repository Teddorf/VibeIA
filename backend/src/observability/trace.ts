import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

export function generateTraceId(): string {
  return randomUUID();
}

const traceStorage = new AsyncLocalStorage<{ traceId: string }>();

@Injectable()
export class TraceContext {
  private fallbackTraceId: string = generateTraceId();

  getTraceId(): string {
    const store = traceStorage.getStore();
    return store?.traceId ?? this.fallbackTraceId;
  }

  setTraceId(traceId: string): void {
    this.fallbackTraceId = traceId;
  }

  newTrace(): string {
    this.fallbackTraceId = generateTraceId();
    return this.fallbackTraceId;
  }

  async runWithTraceId<T>(traceId: string, fn: () => Promise<T>): Promise<T> {
    return traceStorage.run({ traceId }, fn);
  }
}
