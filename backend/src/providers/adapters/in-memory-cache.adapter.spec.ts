import { InMemoryCacheAdapter } from './in-memory-cache.adapter';

describe('InMemoryCacheAdapter', () => {
  let cache: InMemoryCacheAdapter;

  beforeEach(() => {
    cache = new InMemoryCacheAdapter();
  });

  it('should set and get a value', async () => {
    await cache.set('key', 'value');
    expect(await cache.get('key')).toBe('value');
  });

  it('should return null for missing keys', async () => {
    expect(await cache.get('missing')).toBeNull();
  });

  it('should delete a key', async () => {
    await cache.set('key', 'value');
    await cache.del('key');
    expect(await cache.get('key')).toBeNull();
  });

  it('should check key existence', async () => {
    await cache.set('key', 'value');
    expect(await cache.has('key')).toBe(true);
    expect(await cache.has('missing')).toBe(false);
  });

  it('should clear all keys', async () => {
    await cache.set('a', 1);
    await cache.set('b', 2);
    await cache.clear();
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBeNull();
  });

  it('should expire entries by TTL', async () => {
    await cache.set('key', 'value', 1); // 1ms TTL
    // Wait for expiration
    await new Promise((r) => setTimeout(r, 10));
    expect(await cache.get('key')).toBeNull();
  });

  it('should delete a key via delete()', async () => {
    await cache.set('key', 'value');
    await cache.delete('key');
    expect(await cache.get('key')).toBeNull();
  });

  it('should flush all keys', async () => {
    await cache.set('a', 1);
    await cache.set('b', 2);
    await cache.flush();
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBeNull();
  });

  it('should delete keys matching a pattern', async () => {
    await cache.set('user:1', 'alice');
    await cache.set('user:2', 'bob');
    await cache.set('session:1', 'token');
    await cache.deletePattern('^user:');
    expect(await cache.get('user:1')).toBeNull();
    expect(await cache.get('user:2')).toBeNull();
    expect(await cache.get('session:1')).toBe('token');
  });
});
