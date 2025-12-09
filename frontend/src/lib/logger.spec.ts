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

    it('should log message and error in development', () => {
        process.env.NODE_ENV = 'development';
        const error = { message: 'test error' };
        logger.error('Error occurred', error);

        expect(consoleSpy).toHaveBeenCalledWith('Error occurred', error);
    });

    it('should log only message in production', () => {
        process.env.NODE_ENV = 'production';
        const error = { message: 'sensitive data' };
        logger.error('Error occurred', error);

        expect(consoleSpy).toHaveBeenCalledWith('Error occurred');
        expect(consoleSpy).not.toHaveBeenCalledWith('Error occurred', error);
    });
});
