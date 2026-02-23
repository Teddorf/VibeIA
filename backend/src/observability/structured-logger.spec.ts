import { Logger } from '@nestjs/common';
import { StructuredLogger } from './structured-logger';
import { TraceContext } from './trace';
import { VibeConfig } from '../config/vibe-config';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let traceContext: TraceContext;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  function createLogger(logFormat: 'json' | 'text'): StructuredLogger {
    const config = {
      observability: { logFormat, logLevel: 'info' },
    } as VibeConfig;
    return new StructuredLogger(traceContext, config);
  }

  beforeEach(() => {
    traceContext = new TraceContext();
    traceContext.setTraceId('test-trace-id');
    logger = createLogger('text');
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('text mode', () => {
    it('should log with trace id', () => {
      logger.log('hello');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[test-trace-id]'),
      );
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hello'));
    });

    it('should include source when provided', () => {
      logger.log('msg', { source: 'MyModule' });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MyModule]'),
      );
    });

    it('should include duration when provided', () => {
      logger.log('msg', { durationMs: 42 });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('(42ms)'));
    });

    it('should include tokens when provided', () => {
      logger.log('msg', { tokensUsed: 100 });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('tokens=100'),
      );
    });

    it('should include cost when provided', () => {
      logger.log('msg', { costUSD: 0.001234 });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('cost=$0.001234'),
      );
    });

    it('should call warn for warn level', () => {
      logger.warn('warning');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should call error for error level', () => {
      logger.error('failure');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should call debug for debug level', () => {
      logger.debug('detail');
      expect(debugSpy).toHaveBeenCalled();
    });
  });

  describe('json mode', () => {
    beforeEach(() => {
      logger = createLogger('json');
    });

    it('should output valid JSON with required fields', () => {
      logger.log('hello');
      expect(logSpy).toHaveBeenCalled();
      const raw = logSpy.mock.calls[0][0];
      const parsed = JSON.parse(raw);
      expect(parsed.level).toBe('info');
      expect(parsed.traceId).toBe('test-trace-id');
      expect(parsed.message).toBe('hello');
      expect(parsed.source.module).toBe('Orchestrator');
      expect(parsed.timestamp).toBeDefined();
    });

    it('should include duration in JSON', () => {
      logger.log('msg', { durationMs: 55 });
      const parsed = JSON.parse(logSpy.mock.calls[0][0]);
      expect(parsed.duration).toBe(55);
    });

    it('should include tokens in JSON', () => {
      const tokens = {
        inputTokens: 10,
        outputTokens: 20,
        cachedTokens: 0,
        totalTokens: 30,
      };
      logger.log('msg', { tokens });
      const parsed = JSON.parse(logSpy.mock.calls[0][0]);
      expect(parsed.tokens).toEqual(tokens);
    });

    it('should include cost in JSON', () => {
      logger.log('msg', { costUSD: 0.05 });
      const parsed = JSON.parse(logSpy.mock.calls[0][0]);
      expect(parsed.cost).toBe(0.05);
    });

    it('should include error in JSON', () => {
      const err = new Error('boom');
      logger.error('failed', { error: err });
      const parsed = JSON.parse(errorSpy.mock.calls[0][0]);
      expect(parsed.error.message).toBe('boom');
      expect(parsed.error.stack).toBeDefined();
    });

    it('should include source and method in JSON', () => {
      logger.log('msg', { source: 'Planner', method: 'createPlan' });
      const parsed = JSON.parse(logSpy.mock.calls[0][0]);
      expect(parsed.source.module).toBe('Planner');
      expect(parsed.source.method).toBe('createPlan');
    });

    it('should use custom traceId from context', () => {
      logger.log('msg', { traceId: 'custom-id' });
      const parsed = JSON.parse(logSpy.mock.calls[0][0]);
      expect(parsed.traceId).toBe('custom-id');
    });
  });
});
