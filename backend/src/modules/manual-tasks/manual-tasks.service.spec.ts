import { Test, TestingModule } from '@nestjs/testing';
import { ManualTasksService } from './manual-tasks.service';

describe('ManualTasksService', () => {
  let service: ManualTasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ManualTasksService],
    }).compile();

    service = module.get<ManualTasksService>(ManualTasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectManualTasks', () => {
    it('should detect Stripe setup task', () => {
      const task = {
        name: 'Configure Stripe payment',
        description: 'Set up Stripe for payment processing',
      };

      const result = service.detectManualTasks(task);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('stripe_setup');
      expect(result?.title).toContain('Stripe');
    });

    it('should detect Firebase setup task', () => {
      const task = {
        name: 'Setup Firebase',
        description: 'Configure Firebase for authentication',
      };

      const result = service.detectManualTasks(task);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('firebase_setup');
    });

    it('should detect AWS credentials task', () => {
      const task = {
        name: 'Configure AWS',
        description: 'Set up AWS credentials for S3 bucket access',
      };

      const result = service.detectManualTasks(task);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('aws_credentials');
    });

    it('should detect GitHub OAuth task', () => {
      const task = {
        name: 'Add social login',
        description: 'Implement GitHub OAuth for user authentication',
      };

      const result = service.detectManualTasks(task);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('github_oauth');
    });

    it('should detect Google OAuth task', () => {
      const task = {
        name: 'Add Google login',
        description: 'Implement Google OAuth sign-in',
      };

      const result = service.detectManualTasks(task);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('google_oauth');
    });

    it('should detect environment variables task', () => {
      const task = {
        name: 'Configure environment',
        description: 'Set up .env environment variables',
      };

      const result = service.detectManualTasks(task);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('env_variables');
    });

    it('should detect database migration task', () => {
      const task = {
        name: 'Run migrations',
        description: 'Execute database migration scripts',
      };

      const result = service.detectManualTasks(task);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('database_migration');
    });

    it('should detect SSL certificate task', () => {
      const task = {
        name: 'Setup HTTPS',
        description: 'Configure SSL certificate for production',
      };

      const result = service.detectManualTasks(task);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('ssl_certificate');
    });

    it('should detect DNS configuration task', () => {
      const task = {
        name: 'Configure domain',
        description: 'Set up DNS nameserver records',
      };

      const result = service.detectManualTasks(task);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('domain_dns');
    });

    it('should detect custom manual task from type', () => {
      const task = {
        name: 'Custom setup',
        description: 'This is a manual step',
        type: 'manual',
      };

      const result = service.detectManualTasks(task);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('custom');
    });

    it('should return null for automated tasks', () => {
      const task = {
        name: 'Create user model',
        description: 'Generate MongoDB schema for users',
      };

      const result = service.detectManualTasks(task);

      expect(result).toBeNull();
    });

    it('should be case insensitive', () => {
      const task = {
        name: 'STRIPE INTEGRATION',
        description: 'PAYMENT GATEWAY SETUP',
      };

      const result = service.detectManualTasks(task);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('stripe_setup');
    });
  });

  describe('getTaskTemplate', () => {
    it('should return Stripe template with all required fields', () => {
      const template = service.getTaskTemplate('stripe_setup');

      expect(template.type).toBe('stripe_setup');
      expect(template.title).toBeDefined();
      expect(template.instructions.length).toBeGreaterThan(0);
      expect(template.requiredInputs.length).toBe(2);
      expect(template.requiredInputs.map(i => i.name)).toContain('STRIPE_PUBLISHABLE_KEY');
      expect(template.requiredInputs.map(i => i.name)).toContain('STRIPE_SECRET_KEY');
    });

    it('should return Firebase template with required fields', () => {
      const template = service.getTaskTemplate('firebase_setup');

      expect(template.type).toBe('firebase_setup');
      expect(template.requiredInputs.map(i => i.name)).toContain('FIREBASE_PROJECT_ID');
      expect(template.requiredInputs.map(i => i.name)).toContain('FIREBASE_API_KEY');
    });

    it('should return AWS template with region', () => {
      const template = service.getTaskTemplate('aws_credentials');

      expect(template.type).toBe('aws_credentials');
      expect(template.requiredInputs.map(i => i.name)).toContain('AWS_ACCESS_KEY_ID');
      expect(template.requiredInputs.map(i => i.name)).toContain('AWS_SECRET_ACCESS_KEY');
      expect(template.requiredInputs.map(i => i.name)).toContain('AWS_REGION');
    });

    it('should return template with unique ID', async () => {
      const template1 = service.getTaskTemplate('stripe_setup');
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 5));
      const template2 = service.getTaskTemplate('stripe_setup');

      expect(template1.id).not.toBe(template2.id);
    });

    it('should include estimated time', () => {
      const template = service.getTaskTemplate('stripe_setup');

      expect(template.estimatedMinutes).toBeGreaterThan(0);
    });

    it('should include category', () => {
      const template = service.getTaskTemplate('stripe_setup');

      expect(template.category).toBe('api_setup');
    });
  });

  describe('validateInputs', () => {
    it('should validate correct Stripe keys', async () => {
      const task = service.getTaskTemplate('stripe_setup');
      const inputs = {
        STRIPE_PUBLISHABLE_KEY: 'pk_test_1234567890abcdefghijklmnop',
        STRIPE_SECRET_KEY: 'sk_test_1234567890abcdefghijklmnop',
      };

      const result = await service.validateInputs(task, inputs);

      expect(result.valid).toBe(true);
      expect(result.results.every(r => r.passed)).toBe(true);
    });

    it('should reject invalid Stripe publishable key', async () => {
      const task = service.getTaskTemplate('stripe_setup');
      const inputs = {
        STRIPE_PUBLISHABLE_KEY: 'invalid_key',
        STRIPE_SECRET_KEY: 'sk_test_1234567890abcdefghijklmnop',
      };

      const result = await service.validateInputs(task, inputs);

      expect(result.valid).toBe(false);
      expect(result.results.some(r => !r.passed && r.rule === 'STRIPE_PUBLISHABLE_KEY')).toBe(true);
    });

    it('should reject invalid Stripe secret key', async () => {
      const task = service.getTaskTemplate('stripe_setup');
      const inputs = {
        STRIPE_PUBLISHABLE_KEY: 'pk_test_1234567890abcdefghijklmnop',
        STRIPE_SECRET_KEY: 'invalid_secret',
      };

      const result = await service.validateInputs(task, inputs);

      expect(result.valid).toBe(false);
    });

    it('should validate required inputs', async () => {
      const task = service.getTaskTemplate('stripe_setup');
      const inputs = {
        STRIPE_PUBLISHABLE_KEY: 'pk_test_1234567890abcdefghijklmnop',
        // Missing STRIPE_SECRET_KEY
      };

      const result = await service.validateInputs(task, inputs);

      expect(result.valid).toBe(false);
      expect(result.results.some(r => !r.passed && r.message.includes('required'))).toBe(true);
    });

    it('should validate AWS key format', async () => {
      const task = service.getTaskTemplate('aws_credentials');
      const inputs = {
        AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
        AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        AWS_REGION: 'us-east-1',
      };

      const result = await service.validateInputs(task, inputs);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid AWS access key', async () => {
      const task = service.getTaskTemplate('aws_credentials');
      const inputs = {
        AWS_ACCESS_KEY_ID: 'INVALID_KEY',
        AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        AWS_REGION: 'us-east-1',
      };

      const result = await service.validateInputs(task, inputs);

      expect(result.valid).toBe(false);
    });

    it('should validate minimum length requirements', async () => {
      const task = service.getTaskTemplate('github_oauth');
      const inputs = {
        GITHUB_CLIENT_ID: '12345678901234567890',
        GITHUB_CLIENT_SECRET: 'short', // Too short
      };

      const result = await service.validateInputs(task, inputs);

      expect(result.valid).toBe(false);
      expect(result.results.some(r => r.message.includes('at least'))).toBe(true);
    });

    it('should handle tasks with no validation rules', async () => {
      const task = service.getTaskTemplate('manual_testing');
      const inputs = {};

      const result = await service.validateInputs(task, inputs);

      expect(result.valid).toBe(true);
    });
  });

  describe('generateEnvFileContent', () => {
    it('should generate env file content from Stripe inputs', () => {
      const inputs = {
        STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
        STRIPE_SECRET_KEY: 'sk_test_456',
      };

      const content = service.generateEnvFileContent(inputs);

      expect(content).toContain('STRIPE_PUBLISHABLE_KEY=pk_test_123');
      expect(content).toContain('STRIPE_SECRET_KEY=sk_test_456');
    });

    it('should generate env file content from AWS inputs', () => {
      const inputs = {
        AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
        AWS_SECRET_ACCESS_KEY: 'secretkey',
        AWS_REGION: 'us-east-1',
      };

      const content = service.generateEnvFileContent(inputs);

      expect(content).toContain('AWS_ACCESS_KEY_ID=AKIAEXAMPLE');
      expect(content).toContain('AWS_SECRET_ACCESS_KEY=secretkey');
      expect(content).toContain('AWS_REGION=us-east-1');
    });

    it('should include API_KEY variables', () => {
      const inputs = {
        CUSTOM_API_KEY: 'my-api-key',
        OTHER_VALUE: 'ignored',
      };

      const content = service.generateEnvFileContent(inputs);

      expect(content).toContain('CUSTOM_API_KEY=my-api-key');
      expect(content).not.toContain('OTHER_VALUE');
    });

    it('should include SECRET variables', () => {
      const inputs = {
        MY_SECRET: 'secret-value',
        REGULAR_VALUE: 'ignored',
      };

      const content = service.generateEnvFileContent(inputs);

      expect(content).toContain('MY_SECRET=secret-value');
      expect(content).not.toContain('REGULAR_VALUE');
    });

    it('should handle mixed inputs', () => {
      const inputs = {
        STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
        FIREBASE_API_KEY: 'firebase-key',
        GITHUB_CLIENT_SECRET: 'github-secret',
        RANDOM_VALUE: 'ignored',
      };

      const content = service.generateEnvFileContent(inputs);

      expect(content).toContain('STRIPE_PUBLISHABLE_KEY');
      expect(content).toContain('FIREBASE_API_KEY');
      expect(content).toContain('GITHUB_CLIENT_SECRET');
      expect(content).not.toContain('RANDOM_VALUE');
    });

    it('should return empty string for no matching inputs', () => {
      const inputs = {
        RANDOM_KEY: 'value',
        ANOTHER_KEY: 'value2',
      };

      const content = service.generateEnvFileContent(inputs);

      expect(content).toBe('');
    });
  });

  describe('task templates integrity', () => {
    const taskTypes = [
      'stripe_setup',
      'firebase_setup',
      'aws_credentials',
      'github_oauth',
      'google_oauth',
      'env_variables',
      'database_migration',
      'ssl_certificate',
      'domain_dns',
      'api_key_generation',
      'manual_testing',
      'custom',
    ] as const;

    taskTypes.forEach(type => {
      it(`should have complete template for ${type}`, () => {
        const template = service.getTaskTemplate(type);

        expect(template.id).toBeDefined();
        expect(template.type).toBe(type);
        expect(template.title).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.instructions).toBeInstanceOf(Array);
        expect(template.requiredInputs).toBeInstanceOf(Array);
        expect(template.validationRules).toBeInstanceOf(Array);
        expect(template.estimatedMinutes).toBeGreaterThan(0);
        expect(template.category).toBeDefined();
      });
    });
  });
});
