import { Injectable } from '@nestjs/common';

export interface ManualTask {
  id: string;
  type: ManualTaskType;
  title: string;
  description: string;
  instructions: string[];
  validationRules: ValidationRule[];
  requiredInputs: RequiredInput[];
  estimatedMinutes: number;
  category: 'api_setup' | 'environment' | 'external_service' | 'manual_config' | 'verification';
}

export type ManualTaskType =
  | 'stripe_setup'
  | 'firebase_setup'
  | 'aws_credentials'
  | 'github_oauth'
  | 'google_oauth'
  | 'env_variables'
  | 'database_migration'
  | 'ssl_certificate'
  | 'domain_dns'
  | 'api_key_generation'
  | 'manual_testing'
  | 'custom';

export interface ValidationRule {
  type: 'env_var_exists' | 'url_reachable' | 'format_match' | 'custom';
  target: string;
  pattern?: string;
  errorMessage: string;
}

export interface RequiredInput {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'file';
  placeholder?: string;
  helpText?: string;
  validation?: {
    required?: boolean;
    pattern?: string;
    minLength?: number;
  };
}

export interface ManualTaskStatus {
  taskId: string;
  status: 'pending' | 'in_progress' | 'awaiting_validation' | 'completed' | 'skipped';
  inputs: Record<string, string>;
  validationResults?: ValidationResult[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface ValidationResult {
  rule: string;
  passed: boolean;
  message: string;
}

@Injectable()
export class ManualTasksService {
  private readonly taskTemplates: Record<ManualTaskType, Omit<ManualTask, 'id'>> = {
    stripe_setup: {
      type: 'stripe_setup',
      title: 'Configure Stripe Payment Integration',
      description: 'Set up Stripe API keys for payment processing',
      category: 'api_setup',
      estimatedMinutes: 10,
      instructions: [
        '1. Go to https://dashboard.stripe.com/register (or login if you have an account)',
        '2. Navigate to Developers > API Keys',
        '3. Copy your Publishable key and Secret key',
        '4. For testing, use the test mode keys (toggle "Test mode" on)',
        '5. Enter the keys below',
      ],
      validationRules: [
        {
          type: 'format_match',
          target: 'STRIPE_PUBLISHABLE_KEY',
          pattern: '^pk_(test_|live_)[a-zA-Z0-9]{24,}$',
          errorMessage: 'Invalid Stripe publishable key format',
        },
        {
          type: 'format_match',
          target: 'STRIPE_SECRET_KEY',
          pattern: '^sk_(test_|live_)[a-zA-Z0-9]{24,}$',
          errorMessage: 'Invalid Stripe secret key format',
        },
      ],
      requiredInputs: [
        {
          name: 'STRIPE_PUBLISHABLE_KEY',
          label: 'Stripe Publishable Key',
          type: 'text',
          placeholder: 'pk_test_...',
          helpText: 'Starts with pk_test_ (test) or pk_live_ (production)',
          validation: { required: true, pattern: '^pk_(test_|live_)' },
        },
        {
          name: 'STRIPE_SECRET_KEY',
          label: 'Stripe Secret Key',
          type: 'password',
          placeholder: 'sk_test_...',
          helpText: 'Keep this secret! Starts with sk_test_ or sk_live_',
          validation: { required: true, pattern: '^sk_(test_|live_)' },
        },
      ],
    },

    firebase_setup: {
      type: 'firebase_setup',
      title: 'Configure Firebase Project',
      description: 'Set up Firebase for authentication and/or database',
      category: 'api_setup',
      estimatedMinutes: 15,
      instructions: [
        '1. Go to https://console.firebase.google.com/',
        '2. Create a new project or select existing one',
        '3. Go to Project Settings > General',
        '4. Scroll down to "Your apps" and add a Web app',
        '5. Copy the configuration object',
        '6. For Admin SDK: Go to Project Settings > Service Accounts > Generate new private key',
      ],
      validationRules: [
        {
          type: 'format_match',
          target: 'FIREBASE_PROJECT_ID',
          pattern: '^[a-z0-9-]+$',
          errorMessage: 'Invalid Firebase project ID format',
        },
      ],
      requiredInputs: [
        {
          name: 'FIREBASE_PROJECT_ID',
          label: 'Firebase Project ID',
          type: 'text',
          placeholder: 'my-project-id',
          validation: { required: true },
        },
        {
          name: 'FIREBASE_API_KEY',
          label: 'Firebase API Key',
          type: 'text',
          placeholder: 'AIza...',
          validation: { required: true },
        },
        {
          name: 'FIREBASE_SERVICE_ACCOUNT',
          label: 'Service Account JSON (for Admin SDK)',
          type: 'file',
          helpText: 'Upload the JSON file downloaded from Firebase',
        },
      ],
    },

    aws_credentials: {
      type: 'aws_credentials',
      title: 'Configure AWS Credentials',
      description: 'Set up AWS access keys for cloud services',
      category: 'api_setup',
      estimatedMinutes: 10,
      instructions: [
        '1. Log into AWS Console at https://console.aws.amazon.com/',
        '2. Go to IAM > Users > Your User > Security credentials',
        '3. Click "Create access key"',
        '4. Choose "Application running outside AWS"',
        '5. Copy the Access Key ID and Secret Access Key',
        '6. Important: Store these securely - you cannot view the secret again!',
      ],
      validationRules: [
        {
          type: 'format_match',
          target: 'AWS_ACCESS_KEY_ID',
          pattern: '^AKIA[0-9A-Z]{16}$',
          errorMessage: 'Invalid AWS Access Key ID format',
        },
      ],
      requiredInputs: [
        {
          name: 'AWS_ACCESS_KEY_ID',
          label: 'AWS Access Key ID',
          type: 'text',
          placeholder: 'AKIAIOSFODNN7EXAMPLE',
          validation: { required: true, pattern: '^AKIA' },
        },
        {
          name: 'AWS_SECRET_ACCESS_KEY',
          label: 'AWS Secret Access Key',
          type: 'password',
          placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          validation: { required: true, minLength: 40 },
        },
        {
          name: 'AWS_REGION',
          label: 'AWS Region',
          type: 'text',
          placeholder: 'us-east-1',
          validation: { required: true },
        },
      ],
    },

    github_oauth: {
      type: 'github_oauth',
      title: 'Configure GitHub OAuth',
      description: 'Set up GitHub OAuth for user authentication',
      category: 'api_setup',
      estimatedMinutes: 8,
      instructions: [
        '1. Go to https://github.com/settings/developers',
        '2. Click "New OAuth App"',
        '3. Fill in your application details:',
        '   - Application name: Your app name',
        '   - Homepage URL: Your app URL',
        '   - Authorization callback URL: {your-domain}/api/auth/callback/github',
        '4. Click "Register application"',
        '5. Copy the Client ID',
        '6. Generate a new Client Secret and copy it',
      ],
      validationRules: [
        {
          type: 'format_match',
          target: 'GITHUB_CLIENT_ID',
          pattern: '^[a-f0-9]{20}$',
          errorMessage: 'Invalid GitHub Client ID format',
        },
      ],
      requiredInputs: [
        {
          name: 'GITHUB_CLIENT_ID',
          label: 'GitHub Client ID',
          type: 'text',
          placeholder: '1234567890abcdef1234',
          validation: { required: true },
        },
        {
          name: 'GITHUB_CLIENT_SECRET',
          label: 'GitHub Client Secret',
          type: 'password',
          placeholder: 'abcdef1234567890...',
          validation: { required: true, minLength: 40 },
        },
      ],
    },

    google_oauth: {
      type: 'google_oauth',
      title: 'Configure Google OAuth',
      description: 'Set up Google OAuth for user authentication',
      category: 'api_setup',
      estimatedMinutes: 10,
      instructions: [
        '1. Go to https://console.cloud.google.com/apis/credentials',
        '2. Create a project (or select existing)',
        '3. Click "Create Credentials" > "OAuth client ID"',
        '4. Configure the consent screen if prompted',
        '5. Select "Web application" as application type',
        '6. Add authorized redirect URIs: {your-domain}/api/auth/callback/google',
        '7. Copy the Client ID and Client Secret',
      ],
      validationRules: [
        {
          type: 'format_match',
          target: 'GOOGLE_CLIENT_ID',
          pattern: '\\.apps\\.googleusercontent\\.com$',
          errorMessage: 'Invalid Google Client ID format',
        },
      ],
      requiredInputs: [
        {
          name: 'GOOGLE_CLIENT_ID',
          label: 'Google Client ID',
          type: 'text',
          placeholder: '123456789-abc.apps.googleusercontent.com',
          validation: { required: true },
        },
        {
          name: 'GOOGLE_CLIENT_SECRET',
          label: 'Google Client Secret',
          type: 'password',
          placeholder: 'GOCSPX-...',
          validation: { required: true },
        },
      ],
    },

    env_variables: {
      type: 'env_variables',
      title: 'Configure Environment Variables',
      description: 'Set up required environment variables',
      category: 'environment',
      estimatedMinutes: 5,
      instructions: [
        '1. Review the required environment variables below',
        '2. Provide values for each variable',
        '3. These will be added to your .env file',
      ],
      validationRules: [],
      requiredInputs: [],
    },

    database_migration: {
      type: 'database_migration',
      title: 'Run Database Migrations',
      description: 'Apply database schema migrations',
      category: 'manual_config',
      estimatedMinutes: 5,
      instructions: [
        '1. Ensure your database is running',
        '2. Run the migration command in your terminal',
        '3. Verify the migration completed successfully',
      ],
      validationRules: [],
      requiredInputs: [],
    },

    ssl_certificate: {
      type: 'ssl_certificate',
      title: 'Configure SSL Certificate',
      description: 'Set up HTTPS for your domain',
      category: 'external_service',
      estimatedMinutes: 15,
      instructions: [
        '1. Choose an SSL provider (Let\'s Encrypt is free)',
        '2. Generate or obtain your SSL certificate',
        '3. Configure your web server with the certificate',
        '4. Verify HTTPS is working',
      ],
      validationRules: [
        {
          type: 'url_reachable',
          target: 'DOMAIN_URL',
          errorMessage: 'Domain is not reachable over HTTPS',
        },
      ],
      requiredInputs: [
        {
          name: 'DOMAIN_URL',
          label: 'Your Domain URL',
          type: 'url',
          placeholder: 'https://example.com',
          validation: { required: true, pattern: '^https://' },
        },
      ],
    },

    domain_dns: {
      type: 'domain_dns',
      title: 'Configure DNS Settings',
      description: 'Point your domain to your server',
      category: 'external_service',
      estimatedMinutes: 10,
      instructions: [
        '1. Go to your domain registrar\'s DNS settings',
        '2. Add an A record pointing to your server IP',
        '3. Wait for DNS propagation (can take up to 48 hours)',
        '4. Verify using: nslookup your-domain.com',
      ],
      validationRules: [],
      requiredInputs: [
        {
          name: 'DOMAIN_NAME',
          label: 'Domain Name',
          type: 'text',
          placeholder: 'example.com',
          validation: { required: true },
        },
        {
          name: 'SERVER_IP',
          label: 'Server IP Address',
          type: 'text',
          placeholder: '123.45.67.89',
          validation: { required: true },
        },
      ],
    },

    api_key_generation: {
      type: 'api_key_generation',
      title: 'Generate API Key',
      description: 'Create an API key for external service',
      category: 'api_setup',
      estimatedMinutes: 5,
      instructions: [
        '1. Navigate to the API provider\'s dashboard',
        '2. Generate a new API key',
        '3. Copy and securely store the key',
        '4. Enter the key below',
      ],
      validationRules: [],
      requiredInputs: [
        {
          name: 'API_KEY',
          label: 'API Key',
          type: 'password',
          validation: { required: true },
        },
      ],
    },

    manual_testing: {
      type: 'manual_testing',
      title: 'Manual Testing Required',
      description: 'Perform manual testing to verify functionality',
      category: 'verification',
      estimatedMinutes: 15,
      instructions: [
        '1. Follow the test steps provided',
        '2. Document any issues found',
        '3. Mark as complete when all tests pass',
      ],
      validationRules: [],
      requiredInputs: [],
    },

    custom: {
      type: 'custom',
      title: 'Custom Manual Task',
      description: 'A custom manual step',
      category: 'manual_config',
      estimatedMinutes: 10,
      instructions: [],
      validationRules: [],
      requiredInputs: [],
    },
  };

  detectManualTasks(task: {
    name: string;
    description: string;
    type?: string;
  }): ManualTask | null {
    const taskText = `${task.name} ${task.description}`.toLowerCase();

    // Detection patterns
    const detectionPatterns: { patterns: string[]; type: ManualTaskType }[] = [
      { patterns: ['stripe', 'payment gateway', 'credit card'], type: 'stripe_setup' },
      { patterns: ['firebase', 'firestore'], type: 'firebase_setup' },
      { patterns: ['aws', 'amazon web services', 's3 bucket', 'lambda'], type: 'aws_credentials' },
      { patterns: ['github oauth', 'github login', 'github auth'], type: 'github_oauth' },
      { patterns: ['google oauth', 'google login', 'google auth', 'google sign'], type: 'google_oauth' },
      { patterns: ['environment variable', 'env config', '.env'], type: 'env_variables' },
      { patterns: ['database migration', 'schema migration', 'migrate database'], type: 'database_migration' },
      { patterns: ['ssl', 'https', 'certificate'], type: 'ssl_certificate' },
      { patterns: ['dns', 'domain config', 'nameserver'], type: 'domain_dns' },
      { patterns: ['api key', 'generate key', 'create api'], type: 'api_key_generation' },
      { patterns: ['manual test', 'verify manually', 'user testing'], type: 'manual_testing' },
    ];

    for (const { patterns, type } of detectionPatterns) {
      if (patterns.some(p => taskText.includes(p))) {
        const template = this.taskTemplates[type];
        return {
          id: `manual-${type}-${Date.now()}`,
          ...template,
        };
      }
    }

    // Check if task explicitly marked as manual
    if (task.type === 'manual' || taskText.includes('manual')) {
      const template = this.taskTemplates.custom;
      return {
        id: `manual-custom-${Date.now()}`,
        ...template,
        title: task.name,
        description: task.description,
      };
    }

    return null;
  }

  getTaskTemplate(type: ManualTaskType): ManualTask {
    const template = this.taskTemplates[type];
    return {
      id: `manual-${type}-${Date.now()}`,
      ...template,
    };
  }

  async validateInputs(
    task: ManualTask,
    inputs: Record<string, string>
  ): Promise<{ valid: boolean; results: ValidationResult[] }> {
    const results: ValidationResult[] = [];

    for (const rule of task.validationRules) {
      const value = inputs[rule.target];
      let passed = false;
      let message = '';

      switch (rule.type) {
        case 'env_var_exists':
          passed = !!value && value.trim().length > 0;
          message = passed ? 'Value provided' : rule.errorMessage;
          break;

        case 'format_match':
          if (rule.pattern) {
            const regex = new RegExp(rule.pattern);
            passed = regex.test(value || '');
            message = passed ? 'Format valid' : rule.errorMessage;
          }
          break;

        case 'url_reachable':
          try {
            const response = await fetch(value, { method: 'HEAD' });
            passed = response.ok;
            message = passed ? 'URL is reachable' : rule.errorMessage;
          } catch {
            passed = false;
            message = rule.errorMessage;
          }
          break;

        case 'custom':
          passed = true;
          message = 'Custom validation passed';
          break;
      }

      results.push({ rule: rule.target, passed, message });
    }

    // Also validate required inputs
    for (const input of task.requiredInputs) {
      if (input.validation?.required && !inputs[input.name]) {
        results.push({
          rule: input.name,
          passed: false,
          message: `${input.label} is required`,
        });
      }

      if (input.validation?.pattern && inputs[input.name]) {
        const regex = new RegExp(input.validation.pattern);
        if (!regex.test(inputs[input.name])) {
          results.push({
            rule: input.name,
            passed: false,
            message: `${input.label} format is invalid`,
          });
        }
      }

      if (input.validation?.minLength && inputs[input.name]) {
        if (inputs[input.name].length < input.validation.minLength) {
          results.push({
            rule: input.name,
            passed: false,
            message: `${input.label} must be at least ${input.validation.minLength} characters`,
          });
        }
      }
    }

    const valid = results.every(r => r.passed);
    return { valid, results };
  }

  generateEnvFileContent(inputs: Record<string, string>): string {
    return Object.entries(inputs)
      .filter(([key]) => key.startsWith('STRIPE_') ||
                        key.startsWith('FIREBASE_') ||
                        key.startsWith('AWS_') ||
                        key.startsWith('GITHUB_') ||
                        key.startsWith('GOOGLE_') ||
                        key.includes('API_KEY') ||
                        key.includes('SECRET'))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  }
}
