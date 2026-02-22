export interface IJob<T = unknown> {
  id: string;
  data: T;
  attempts: number;
  createdAt: Date;
}

export interface IQueue<T = unknown> {
  add(data: T): Promise<IJob<T>>;
  process(handler: (job: IJob<T>) => Promise<void>): void;
  getWaiting(): Promise<IJob<T>[]>;
  getActive(): Promise<IJob<T>[]>;
}

export interface IQueueProvider {
  getQueue<T = unknown>(name: string): IQueue<T>;
}
