import { TraceContext, generateTraceId } from './trace';

describe('TraceContext', () => {
  let ctx: TraceContext;
  beforeEach(() => {
    ctx = new TraceContext();
  });

  it('should generate a trace id', () => {
    expect(ctx.getTraceId()).toBeDefined();
    expect(ctx.getTraceId().length).toBeGreaterThan(0);
  });

  it('should set and get trace id', () => {
    ctx.setTraceId('test-trace');
    expect(ctx.getTraceId()).toBe('test-trace');
  });

  it('should create new trace', () => {
    const old = ctx.getTraceId();
    const created = ctx.newTrace();
    expect(created).not.toBe(old);
    expect(ctx.getTraceId()).toBe(created);
  });

  it('should isolate traceId in runWithTraceId', async () => {
    ctx.setTraceId('outer');
    let innerTrace = '';
    await ctx.runWithTraceId('inner-trace', async () => {
      innerTrace = ctx.getTraceId();
    });
    expect(innerTrace).toBe('inner-trace');
    expect(ctx.getTraceId()).toBe('outer');
  });

  it('generateTraceId returns UUID format', () => {
    const id = generateTraceId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
