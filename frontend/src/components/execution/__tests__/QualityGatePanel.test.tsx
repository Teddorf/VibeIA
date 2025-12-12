import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QualityGatePanel } from '../QualityGatePanel';

describe('QualityGatePanel', () => {
  const defaultGates = {
    lint: { status: 'passed' as const, message: 'No lint errors', details: [] },
    tests: { status: 'failed' as const, message: '2 tests failed', details: ['test1.spec.ts', 'test2.spec.ts'] },
    security: { status: 'pending' as const, message: 'Running security scan...', details: [] },
    coverage: { status: 'passed' as const, message: '85% coverage', details: [] },
  };

  const defaultProps = {
    gates: defaultGates,
    taskId: 'task-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render quality gate panel', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('quality-gate-panel')).toBeInTheDocument();
  });

  it('should render panel title', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    expect(screen.getByText(/quality gates/i)).toBeInTheDocument();
  });

  it('should render all gate items', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('gate-lint')).toBeInTheDocument();
    expect(screen.getByTestId('gate-tests')).toBeInTheDocument();
    expect(screen.getByTestId('gate-security')).toBeInTheDocument();
    expect(screen.getByTestId('gate-coverage')).toBeInTheDocument();
  });

  it('should render gate names', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    expect(screen.getByText('Lint')).toBeInTheDocument();
    expect(screen.getByText('Tests')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
  });

  // ============================================
  // STATUS INDICATORS
  // ============================================

  it('should show passed status with check icon', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    const lintGate = screen.getByTestId('gate-lint');
    expect(lintGate).toHaveAttribute('data-status', 'passed');
    expect(screen.getByTestId('check-icon-lint')).toBeInTheDocument();
  });

  it('should show failed status with x icon', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    const testsGate = screen.getByTestId('gate-tests');
    expect(testsGate).toHaveAttribute('data-status', 'failed');
    expect(screen.getByTestId('x-icon-tests')).toBeInTheDocument();
  });

  it('should show pending status with spinner', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    const securityGate = screen.getByTestId('gate-security');
    expect(securityGate).toHaveAttribute('data-status', 'pending');
    expect(screen.getByTestId('spinner-security')).toBeInTheDocument();
  });

  it('should show skipped status when gate is skipped', () => {
    // Arrange
    const gatesWithSkipped = {
      ...defaultGates,
      lint: { status: 'skipped' as const, message: 'Skipped', details: [] },
    };

    // Act
    render(<QualityGatePanel gates={gatesWithSkipped} taskId="task-123" />);

    // Assert
    const lintGate = screen.getByTestId('gate-lint');
    expect(lintGate).toHaveAttribute('data-status', 'skipped');
    expect(screen.getByTestId('skip-icon-lint')).toBeInTheDocument();
  });

  // ============================================
  // STATUS COLORS
  // ============================================

  it('should apply green color for passed gates', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    const lintGate = screen.getByTestId('gate-lint');
    expect(lintGate).toHaveClass('border-green-500');
  });

  it('should apply red color for failed gates', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    const testsGate = screen.getByTestId('gate-tests');
    expect(testsGate).toHaveClass('border-red-500');
  });

  it('should apply yellow color for pending gates', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    const securityGate = screen.getByTestId('gate-security');
    expect(securityGate).toHaveClass('border-yellow-500');
  });

  // ============================================
  // MESSAGES
  // ============================================

  it('should display gate messages', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    expect(screen.getByText('No lint errors')).toBeInTheDocument();
    expect(screen.getByText('2 tests failed')).toBeInTheDocument();
    expect(screen.getByText('Running security scan...')).toBeInTheDocument();
    expect(screen.getByText('85% coverage')).toBeInTheDocument();
  });

  // ============================================
  // DETAILS EXPANSION
  // ============================================

  it('should show expand button when gate has details', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    const testsGate = screen.getByTestId('gate-tests');
    expect(testsGate.querySelector('[data-testid="expand-button"]')).toBeInTheDocument();
  });

  it('should not show expand button when gate has no details', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    const lintGate = screen.getByTestId('gate-lint');
    expect(lintGate.querySelector('[data-testid="expand-button"]')).not.toBeInTheDocument();
  });

  it('should expand details when expand button is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<QualityGatePanel {...defaultProps} />);

    // Act
    const expandButton = screen.getByTestId('gate-tests').querySelector('[data-testid="expand-button"]')!;
    await user.click(expandButton);

    // Assert
    expect(screen.getByText('test1.spec.ts')).toBeInTheDocument();
    expect(screen.getByText('test2.spec.ts')).toBeInTheDocument();
  });

  it('should collapse details when expand button is clicked again', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<QualityGatePanel {...defaultProps} />);

    // Act - expand then collapse
    const expandButton = screen.getByTestId('gate-tests').querySelector('[data-testid="expand-button"]')!;
    await user.click(expandButton);
    await user.click(expandButton);

    // Assert
    expect(screen.queryByText('test1.spec.ts')).not.toBeInTheDocument();
  });

  // ============================================
  // OVERALL STATUS
  // ============================================

  it('should show overall passed when all gates pass', () => {
    // Arrange
    const allPassed = {
      lint: { status: 'passed' as const, message: 'OK', details: [] },
      tests: { status: 'passed' as const, message: 'OK', details: [] },
    };

    // Act
    render(<QualityGatePanel gates={allPassed} taskId="task-123" />);

    // Assert
    expect(screen.getByTestId('overall-status')).toHaveAttribute('data-status', 'passed');
    expect(screen.getByText(/all gates passed/i)).toBeInTheDocument();
  });

  it('should show overall failed when any gate fails', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('overall-status')).toHaveAttribute('data-status', 'failed');
    expect(screen.getByText(/1 gate failed/i)).toBeInTheDocument();
  });

  it('should show overall pending when gates are running', () => {
    // Arrange
    const withPending = {
      lint: { status: 'passed' as const, message: 'OK', details: [] },
      tests: { status: 'pending' as const, message: 'Running...', details: [] },
    };

    // Act
    render(<QualityGatePanel gates={withPending} taskId="task-123" />);

    // Assert
    expect(screen.getByTestId('overall-status')).toHaveAttribute('data-status', 'pending');
  });

  // ============================================
  // ACTIONS
  // ============================================

  it('should show retry button for failed gates', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} onRetry={() => {}} />);

    // Assert
    expect(screen.getByRole('button', { name: /retry tests/i })).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', async () => {
    // Arrange
    const onRetry = jest.fn();
    const user = userEvent.setup();
    render(<QualityGatePanel {...defaultProps} onRetry={onRetry} />);

    // Act
    await user.click(screen.getByRole('button', { name: /retry tests/i }));

    // Assert
    expect(onRetry).toHaveBeenCalledWith('tests');
  });

  it('should show skip button when gate is skippable', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} skippableGates={['tests']} onSkip={() => {}} />);

    // Assert
    expect(screen.getByRole('button', { name: /skip tests/i })).toBeInTheDocument();
  });

  it('should call onSkip when skip button is clicked', async () => {
    // Arrange
    const onSkip = jest.fn();
    const user = userEvent.setup();
    render(<QualityGatePanel {...defaultProps} skippableGates={['tests']} onSkip={onSkip} />);

    // Act
    await user.click(screen.getByRole('button', { name: /skip tests/i }));

    // Assert
    expect(onSkip).toHaveBeenCalledWith('tests');
  });

  // ============================================
  // PROGRESS
  // ============================================

  it('should show progress indicator for running gates', () => {
    // Arrange
    const gatesWithProgress = {
      ...defaultGates,
      security: { status: 'pending' as const, message: 'Scanning...', details: [], progress: 45 },
    };

    // Act
    render(<QualityGatePanel gates={gatesWithProgress} taskId="task-123" />);

    // Assert
    const progressBar = screen.getByTestId('progress-security');
    expect(progressBar).toHaveAttribute('aria-valuenow', '45');
  });

  // ============================================
  // TIMESTAMPS
  // ============================================

  it('should show completion time for finished gates', () => {
    // Arrange
    const gatesWithTime = {
      lint: {
        status: 'passed' as const,
        message: 'OK',
        details: [],
        completedAt: new Date('2024-01-15T10:30:00'),
        duration: 1500, // 1.5 seconds
      },
    };

    // Act
    render(<QualityGatePanel gates={gatesWithTime} taskId="task-123" showTimestamps />);

    // Assert
    expect(screen.getByText('1.5s')).toBeInTheDocument();
  });

  // ============================================
  // VARIANTS
  // ============================================

  it('should render compact variant', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} variant="compact" />);

    // Assert
    const panel = screen.getByTestId('quality-gate-panel');
    expect(panel).toHaveClass('p-2');
  });

  it('should render default variant', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    const panel = screen.getByTestId('quality-gate-panel');
    expect(panel).toHaveClass('p-4');
  });

  it('should render expanded variant', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} variant="expanded" />);

    // Assert
    const panel = screen.getByTestId('quality-gate-panel');
    expect(panel).toHaveClass('p-6');
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have proper ARIA attributes', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    const panel = screen.getByTestId('quality-gate-panel');
    expect(panel).toHaveAttribute('role', 'region');
    expect(panel).toHaveAttribute('aria-label', 'Quality gates panel');
  });

  it('should announce status changes to screen readers', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} />);

    // Assert
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  // ============================================
  // EMPTY STATE
  // ============================================

  it('should show empty state when no gates configured', () => {
    // Arrange & Act
    render(<QualityGatePanel gates={{}} taskId="task-123" />);

    // Assert
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/no quality gates configured/i)).toBeInTheDocument();
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle gates with very long messages', () => {
    // Arrange
    const longMessage = 'A'.repeat(200);
    const gatesWithLongMessage = {
      lint: { status: 'passed' as const, message: longMessage, details: [] },
    };

    // Act
    render(<QualityGatePanel gates={gatesWithLongMessage} taskId="task-123" />);

    // Assert
    const messageElement = screen.getByTestId('message-lint');
    expect(messageElement).toHaveClass('truncate');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<QualityGatePanel {...defaultProps} className="custom-panel" />);

    // Assert
    expect(screen.getByTestId('quality-gate-panel')).toHaveClass('custom-panel');
  });
});
