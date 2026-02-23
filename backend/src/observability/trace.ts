import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export function generateTraceId(): string {
  return randomUUID();
}

@Injectable()
export class TraceContext {
  private traceId: string = generateTraceId();

  getTraceId(): string {
    return this.traceId;
  }

  setTraceId(traceId: string): void {
    this.traceId = traceId;
  }

  newTrace(): string {
    this.traceId = generateTraceId();
    return this.traceId;
  }
}
