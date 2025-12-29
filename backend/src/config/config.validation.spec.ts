import { validateConfig, ConfigValidationError } from './config.validation';

describe('Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset to clean state
    process.env = { ...originalEnv };
    // Set minimum required vars for valid config
    process.env.JWT_SECRET = 'a-very-long-secret-key-at-least-32-chars!!';
    process.env.JWT_REFRESH_SECRET = 'another-long-refresh-secret-32-chars!!';
    process.env.MONGO_URI = 'mongodb://localhost:27017/vibeia';
    process.env.ENCRYPTION_KEY = 'encryption-key-must-be-32-chars!!';
    process.env.ENCRYPTION_SALT = 'salt-at-least-16ch';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('JWT_SECRET validation', () => {
    it('should throw when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/JWT_SECRET.*required/i);
    });

    it('should throw when JWT_SECRET is shorter than 32 characters', () => {
      process.env.JWT_SECRET = 'too-short';

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/JWT_SECRET.*32 characters/i);
    });

    it('should accept JWT_SECRET with 32+ characters', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);

      expect(() => validateConfig()).not.toThrow();
    });
  });

  describe('JWT_REFRESH_SECRET validation', () => {
    it('should throw when JWT_REFRESH_SECRET is missing', () => {
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/JWT_REFRESH_SECRET.*required/i);
    });

    it('should throw when JWT_REFRESH_SECRET is shorter than 32 characters', () => {
      process.env.JWT_REFRESH_SECRET = 'short';

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/JWT_REFRESH_SECRET.*32 characters/i);
    });
  });

  describe('MONGO_URI validation', () => {
    it('should throw when MONGO_URI is missing', () => {
      delete process.env.MONGO_URI;

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/MONGO_URI.*required/i);
    });

    it('should throw when MONGO_URI does not start with mongodb', () => {
      process.env.MONGO_URI = 'postgres://localhost/db';

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/MONGO_URI.*mongodb/i);
    });

    it('should accept valid MongoDB connection strings', () => {
      process.env.MONGO_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/db';

      expect(() => validateConfig()).not.toThrow();
    });
  });

  describe('ENCRYPTION_KEY validation', () => {
    it('should throw when ENCRYPTION_KEY is missing', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/ENCRYPTION_KEY.*required/i);
    });

    it('should throw when ENCRYPTION_KEY is shorter than 32 characters', () => {
      process.env.ENCRYPTION_KEY = 'short-key';

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/ENCRYPTION_KEY.*32 characters/i);
    });
  });

  describe('ENCRYPTION_SALT validation', () => {
    it('should throw when ENCRYPTION_SALT is missing', () => {
      delete process.env.ENCRYPTION_SALT;

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/ENCRYPTION_SALT.*required/i);
    });

    it('should throw when ENCRYPTION_SALT is shorter than 16 characters', () => {
      process.env.ENCRYPTION_SALT = 'short';

      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(/ENCRYPTION_SALT.*16 characters/i);
    });
  });

  describe('Valid configuration', () => {
    it('should return config object when all required vars are valid', () => {
      const config = validateConfig();

      expect(config).toMatchObject({
        jwtSecret: expect.any(String),
        jwtRefreshSecret: expect.any(String),
        mongoUri: expect.any(String),
        encryptionKey: expect.any(String),
        encryptionSalt: expect.any(String),
      });
    });

    it('should use default values for optional vars', () => {
      delete process.env.NODE_ENV;
      delete process.env.PORT;

      const config = validateConfig();

      expect(config.nodeEnv).toBe('development');
      expect(config.port).toBe(3001);
    });

    it('should parse PORT as number', () => {
      process.env.PORT = '4000';

      const config = validateConfig();

      expect(config.port).toBe(4000);
    });
  });

  describe('Error messages', () => {
    it('should include all validation errors in message', () => {
      delete process.env.JWT_SECRET;
      delete process.env.MONGO_URI;

      try {
        validateConfig();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigValidationError);
        expect(error.message).toContain('JWT_SECRET');
        expect(error.message).toContain('MONGO_URI');
      }
    });
  });
});
