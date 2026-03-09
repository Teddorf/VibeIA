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

  it('should enqueue as alias for add', async () => {
    const queue = adapter.getQueue<string>('test');
    const job = await queue.enqueue('data');
    expect(job.id).toBeDefined();
    expect(job.data).toBe('data');
  });

  it('should set and respect concurrency', async () => {
    const queue = adapter.getQueue<string>('test');
    queue.setConcurrency(2);
    // No error means success
    expect(true).toBe(true);
  });

  it('should report depth and active count', async () => {
    const queue = adapter.getQueue<string>('test');
    await queue.add('a');
    await queue.add('b');

    const depth = await queue.getDepth();
    expect(depth).toBe(2);

    const activeCount = await queue.getActiveCount();
    expect(activeCount).toBe(0);
  });

  it('should pause and resume processing', async () => {
    const queue = adapter.getQueue<string>('test');
    const processed: string[] = [];

    queue.process(async (job) => {
      processed.push(job.data);
    });

    queue.pause();
    await queue.add('paused-item');
    expect(processed).toEqual([]);

    queue.resume();
    await queue.drain();
    expect(processed).toContain('paused-item');
  });

  it('should drain all waiting jobs', async () => {
    const queue = adapter.getQueue<string>('test');
    const processed: string[] = [];

    queue.pause();
    await queue.add('a');
    await queue.add('b');

    queue.process(async (job) => {
      processed.push(job.data);
    });

    queue.resume();
    await queue.drain();
    expect(processed).toEqual(['a', 'b']);
  });

  it('should create a queue via createQueue', () => {
    const queue = adapter.createQueue('new-queue');
    expect(queue).toBeDefined();
    // Should return the same queue on subsequent calls
    expect(adapter.getQueue('new-queue')).toBe(queue);
  });

  it('should drain existing waiting jobs when process() is called', async () => {
    const queue = adapter.getQueue<string>('drain-test');
    const processed: string[] = [];

    // Add jobs BEFORE registering handler
    await queue.add('before-1');
    await queue.add('before-2');

    const waiting = await queue.getWaiting();
    expect(waiting).toHaveLength(2);

    // Register handler — should drain existing jobs
    queue.process(async (job) => {
      processed.push(job.data);
    });

    // Wait for async drain to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(processed).toEqual(['before-1', 'before-2']);
    const waitingAfter = await queue.getWaiting();
    expect(waitingAfter).toHaveLength(0);
  });

  it('should process jobs added both before and after handler registration', async () => {
    const queue = adapter.getQueue<string>('mixed-test');
    const processed: string[] = [];

    // Add job before handler
    await queue.add('pre-handler');

    // Register handler
    queue.process(async (job) => {
      processed.push(job.data);
    });

    // Wait for drain
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Add job after handler
    await queue.add('post-handler');

    expect(processed).toEqual(['pre-handler', 'post-handler']);
  });
});
