import { Injectable } from '@nestjs/common';
import {
  IQueueProvider,
  IQueue,
  IJob,
  QueueOptions,
} from '../interfaces/queue-provider.interface';
import { randomUUID } from 'crypto';

class InMemoryQueue<T> implements IQueue<T> {
  private waiting: IJob<T>[] = [];
  private active: IJob<T>[] = [];
  private handler: ((job: IJob<T>) => Promise<void>) | null = null;
  private concurrency = 1;
  private paused = false;

  async add(data: T): Promise<IJob<T>> {
    const job: IJob<T> = {
      id: randomUUID(),
      data,
      attempts: 0,
      createdAt: new Date(),
    };
    this.waiting.push(job);

    // Process synchronously if handler is registered and not paused
    if (this.handler && !this.paused) {
      await this.processNext();
    }

    return job;
  }

  async enqueue(data: T): Promise<IJob<T>> {
    return this.add(data);
  }

  process(handler: (job: IJob<T>) => Promise<void>): void {
    this.handler = handler;
  }

  async getWaiting(): Promise<IJob<T>[]> {
    return [...this.waiting];
  }

  async getActive(): Promise<IJob<T>[]> {
    return [...this.active];
  }

  setConcurrency(n: number): void {
    this.concurrency = n;
  }

  async getDepth(): Promise<number> {
    return this.waiting.length;
  }

  async getActiveCount(): Promise<number> {
    return this.active.length;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  async drain(): Promise<void> {
    while (this.waiting.length > 0 && !this.paused) {
      await this.processNext();
    }
  }

  private async processNext(): Promise<void> {
    if (!this.handler || this.waiting.length === 0 || this.paused) return;
    if (this.active.length >= this.concurrency) return;

    const job = this.waiting.shift()!;
    job.attempts++;
    this.active.push(job);

    try {
      await this.handler(job);
    } finally {
      this.active = this.active.filter((j) => j.id !== job.id);
    }
  }
}

@Injectable()
export class InMemoryQueueAdapter implements IQueueProvider {
  private queues = new Map<string, InMemoryQueue<any>>();

  getQueue<T = unknown>(name: string): IQueue<T> {
    if (!this.queues.has(name)) {
      this.queues.set(name, new InMemoryQueue<T>());
    }
    return this.queues.get(name)! as IQueue<T>;
  }

  createQueue<T = unknown>(name: string, _options?: QueueOptions): IQueue<T> {
    return this.getQueue<T>(name);
  }
}
