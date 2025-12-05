import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManualTaskGuide } from '../ManualTaskGuide';

const mockStripeTask = {
  id: 'manual-stripe-123',
  type: 'stripe_setup',
  title: 'Configure Stripe Payment Integration',
  description: 'Set up Stripe API keys for payment processing',
  instructions: [
    '1. Go to https://dashboard.stripe.com/register',
    '2. Navigate to Developers > API Keys',
    '3. Copy your Publishable key and Secret key',
  ],
  requiredInputs: [
    {
      name: 'STRIPE_PUBLISHABLE_KEY',
      label: 'Stripe Publishable Key',
      type: 'text' as const,
      placeholder: 'pk_test_...',
      helpText: 'Starts with pk_test_ or pk_live_',
      validation: { required: true, pattern: '^pk_(test_|live_)' },
    },
    {
      name: 'STRIPE_SECRET_KEY',
      label: 'Stripe Secret Key',
      type: 'password' as const,
      placeholder: 'sk_test_...',
      helpText: 'Keep this secret!',
      validation: { required: true, pattern: '^sk_(test_|live_)' },
    },
  ],
  estimatedMinutes: 10,
  category: 'api_setup' as const,
};

const mockSimpleTask = {
  id: 'manual-simple-123',
  type: 'manual_testing',
  title: 'Manual Testing Required',
  description: 'Perform manual testing',
  instructions: ['1. Test the feature', '2. Document results'],
  requiredInputs: [],
  estimatedMinutes: 15,
  category: 'verification' as const,
};

describe('ManualTaskGuide', () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render task title and description', () => {
    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Configure Stripe Payment Integration')).toBeInTheDocument();
    expect(screen.getByText('Set up Stripe API keys for payment processing')).toBeInTheDocument();
  });

  it('should render all instructions', () => {
    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/Go to https:\/\/dashboard.stripe.com/)).toBeInTheDocument();
    expect(screen.getByText(/Navigate to Developers/)).toBeInTheDocument();
    expect(screen.getByText(/Copy your Publishable key/)).toBeInTheDocument();
  });

  it('should render required input fields', () => {
    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByPlaceholderText('pk_test_...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sk_test_...')).toBeInTheDocument();
    expect(screen.getByText(/Stripe Publishable Key/)).toBeInTheDocument();
    expect(screen.getByText(/Stripe Secret Key/)).toBeInTheDocument();
  });

  it('should display estimated time', () => {
    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/~10 min/)).toBeInTheDocument();
  });

  it('should display MANUAL STEP REQUIRED badge', () => {
    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('MANUAL STEP REQUIRED')).toBeInTheDocument();
  });

  it('should disable submit button when required fields are empty', () => {
    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Complete & Continue/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when all required fields are filled', async () => {
    const user = userEvent.setup();

    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
      />
    );

    const publishableKeyInput = screen.getByPlaceholderText('pk_test_...');
    const secretKeyInput = screen.getByPlaceholderText('sk_test_...');

    await user.type(publishableKeyInput, 'pk_test_123456789');
    await user.type(secretKeyInput, 'sk_test_987654321');

    const submitButton = screen.getByRole('button', { name: /Complete & Continue/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should call onComplete with inputs when submitted', async () => {
    const user = userEvent.setup();

    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
      />
    );

    const publishableKeyInput = screen.getByPlaceholderText('pk_test_...');
    const secretKeyInput = screen.getByPlaceholderText('sk_test_...');

    await user.type(publishableKeyInput, 'pk_test_123456789');
    await user.type(secretKeyInput, 'sk_test_987654321');

    const submitButton = screen.getByRole('button', { name: /Complete & Continue/i });
    await user.click(submitButton);

    expect(mockOnComplete).toHaveBeenCalledWith({
      STRIPE_PUBLISHABLE_KEY: 'pk_test_123456789',
      STRIPE_SECRET_KEY: 'sk_test_987654321',
    });
  });

  it('should render skip button when onSkip is provided', () => {
    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.getByRole('button', { name: /Skip for now/i })).toBeInTheDocument();
  });

  it('should not render skip button when onSkip is not provided', () => {
    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.queryByRole('button', { name: /Skip for now/i })).not.toBeInTheDocument();
  });

  it('should call onSkip when skip button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    const skipButton = screen.getByRole('button', { name: /Skip for now/i });
    await user.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalled();
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();

    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
      />
    );

    const secretKeyInput = screen.getByPlaceholderText('sk_test_...');
    expect(secretKeyInput).toHaveAttribute('type', 'password');

    // Find and click the visibility toggle button
    const toggleButtons = screen.getAllByRole('button');
    const visibilityToggle = toggleButtons.find(btn => btn.textContent?.includes('👁️'));

    if (visibilityToggle) {
      await user.click(visibilityToggle);
      expect(secretKeyInput).toHaveAttribute('type', 'text');
    }
  });

  it('should display validation errors', () => {
    const validationResults = [
      { rule: 'STRIPE_PUBLISHABLE_KEY', passed: false, message: 'Invalid format' },
      { rule: 'STRIPE_SECRET_KEY', passed: true, message: 'Valid' },
    ];

    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
        validationResults={validationResults}
      />
    );

    expect(screen.getByText('Invalid format')).toBeInTheDocument();
  });

  it('should display validation failed summary', () => {
    const validationResults = [
      { rule: 'STRIPE_PUBLISHABLE_KEY', passed: false, message: 'Invalid key format' },
    ];

    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
        validationResults={validationResults}
      />
    );

    expect(screen.getByText('Validation Failed')).toBeInTheDocument();
  });

  it('should show validating state', () => {
    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
        isValidating={true}
      />
    );

    expect(screen.getByText(/Validating/)).toBeInTheDocument();
  });

  it('should disable buttons when validating', async () => {
    const user = userEvent.setup();

    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        isValidating={true}
      />
    );

    const skipButton = screen.getByRole('button', { name: /Skip for now/i });
    expect(skipButton).toBeDisabled();
  });

  it('should render task with no required inputs', () => {
    render(
      <ManualTaskGuide
        task={mockSimpleTask}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Manual Testing Required')).toBeInTheDocument();
    // Submit button should be enabled since no inputs are required
    const submitButton = screen.getByRole('button', { name: /Complete & Continue/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should display help text for inputs', () => {
    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/Starts with pk_test_ or pk_live_/)).toBeInTheDocument();
    expect(screen.getByText(/Keep this secret!/)).toBeInTheDocument();
  });

  it('should display category icon', () => {
    render(
      <ManualTaskGuide
        task={mockStripeTask}
        onComplete={mockOnComplete}
      />
    );

    // api_setup category should show key icon
    expect(screen.getByText('🔑')).toBeInTheDocument();
  });
});
