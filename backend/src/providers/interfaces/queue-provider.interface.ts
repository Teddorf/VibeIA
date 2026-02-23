export interface IJob<T = unknown> {
  id: string;
  data: T;
  attempts: number;
  createdAt: Date;
}

export interface QueueOptions {
  concurrency?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface IQueue<T = unknown> {
  add(data: T): Promise<IJob<T>>;
  process(handler: (job: IJob<T>) => Promise<void>): void;
  getWaiting(): Promise<IJob<T>[]>;
  getActive(): Promise<IJob<T>[]>;
  enqueue(data: T): Promise<IJob<T>>;
  setConcurrency(n: number): void;
  getDepth(): Promise<number>;
  getActiveCount(): Promise<number>;
  pause(): void;
  resume(): void;
  drain(): Promise<void>;
}

export interface IQueueProvider {
  getQueue<T = unknown>(name: string): IQueue<T>;
  createQueue<T = unknown>(name: string, options?: QueueOptions): IQueue<T>;
}
