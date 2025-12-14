import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Stage3TechnicalAnalysis } from '../Stage3TechnicalAnalysis';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  plansApi: {
    generate: jest.fn(),
  },
}));

import { plansApi } from '@/lib/api-client';

const mockPlansApi = plansApi as jest.Mocked<typeof plansApi>;

describe('Stage3TechnicalAnalysis', () => {
  const defaultProps = {
    onNext: jest.fn(),
    onBack: jest.fn(),
    businessData: {
      stage1: { projectName: 'Test Project', description: 'Test Description' },
      target_users: 'Developers',
      main_features: 'Feature 1, Feature 2',
    },
  };

  const mockPlanResponse = {
    phases: [
      {
        name: 'Phase 1: Setup',
        estimatedTime: 30,
        tasks: [
          { id: 'task-1', name: 'Initialize project', description: 'Set up the project structure', estimatedTime: 10 },
          { id: 'task-2', name: 'Configure linting', description: 'Set up ESLint and Prettier', estimatedTime: 20 },
        ],
      },
      {
        name: 'Phase 2: Implementation',
        estimatedTime: 60,
        tasks: [
          { id: 'task-3', name: 'Build feature 1', description: 'Implement first feature', estimatedTime: 30 },
          { id: 'task-4', name: 'Build feature 2', description: 'Implement second feature', estimatedTime: 30 },
        ],
      },
    ],
    estimatedTime: 90,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPlansApi.generate.mockResolvedValue(mockPlanResponse);
  });

  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render the component', () => {
    // Arrange & Act
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByText('Stage 3: Technical Analysis')).toBeInTheDocument();
  });

  it('should render description', () => {
    // Arrange & Act
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByText(/Select architectural patterns/)).toBeInTheDocument();
  });

  it('should render section header', () => {
    // Arrange & Act
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByText('Select Architecture Patterns')).toBeInTheDocument();
  });

  // ============================================
  // ARCHETYPE CARDS
  // ============================================

  it('should render all archetype options', () => {
    // Arrange & Act
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByText('JWT Stateless Authentication')).toBeInTheDocument();
    expect(screen.getByText('Session-based Authentication')).toBeInTheDocument();
    expect(screen.getByText('Event-Driven Notifications')).toBeInTheDocument();
    expect(screen.getByText('Stripe Hosted Checkout')).toBeInTheDocument();
    expect(screen.getByText('S3 Direct Upload')).toBeInTheDocument();
  });

  it('should render archetype descriptions', () => {
    // Arrange & Act
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByText('Token-based auth without server-side sessions')).toBeInTheDocument();
    expect(screen.getByText('Traditional sessions with Redis/DB storage')).toBeInTheDocument();
  });

  it('should render technology tags', () => {
    // Arrange & Act
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByText('JWT')).toBeInTheDocument();
    expect(screen.getByText('bcrypt')).toBeInTheDocument();
    expect(screen.getByText('Passport.js')).toBeInTheDocument();
  });

  // ============================================
  // ARCHETYPE SELECTION
  // ============================================

  it('should select archetype when clicked', () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Act
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Assert - should show checkmark for selected item
    const selectedCard = screen.getByText('JWT Stateless Authentication').closest('div[class*="cursor-pointer"]');
    expect(selectedCard).toHaveClass('border-primary');
  });

  it('should deselect archetype when clicked again', () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Act - select then deselect
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Assert - should not have selected state
    const card = screen.getByText('JWT Stateless Authentication').closest('div[class*="cursor-pointer"]');
    expect(card).not.toHaveClass('border-primary');
  });

  it('should allow multiple selections', () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Act
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));
    fireEvent.click(screen.getByText('S3 Direct Upload'));

    // Assert
    const jwtCard = screen.getByText('JWT Stateless Authentication').closest('div[class*="cursor-pointer"]');
    const s3Card = screen.getByText('S3 Direct Upload').closest('div[class*="cursor-pointer"]');
    expect(jwtCard).toHaveClass('border-primary');
    expect(s3Card).toHaveClass('border-primary');
  });

  // ============================================
  // NAVIGATION BUTTONS
  // ============================================

  it('should render Back button', () => {
    // Arrange & Act
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('should render Generate Plan button', () => {
    // Arrange & Act
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByRole('button', { name: /generate implementation plan/i })).toBeInTheDocument();
  });

  it('should call onBack when Back button clicked', () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    // Assert
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  // ============================================
  // GENERATE BUTTON STATE
  // ============================================

  it('should disable Generate button when no archetypes selected', () => {
    // Arrange & Act
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByRole('button', { name: /generate implementation plan/i })).toBeDisabled();
  });

  it('should enable Generate button when archetypes selected', () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);

    // Act
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Assert
    expect(screen.getByRole('button', { name: /generate implementation plan/i })).toBeEnabled();
  });

  // ============================================
  // PLAN GENERATION
  // ============================================

  it('should call API to generate plan when button clicked', async () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    await waitFor(() => {
      expect(mockPlansApi.generate).toHaveBeenCalledWith({
        stage1: defaultProps.businessData.stage1,
        stage2: defaultProps.businessData,
        stage3: { selectedArchetypes: ['auth-jwt-stateless'] },
      });
    });
  });

  it('should show loading state while generating', async () => {
    // Arrange
    mockPlansApi.generate.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    expect(screen.getByText('Generating Plan with AI...')).toBeInTheDocument();
  });

  it('should disable Generate button while generating', async () => {
    // Arrange
    mockPlansApi.generate.mockImplementation(() => new Promise(() => {}));
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    expect(screen.getByRole('button', { name: /generating plan with ai/i })).toBeDisabled();
  });

  // ============================================
  // GENERATED PLAN DISPLAY
  // ============================================

  it('should show success message after plan generated', async () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Plan Generated Successfully')).toBeInTheDocument();
    });
  });

  it('should show estimated time in plan summary', async () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/Total estimated time: 90 minutes/)).toBeInTheDocument();
    });
  });

  it('should show phases in generated plan', async () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Phase 1: Setup')).toBeInTheDocument();
      expect(screen.getByText('Phase 2: Implementation')).toBeInTheDocument();
    });
  });

  it('should show tasks in generated plan', async () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Initialize project')).toBeInTheDocument();
      expect(screen.getByText('Configure linting')).toBeInTheDocument();
      expect(screen.getByText('Build feature 1')).toBeInTheDocument();
    });
  });

  it('should show task descriptions', async () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Set up the project structure')).toBeInTheDocument();
    });
  });

  // ============================================
  // POST-GENERATION NAVIGATION
  // ============================================

  it('should show Modify Selection button after plan generated', async () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /modify selection/i })).toBeInTheDocument();
    });
  });

  it('should show Next button after plan generated', async () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next: start execution/i })).toBeInTheDocument();
    });
  });

  it('should go back to selection when Modify Selection clicked', async () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /modify selection/i })).toBeInTheDocument();
    });

    // Act
    fireEvent.click(screen.getByRole('button', { name: /modify selection/i }));

    // Assert
    expect(screen.getByText('Select Architecture Patterns')).toBeInTheDocument();
    expect(screen.queryByText('Plan Generated Successfully')).not.toBeInTheDocument();
  });

  it('should call onNext with plan data when Next clicked', async () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next: start execution/i })).toBeInTheDocument();
    });

    // Act
    fireEvent.click(screen.getByRole('button', { name: /next: start execution/i }));

    // Assert
    expect(defaultProps.onNext).toHaveBeenCalledWith({
      selectedArchetypes: ['auth-jwt-stateless'],
      plan: {
        phases: mockPlanResponse.phases,
        estimatedTime: mockPlanResponse.estimatedTime,
      },
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  it('should show error message when plan generation fails', async () => {
    // Arrange
    mockPlansApi.generate.mockRejectedValue(new Error('API Error'));
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should show default error message when error has no message', async () => {
    // Arrange
    mockPlansApi.generate.mockRejectedValue({});
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Failed to generate plan. Please try again.')).toBeInTheDocument();
    });
  });

  it('should clear error when regenerating', async () => {
    // Arrange
    mockPlansApi.generate.mockRejectedValueOnce(new Error('First error'));
    mockPlansApi.generate.mockResolvedValueOnce(mockPlanResponse);
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));

    // First attempt - fails
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));
    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument();
    });

    // Second attempt - succeeds
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));
    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument();
      expect(screen.getByText('Plan Generated Successfully')).toBeInTheDocument();
    });
  });

  // ============================================
  // MULTIPLE ARCHETYPE SELECTION
  // ============================================

  it('should send all selected archetypes in API call', async () => {
    // Arrange
    render(<Stage3TechnicalAnalysis {...defaultProps} />);
    fireEvent.click(screen.getByText('JWT Stateless Authentication'));
    fireEvent.click(screen.getByText('S3 Direct Upload'));
    fireEvent.click(screen.getByText('Stripe Hosted Checkout'));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /generate implementation plan/i }));

    // Assert
    await waitFor(() => {
      expect(mockPlansApi.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          stage3: {
            selectedArchetypes: ['auth-jwt-stateless', 'file-upload-s3-direct', 'payments-stripe-checkout'],
          },
        })
      );
    });
  });
});
