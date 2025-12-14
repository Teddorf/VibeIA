import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhaseIndicator } from '../PhaseIndicator';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/projects/123/intention',
}));

describe('PhaseIndicator', () => {
  const defaultProps = {
    projectId: '123',
    currentPhase: 1 as const,
    phases: [
      { id: 1, name: 'Intention', status: 'completed' as const, href: '/projects/123/intention' },
      { id: 2, name: 'Business Analysis', status: 'current' as const, href: '/projects/123/business-analysis' },
      { id: 3, name: 'Technical Analysis', status: 'pending' as const, href: '/projects/123/technical-analysis' },
      { id: 4, name: 'Execution', status: 'pending' as const, href: '/projects/123/execution' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render all 4 phases', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} />);

    // Assert
    expect(screen.getByText('Intention')).toBeInTheDocument();
    expect(screen.getByText('Business Analysis')).toBeInTheDocument();
    expect(screen.getByText('Technical Analysis')).toBeInTheDocument();
    expect(screen.getByText('Execution')).toBeInTheDocument();
  });

  it('should render phase numbers for non-completed phases', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} />);

    // Assert - Phase 1 is completed (shows check), phases 2-4 show numbers
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('should render as navigation element', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} />);

    // Assert
    expect(screen.getByRole('navigation', { name: /phase/i })).toBeInTheDocument();
  });

  it('should render progress bar', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} />);

    // Assert
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // ============================================
  // PHASE STATUS STYLES
  // ============================================

  it('should show completed phases with checkmark icon', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} />);

    // Assert
    const completedPhase = screen.getByTestId('phase-1');
    expect(completedPhase).toHaveAttribute('data-status', 'completed');
    expect(screen.getByTestId('check-icon-1')).toBeInTheDocument();
  });

  it('should highlight current phase', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} />);

    // Assert
    const currentPhase = screen.getByTestId('phase-2');
    expect(currentPhase).toHaveAttribute('data-status', 'current');
    expect(currentPhase).toHaveClass('ring-2');
  });

  it('should show pending phases as disabled', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} />);

    // Assert
    const pendingPhase = screen.getByTestId('phase-3');
    expect(pendingPhase).toHaveAttribute('data-status', 'pending');
    expect(pendingPhase).toHaveClass('opacity-50');
  });

  it('should show locked phases with lock icon', () => {
    // Arrange
    const propsWithLocked = {
      ...defaultProps,
      phases: [
        ...defaultProps.phases.slice(0, 3),
        { id: 4, name: 'Execution', status: 'locked' as const, href: '/projects/123/execution' },
      ],
    };

    // Act
    render(<PhaseIndicator {...propsWithLocked} />);

    // Assert
    expect(screen.getByTestId('lock-icon-4')).toBeInTheDocument();
  });

  // ============================================
  // PROGRESS BAR
  // ============================================

  it('should show correct progress percentage', () => {
    // Arrange - 1 completed out of 4
    const props = {
      ...defaultProps,
      phases: [
        { id: 1, name: 'Intention', status: 'completed' as const, href: '/projects/123/intention' },
        { id: 2, name: 'Business', status: 'current' as const, href: '/projects/123/business' },
        { id: 3, name: 'Technical', status: 'pending' as const, href: '/projects/123/technical' },
        { id: 4, name: 'Execution', status: 'pending' as const, href: '/projects/123/execution' },
      ],
    };

    // Act
    render(<PhaseIndicator {...props} />);

    // Assert - 25% completed (1/4)
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '25');
  });

  it('should show 0% when no phases completed', () => {
    // Arrange
    const props = {
      ...defaultProps,
      phases: defaultProps.phases.map(p => ({ ...p, status: 'pending' as const })),
    };

    // Act
    render(<PhaseIndicator {...props} />);

    // Assert
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('should show 100% when all phases completed', () => {
    // Arrange
    const props = {
      ...defaultProps,
      phases: defaultProps.phases.map(p => ({ ...p, status: 'completed' as const })),
    };

    // Act
    render(<PhaseIndicator {...props} />);

    // Assert
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  // ============================================
  // NAVIGATION
  // ============================================

  it('should navigate to phase when completed phase is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PhaseIndicator {...defaultProps} />);

    // Act
    const completedPhase = screen.getByTestId('phase-1');
    await user.click(completedPhase);

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/projects/123/intention');
  });

  it('should navigate to current phase when clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PhaseIndicator {...defaultProps} />);

    // Act
    const currentPhase = screen.getByTestId('phase-2');
    await user.click(currentPhase);

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/projects/123/business-analysis');
  });

  it('should not navigate when pending phase is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PhaseIndicator {...defaultProps} />);

    // Act
    const pendingPhase = screen.getByTestId('phase-3');
    await user.click(pendingPhase);

    // Assert
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should not navigate when locked phase is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    const propsWithLocked = {
      ...defaultProps,
      phases: [
        ...defaultProps.phases.slice(0, 3),
        { id: 4, name: 'Execution', status: 'locked' as const, href: '/projects/123/execution' },
      ],
    };
    render(<PhaseIndicator {...propsWithLocked} />);

    // Act
    const lockedPhase = screen.getByTestId('phase-4');
    await user.click(lockedPhase);

    // Assert
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ============================================
  // CALLBACKS
  // ============================================

  it('should call onPhaseClick when a phase is clicked', async () => {
    // Arrange
    const onPhaseClick = jest.fn();
    const user = userEvent.setup();
    render(<PhaseIndicator {...defaultProps} onPhaseClick={onPhaseClick} />);

    // Act
    const phase = screen.getByTestId('phase-1');
    await user.click(phase);

    // Assert
    expect(onPhaseClick).toHaveBeenCalledWith(defaultProps.phases[0]);
  });

  // ============================================
  // VARIANTS
  // ============================================

  it('should render horizontal layout by default', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} />);

    // Assert
    const container = screen.getByTestId('phase-indicator');
    expect(container).toHaveClass('flex-row');
  });

  it('should render vertical layout when variant is vertical', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} variant="vertical" />);

    // Assert
    const container = screen.getByTestId('phase-indicator');
    expect(container).toHaveClass('flex-col');
  });

  it('should render compact version when size is sm', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} size="sm" />);

    // Assert
    const phaseCircles = screen.getAllByTestId(/phase-\d/);
    phaseCircles.forEach(circle => {
      expect(circle).toHaveClass('w-8', 'h-8');
    });
  });

  it('should render large version when size is lg', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} size="lg" />);

    // Assert
    const phaseCircles = screen.getAllByTestId(/phase-\d/);
    phaseCircles.forEach(circle => {
      expect(circle).toHaveClass('w-14', 'h-14');
    });
  });

  // ============================================
  // TOOLTIPS
  // ============================================

  it('should show tooltip on hover with phase description', async () => {
    // Arrange
    const user = userEvent.setup();
    const propsWithDescriptions = {
      ...defaultProps,
      phases: defaultProps.phases.map(p => ({
        ...p,
        description: `Description for ${p.name}`,
      })),
    };
    render(<PhaseIndicator {...propsWithDescriptions} />);

    // Act
    const phase = screen.getByTestId('phase-1');
    await user.hover(phase);

    // Assert
    expect(screen.getByRole('tooltip')).toHaveTextContent('Description for Intention');
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have proper ARIA attributes on progress bar', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} />);

    // Assert
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-label', expect.stringContaining('progress'));
  });

  it('should mark current phase as aria-current step', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} />);

    // Assert
    const currentPhase = screen.getByTestId('phase-2');
    expect(currentPhase).toHaveAttribute('aria-current', 'step');
  });

  it('should have aria-disabled on pending phases', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} />);

    // Assert
    const pendingPhase = screen.getByTestId('phase-3');
    expect(pendingPhase).toHaveAttribute('aria-disabled', 'true');
  });

  it('should support keyboard navigation', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PhaseIndicator {...defaultProps} />);

    // Act
    const completedPhase = screen.getByTestId('phase-1');
    completedPhase.focus();
    await user.keyboard('{Enter}');

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/projects/123/intention');
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle empty phases array', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} phases={[]} />);

    // Assert
    const indicator = screen.getByTestId('phase-indicator');
    expect(indicator).toBeInTheDocument();
  });

  it('should handle single phase', () => {
    // Arrange
    const singlePhase = {
      ...defaultProps,
      phases: [defaultProps.phases[0]],
    };

    // Act
    render(<PhaseIndicator {...singlePhase} />);

    // Assert
    expect(screen.getByText('Intention')).toBeInTheDocument();
    expect(screen.queryByText('Business Analysis')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<PhaseIndicator {...defaultProps} className="custom-class" />);

    // Assert
    const indicator = screen.getByTestId('phase-indicator');
    expect(indicator).toHaveClass('custom-class');
  });

  it('should show estimated time when provided', () => {
    // Arrange
    const propsWithTime = {
      ...defaultProps,
      phases: defaultProps.phases.map(p => ({
        ...p,
        estimatedTime: '2 hours',
      })),
    };

    // Act
    render(<PhaseIndicator {...propsWithTime} showEstimatedTime />);

    // Assert
    expect(screen.getAllByText('2 hours')).toHaveLength(4);
  });
});
