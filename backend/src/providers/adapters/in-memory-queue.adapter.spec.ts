import { InMemoryQueueAdapter } from './in-memory-queue.adapter';

describe('InMemoryQueueAdapter', () => {
  let adapter: InMemoryQueueAdapter;

  beforeEach(() => {
    adapter = new InMemoryQueueAdapter();
  });

  it('should create a queue', () => {
    const queue = adapter.getQueue('test');
    expect(queue).toBeDefined();
  });

  it('should return the same queue for the same name', () => {
    const q1 = adapter.getQueue('test');
    const q2 = adapter.getQueue('test');
    expect(q1).toBe(q2);
  });

  it('should add a job to the queue', async () => {
    const queue = adapter.getQueue<{ msg: string }>('test');
    const job = await queue.add({ msg: 'hello' });
    expect(job.id).toBeDefined();
    expect(job.data.msg).toBe('hello');
  });

  it('should process jobs when handler is registered', async () => {
    const queue = adapter.getQueue<string>('test');
    const processed: string[] = [];

    queue.process(async (job) => {
      processed.push(job.data);
    });

    await queue.add('first');
    await queue.add('second');

    expect(processed).toEqual(['first', 'second']);
  });

  it('should track waiting jobs when no handler', async () => {
    const queue = adapter.getQueue<string>('test');
    await queue.add('a');
    await queue.add('b');

    const waiting = await queue.getWaiting();
    expect(waiting).toHaveLength(2);
  });
});
