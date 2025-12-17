import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Stage4ExecutionPreview } from '../Stage4ExecutionPreview';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  projectsApi: {
    create: jest.fn(),
  },
  executionApi: {
    start: jest.fn(),
  },
}));

import { projectsApi, executionApi } from '@/lib/api-client';

describe('Stage4ExecutionPreview', () => {
  const mockWizardData = {
    stage1: {
      projectName: 'E-commerce Platform',
      description: 'A modern e-commerce platform with payment integration',
    },
    stage2: {
      target_users: 'Small business owners',
      main_features: 'Product catalog, Shopping cart, Checkout',
      scalability: '100-1000',
    },
    stage3: {
      selectedArchetypes: ['REST API', 'Next.js Frontend', 'PostgreSQL'],
      plan: {
        _id: 'plan-123',
        estimatedTime: 480,
        phases: [
          { name: 'Setup', tasks: [{ id: '1' }, { id: '2' }], estimatedTime: 60 },
          { name: 'Backend', tasks: [{ id: '3' }, { id: '4' }, { id: '5' }], estimatedTime: 180 },
          { name: 'Frontend', tasks: [{ id: '6' }, { id: '7' }], estimatedTime: 240 },
        ],
      },
    },
  };

  const defaultProps = {
    wizardData: mockWizardData,
    onBack: jest.fn(),
    onStartExecution: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (projectsApi.create as jest.Mock).mockResolvedValue({ _id: 'project-456' });
    (executionApi.start as jest.Mock).mockResolvedValue({});
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render the component', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText('Stage 4: Ready to Execute')).toBeInTheDocument();
  });

  it('should render the description', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText('Review your project plan before we start building')).toBeInTheDocument();
  });

  it('should render navigation buttons', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByRole('button', { name: /back to plan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start execution/i })).toBeInTheDocument();
  });

  // ============================================
  // PROJECT OVERVIEW
  // ============================================

  it('should display project name', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
  });

  it('should display project description', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText('A modern e-commerce platform with payment integration')).toBeInTheDocument();
  });

  // ============================================
  // BUSINESS REQUIREMENTS
  // ============================================

  it('should display business requirements section', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText('📋 Business Requirements')).toBeInTheDocument();
  });

  it('should display stage2 answers', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText('Small business owners')).toBeInTheDocument();
    expect(screen.getByText('Product catalog, Shopping cart, Checkout')).toBeInTheDocument();
    expect(screen.getByText('100-1000')).toBeInTheDocument();
  });

  it('should format requirement keys properly', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert - keys are formatted with capitalization
    expect(screen.getByText('Target Users:')).toBeInTheDocument();
    expect(screen.getByText('Main Features:')).toBeInTheDocument();
    expect(screen.getByText('Scalability:')).toBeInTheDocument();
  });

  // ============================================
  // ARCHITECTURE PATTERNS
  // ============================================

  it('should display architecture patterns section', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText('🏗️ Architecture Patterns')).toBeInTheDocument();
  });

  it('should display selected archetypes', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText('REST API')).toBeInTheDocument();
    expect(screen.getByText('Next.js Frontend')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
  });

  // ============================================
  // EXECUTION PLAN
  // ============================================

  it('should display execution plan section', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText('📅 Execution Plan')).toBeInTheDocument();
  });

  it('should display total estimated time', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert - 480 min = 8 hours
    expect(screen.getByText(/Total: 480 min/)).toBeInTheDocument();
    expect(screen.getByText(/~8 hours/)).toBeInTheDocument();
  });

  it('should display all phases', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  it('should display phase details', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText('2 tasks • 60 min')).toBeInTheDocument();
    expect(screen.getByText('3 tasks • 180 min')).toBeInTheDocument();
    expect(screen.getByText('2 tasks • 240 min')).toBeInTheDocument();
  });

  // ============================================
  // WHAT HAPPENS NEXT
  // ============================================

  it('should display what happens next section', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText('🚀 What happens when you click Start?')).toBeInTheDocument();
  });

  it('should list execution steps', () => {
    // Arrange & Act
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Assert
    expect(screen.getByText(/create a new Git repository/i)).toBeInTheDocument();
    expect(screen.getByText(/Generate code for each task/i)).toBeInTheDocument();
    expect(screen.getByText(/Run quality gates/i)).toBeInTheDocument();
    expect(screen.getByText(/Commit each task/i)).toBeInTheDocument();
  });

  // ============================================
  // NAVIGATION
  // ============================================

  it('should call onBack when Back button is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /back to plan/i }));

    // Assert
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  // ============================================
  // START EXECUTION
  // ============================================

  it('should call projectsApi.create when Start is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /start execution/i }));

    // Assert
    await waitFor(() => {
      expect(projectsApi.create).toHaveBeenCalledWith(
        'E-commerce Platform',
        'A modern e-commerce platform with payment integration'
      );
    });
  });

  it('should call executionApi.start with plan ID when Start is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /start execution/i }));

    // Assert
    await waitFor(() => {
      expect(executionApi.start).toHaveBeenCalledWith('plan-123');
    });
  });

  it('should call onStartExecution with project and plan IDs on success', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /start execution/i }));

    // Assert
    await waitFor(() => {
      expect(defaultProps.onStartExecution).toHaveBeenCalledWith('project-456', 'plan-123');
    });
  });

  // ============================================
  // LOADING STATE
  // ============================================

  it('should show loading state when starting', async () => {
    // Arrange
    const user = userEvent.setup();
    (projectsApi.create as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ _id: 'project-456' }), 100))
    );
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /start execution/i }));

    // Assert
    expect(screen.getByText('Starting Engine...')).toBeInTheDocument();
  });

  it('should disable buttons during loading', async () => {
    // Arrange
    const user = userEvent.setup();
    (projectsApi.create as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ _id: 'project-456' }), 100))
    );
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /start execution/i }));

    // Assert
    expect(screen.getByRole('button', { name: /starting engine/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /back to plan/i })).toBeDisabled();
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  it('should display error message when project creation fails', async () => {
    // Arrange
    const user = userEvent.setup();
    (projectsApi.create as jest.Mock).mockRejectedValue(new Error('Network error'));
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /start execution/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should display error message when execution start fails', async () => {
    // Arrange
    const user = userEvent.setup();
    (executionApi.start as jest.Mock).mockRejectedValue(new Error('Execution failed'));
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /start execution/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText('Execution failed')).toBeInTheDocument();
    });
  });

  it('should show default error message when error has no message', async () => {
    // Arrange
    const user = userEvent.setup();
    (projectsApi.create as jest.Mock).mockRejectedValue({});
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /start execution/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Failed to start execution. Please try again.')).toBeInTheDocument();
    });
  });

  it('should re-enable buttons after error', async () => {
    // Arrange
    const user = userEvent.setup();
    (projectsApi.create as jest.Mock).mockRejectedValue(new Error('Error'));
    render(<Stage4ExecutionPreview {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /start execution/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start execution/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /back to plan/i })).toBeEnabled();
    });
  });

  // ============================================
  // EDIT MODE (PlanEditor Integration)
  // ============================================

  describe('Edit mode', () => {
    it('should show "Edit Plan" button', () => {
      render(<Stage4ExecutionPreview {...defaultProps} />);

      expect(screen.getByRole('button', { name: /editar plan/i })).toBeInTheDocument();
    });

    it('should switch to edit mode when "Edit Plan" is clicked', async () => {
      const user = userEvent.setup();
      render(<Stage4ExecutionPreview {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /editar plan/i }));

      // Should show PlanEditor component (has save button)
      expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
    });

    it('should hide preview content in edit mode', async () => {
      const user = userEvent.setup();
      render(<Stage4ExecutionPreview {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /editar plan/i }));

      // What happens next section should be hidden in edit mode
      expect(screen.queryByText(/what happens when you click start/i)).not.toBeInTheDocument();
    });

    it('should show "Back to Preview" button in edit mode', async () => {
      const user = userEvent.setup();
      render(<Stage4ExecutionPreview {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /editar plan/i }));

      expect(screen.getByRole('button', { name: /volver a vista previa/i })).toBeInTheDocument();
    });

    it('should return to preview mode when "Back to Preview" is clicked', async () => {
      const user = userEvent.setup();
      render(<Stage4ExecutionPreview {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /editar plan/i }));
      await user.click(screen.getByRole('button', { name: /volver a vista previa/i }));

      expect(screen.getByRole('button', { name: /editar plan/i })).toBeInTheDocument();
    });

    it('should update plan when saved in edit mode', async () => {
      const user = userEvent.setup();
      render(<Stage4ExecutionPreview {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /editar plan/i }));
      await user.click(screen.getByRole('button', { name: /guardar/i }));

      // Should return to preview mode after saving
      expect(screen.getByRole('button', { name: /editar plan/i })).toBeInTheDocument();
    });

    it('should not show edit button when no plan exists', () => {
      const wizardDataNoPlan = {
        ...mockWizardData,
        stage3: { selectedArchetypes: ['REST API'], plan: undefined },
      };

      render(<Stage4ExecutionPreview {...defaultProps} wizardData={wizardDataNoPlan} />);

      expect(screen.queryByRole('button', { name: /editar plan/i })).not.toBeInTheDocument();
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle missing stage1 gracefully', () => {
    // Arrange
    const wizardDataNoStage1 = {
      ...mockWizardData,
      stage1: undefined,
    };

    // Act
    render(<Stage4ExecutionPreview {...defaultProps} wizardData={wizardDataNoStage1} />);

    // Assert - should render without crashing
    expect(screen.getByText('Stage 4: Ready to Execute')).toBeInTheDocument();
  });

  it('should handle missing stage2 gracefully', () => {
    // Arrange
    const wizardDataNoStage2 = {
      ...mockWizardData,
      stage2: undefined,
    };

    // Act
    render(<Stage4ExecutionPreview {...defaultProps} wizardData={wizardDataNoStage2} />);

    // Assert - should render without crashing
    expect(screen.getByText('📋 Business Requirements')).toBeInTheDocument();
  });

  it('should handle missing plan gracefully', () => {
    // Arrange
    const wizardDataNoPlan = {
      ...mockWizardData,
      stage3: { selectedArchetypes: ['REST API'], plan: undefined },
    };

    // Act
    render(<Stage4ExecutionPreview {...defaultProps} wizardData={wizardDataNoPlan} />);

    // Assert - should render without the execution plan section
    expect(screen.queryByText('📅 Execution Plan')).not.toBeInTheDocument();
  });

  it('should not call APIs when stage1 or plan is missing', async () => {
    // Arrange
    const user = userEvent.setup();
    const wizardDataNoStage1 = {
      ...mockWizardData,
      stage1: undefined,
    };
    render(<Stage4ExecutionPreview {...defaultProps} wizardData={wizardDataNoStage1} />);

    // Act
    await user.click(screen.getByRole('button', { name: /start execution/i }));

    // Assert
    expect(projectsApi.create).not.toHaveBeenCalled();
    expect(executionApi.start).not.toHaveBeenCalled();
  });
});
