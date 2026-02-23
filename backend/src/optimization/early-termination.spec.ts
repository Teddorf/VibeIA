import { EarlyTermination } from './early-termination';

describe('EarlyTermination', () => {
  let et: EarlyTermination;

  beforeEach(() => {
    et = new EarlyTermination();
  });

  it('should pass through clean output', () => {
    const result = et.executeWithEarlyTermination('const x = 1;');
    expect(result.terminated).toBe(false);
    expect(result.output).toBe('const x = 1;');
  });

  it('should abort on token limit error', () => {
    const result = et.executeWithEarlyTermination(
      'Error: maximum context length exceeded',
    );
    expect(result.terminated).toBe(true);
    expect(result.reason).toContain('Token limit');
  });

  it('should abort on LLM refusal', () => {
    const result = et.executeWithEarlyTermination(
      'I cannot generate code for this request',
    );
    expect(result.terminated).toBe(true);
    expect(result.reason).toContain('refused');
  });

  it('should abort on infinite loop detection', () => {
    const result = et.executeWithEarlyTermination(
      'This would create an infinite loop in the code',
    );
    expect(result.terminated).toBe(true);
    expect(result.reason).toContain('loop');
  });

  it('should not abort on warnings', () => {
    const result = et.executeWithEarlyTermination(
      "I don't understand what you want exactly",
    );
    expect(result.terminated).toBe(false);
  });

  it('should support custom stop conditions', () => {
    const result = et.executeWithEarlyTermination('CUSTOM_STOP_TOKEN', [
      {
        pattern: /CUSTOM_STOP_TOKEN/,
        action: 'abort',
        reason: 'Custom stop',
      },
    ]);
    expect(result.terminated).toBe(true);
    expect(result.reason).toBe('Custom stop');
  });

  it('should return default stop conditions', () => {
    const conditions = et.getDefaultStopConditions();
    expect(conditions.length).toBeGreaterThan(0);
  });
});
