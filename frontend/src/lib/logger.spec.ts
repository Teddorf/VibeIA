import { logger } from './logger';

describe('Logger Utility', () => {
    let originalEnv: NodeJS.ProcessEnv;
    let consoleSpy: jest.SpyInstance;

    beforeAll(() => {
        originalEnv = process.env;
        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterAll(() => {
        process.env = originalEnv;
        consoleSpy.mockRestore();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should log message and error context in development', () => {
        process.env.NODE_ENV = 'development';
        const error = new Error('test error');
        logger.error('Error occurred', error);

        // In development, logger formats as: [LEVEL], message, context
        expect(consoleSpy).toHaveBeenCalledWith(
            '[ERROR]',
            'Error occurred',
            expect.objectContaining({
                errorMessage: 'test error',
                errorName: 'Error',
            })
        );
    });

    it('should log formatted message in production', () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('sensitive data');
        logger.error('Error occurred', error);

        // In production, logger formats as: [ERROR] message, errorMessage
        expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Error occurred', 'sensitive data');
    });

    it('should handle non-Error objects', () => {
        process.env.NODE_ENV = 'development';
        const errorObj = { code: 'ERR_001', details: 'Some issue' };
        logger.error('Something failed', errorObj);

        expect(consoleSpy).toHaveBeenCalledWith(
            '[ERROR]',
            'Something failed',
            expect.objectContaining({
                errorDetails: expect.any(String),
            })
        );
    });
});
