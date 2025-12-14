import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InfraRecommendations } from '../InfraRecommendations';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  recommendationsApi: {
    getDatabaseRecommendation: jest.fn(),
    getDeployRecommendation: jest.fn(),
    calculateCost: jest.fn(),
  },
}));

import { recommendationsApi } from '@/lib/api-client';

const mockRecommendationsApi = recommendationsApi as jest.Mocked<typeof recommendationsApi>;

describe('InfraRecommendations', () => {
  const defaultProps = {
    wizardData: {
      stage1: { projectName: 'Test Project', description: 'Test Description' },
      stage2: { target_users: 'Developers' },
    },
    onRecommendationsComplete: jest.fn(),
  };

  const mockDbRecommendation = {
    primary: {
      id: 'neon',
      name: 'Neon',
      type: 'PostgreSQL',
      score: 92,
      pros: ['Serverless', 'Branching', 'Auto-scale'],
      cons: ['Limited free tier'],
      hasBranching: true,
      pricing: {
        free: { storage: '512MB', compute: '100hrs', price: '$0' },
        starter: { storage: '10GB', compute: 'Unlimited', price: '$19' },
        pro: { storage: '50GB', compute: 'Unlimited', price: '$69' },
      },
    },
    alternatives: [],
    reasoning: ['Best for PostgreSQL with branching'],
    estimatedMonthlyCost: 19,
  };

  const mockDeployRecommendation = {
    architecture: {
      frontend: { id: 'vercel', name: 'Vercel', setupTime: '5min' },
      backend: { id: 'railway', name: 'Railway', setupTime: '10min' },
      database: 'Neon PostgreSQL',
      cache: 'Upstash Redis',
      diagram: 'mermaid diagram',
    },
    reasoning: ['Best for Next.js apps'],
    estimatedMonthlyCost: { mvp: 0, growth: 50, scale: 200 },
  };

  const mockCostProjection = {
    phases: [
      { name: 'MVP', duration: 3, totalMonthly: 20, totalForPhase: 60 },
      { name: 'Growth', duration: 6, totalMonthly: 100, totalForPhase: 600 },
      { name: 'Scale', duration: 12, totalMonthly: 500, totalForPhase: 6000 },
    ],
    year1Total: 1500,
    costPerUser: 0.05,
    recommendations: ['Consider reserved instances'],
    comparisonWithAWS: {
      managedPlatformsCost: 1500,
      awsCost: 3000,
      savings: 1500,
      savingsPercent: 50,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRecommendationsApi.getDatabaseRecommendation.mockResolvedValue(mockDbRecommendation);
    mockRecommendationsApi.getDeployRecommendation.mockResolvedValue(mockDeployRecommendation);
    mockRecommendationsApi.calculateCost.mockResolvedValue(mockCostProjection);
  });

  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render the component', () => {
    // Arrange & Act
    render(<InfraRecommendations {...defaultProps} />);

    // Assert
    expect(screen.getByText('Database Configuration')).toBeInTheDocument();
  });

  it('should render progress tabs', () => {
    // Arrange & Act
    render(<InfraRecommendations {...defaultProps} />);

    // Assert
    expect(screen.getByText('1. database')).toBeInTheDocument();
    expect(screen.getByText('2. deploy')).toBeInTheDocument();
    expect(screen.getByText('3. Cost Calculator')).toBeInTheDocument();
    expect(screen.getByText('4. summary')).toBeInTheDocument();
  });

  it('should start on database step', () => {
    // Arrange & Act
    render(<InfraRecommendations {...defaultProps} />);

    // Assert
    expect(screen.getByText('Database Configuration')).toBeInTheDocument();
    expect(screen.getByText('Get Database Recommendation')).toBeInTheDocument();
  });

  // ============================================
  // DATABASE STEP - FORM FIELDS
  // ============================================

  it('should render data type select', () => {
    // Arrange & Act
    render(<InfraRecommendations {...defaultProps} />);

    // Assert
    expect(screen.getByText('Data Type')).toBeInTheDocument();
    expect(screen.getByText('Relational (users, orders, products)')).toBeInTheDocument();
  });

  it('should render data volume select', () => {
    // Arrange & Act
    render(<InfraRecommendations {...defaultProps} />);

    // Assert
    expect(screen.getByText('Expected Data Volume')).toBeInTheDocument();
  });

  it('should render traffic select', () => {
    // Arrange & Act
    render(<InfraRecommendations {...defaultProps} />);

    // Assert
    expect(screen.getByText('Expected Traffic')).toBeInTheDocument();
  });

  it('should render budget select', () => {
    // Arrange & Act
    render(<InfraRecommendations {...defaultProps} />);

    // Assert
    expect(screen.getByText('Monthly Budget')).toBeInTheDocument();
  });

  it('should render checkbox options', () => {
    // Arrange & Act
    render(<InfraRecommendations {...defaultProps} />);

    // Assert
    expect(screen.getByText(/Need database branching/)).toBeInTheDocument();
    expect(screen.getByText(/Need built-in authentication/)).toBeInTheDocument();
    expect(screen.getByText(/Need real-time subscriptions/)).toBeInTheDocument();
  });

  // ============================================
  // DATABASE STEP - FORM INTERACTIONS
  // ============================================

  it('should change data type value', () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    const select = screen.getAllByRole('combobox')[0];

    // Act
    fireEvent.change(select, { target: { value: 'document' } });

    // Assert
    expect(select).toHaveValue('document');
  });

  it('should toggle branching checkbox', () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /database branching/i });

    // Act - checkbox starts checked, uncheck it
    fireEvent.click(checkbox);

    // Assert
    expect(checkbox).not.toBeChecked();
  });

  // ============================================
  // DATABASE STEP - API CALL
  // ============================================

  it('should call API when Get Database Recommendation clicked', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);

    // Act
    fireEvent.click(screen.getByText('Get Database Recommendation'));

    // Assert
    await waitFor(() => {
      expect(mockRecommendationsApi.getDatabaseRecommendation).toHaveBeenCalled();
    });
  });

  it('should show loading state while getting database recommendation', async () => {
    // Arrange
    mockRecommendationsApi.getDatabaseRecommendation.mockImplementation(() => new Promise(() => {}));
    render(<InfraRecommendations {...defaultProps} />);

    // Act
    fireEvent.click(screen.getByText('Get Database Recommendation'));

    // Assert
    expect(screen.getByText('Getting Recommendations...')).toBeInTheDocument();
  });

  it('should navigate to deploy step after database recommendation', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);

    // Act
    fireEvent.click(screen.getByText('Get Database Recommendation'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Deployment Configuration')).toBeInTheDocument();
    });
  });

  // ============================================
  // DEPLOY STEP
  // ============================================

  it('should show database recommendation in deploy step', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Recommended Database: Neon')).toBeInTheDocument();
    });
  });

  it('should render deploy configuration form', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Infrastructure Complexity')).toBeInTheDocument();
      expect(screen.getByText('DevOps Experience')).toBeInTheDocument();
    });
  });

  it('should have back button in deploy step', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    });
  });

  it('should navigate back to database step when Back clicked', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => {
      expect(screen.getByText('Deployment Configuration')).toBeInTheDocument();
    });

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    // Assert
    expect(screen.getByText('Database Configuration')).toBeInTheDocument();
  });

  it('should call API when Get Deploy Recommendation clicked', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => {
      expect(screen.getByText('Deployment Configuration')).toBeInTheDocument();
    });

    // Act
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));

    // Assert
    await waitFor(() => {
      expect(mockRecommendationsApi.getDeployRecommendation).toHaveBeenCalled();
    });
  });

  // ============================================
  // COST STEP
  // ============================================

  it('should navigate to cost step after deploy recommendation', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => {
      expect(screen.getByText('Get Deploy Recommendation')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Cost Projection')).toBeInTheDocument();
    });
  });

  it('should show deploy recommendation in cost step', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => screen.getByText('Get Deploy Recommendation'));
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/Recommended Stack: Vercel \+ Railway/)).toBeInTheDocument();
    });
  });

  it('should render cost inputs', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => screen.getByText('Get Deploy Recommendation'));
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('MVP Users/Day')).toBeInTheDocument();
      expect(screen.getByText('Growth Users/Day')).toBeInTheDocument();
      expect(screen.getByText('Scale Users/Day')).toBeInTheDocument();
    });
  });

  it('should have number inputs for user counts', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => screen.getByText('Get Deploy Recommendation'));
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));

    // Assert
    await waitFor(() => {
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('should call API when Calculate Cost clicked', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => screen.getByText('Get Deploy Recommendation'));
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));
    await waitFor(() => screen.getByText('Calculate Cost Projection'));

    // Act
    fireEvent.click(screen.getByText('Calculate Cost Projection'));

    // Assert
    await waitFor(() => {
      expect(mockRecommendationsApi.calculateCost).toHaveBeenCalled();
    });
  });

  // ============================================
  // SUMMARY STEP
  // ============================================

  it('should navigate to summary step after cost calculation', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => screen.getByText('Get Deploy Recommendation'));
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));
    await waitFor(() => screen.getByText('Calculate Cost Projection'));
    fireEvent.click(screen.getByText('Calculate Cost Projection'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Infrastructure Summary')).toBeInTheDocument();
    });
  });

  it('should show database info in summary', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => screen.getByText('Get Deploy Recommendation'));
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));
    await waitFor(() => screen.getByText('Calculate Cost Projection'));
    fireEvent.click(screen.getByText('Calculate Cost Projection'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Database: Neon')).toBeInTheDocument();
    });
  });

  it('should show deployment architecture in summary', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => screen.getByText('Get Deploy Recommendation'));
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));
    await waitFor(() => screen.getByText('Calculate Cost Projection'));
    fireEvent.click(screen.getByText('Calculate Cost Projection'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Deployment Architecture')).toBeInTheDocument();
      expect(screen.getByText('Vercel')).toBeInTheDocument();
      expect(screen.getByText('Railway')).toBeInTheDocument();
    });
  });

  it('should show cost projection in summary', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => screen.getByText('Get Deploy Recommendation'));
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));
    await waitFor(() => screen.getByText('Calculate Cost Projection'));
    fireEvent.click(screen.getByText('Calculate Cost Projection'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Year 1 Total')).toBeInTheDocument();
      expect(screen.getByText('$1500')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  it('should show phase costs', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => screen.getByText('Get Deploy Recommendation'));
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));
    await waitFor(() => screen.getByText('Calculate Cost Projection'));
    fireEvent.click(screen.getByText('Calculate Cost Projection'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('MVP')).toBeInTheDocument();
      expect(screen.getByText('Growth')).toBeInTheDocument();
      expect(screen.getByText('Scale')).toBeInTheDocument();
    });
  });

  // ============================================
  // COMPLETION
  // ============================================

  it('should show Continue button in summary', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => screen.getByText('Get Deploy Recommendation'));
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));
    await waitFor(() => screen.getByText('Calculate Cost Projection'));
    fireEvent.click(screen.getByText('Calculate Cost Projection'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Continue to Plan Generation')).toBeInTheDocument();
    });
  });

  it('should call onRecommendationsComplete when Continue clicked', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => screen.getByText('Get Deploy Recommendation'));
    fireEvent.click(screen.getByText('Get Deploy Recommendation'));
    await waitFor(() => screen.getByText('Calculate Cost Projection'));
    fireEvent.click(screen.getByText('Calculate Cost Projection'));
    await waitFor(() => screen.getByText('Continue to Plan Generation'));

    // Act
    fireEvent.click(screen.getByText('Continue to Plan Generation'));

    // Assert
    expect(defaultProps.onRecommendationsComplete).toHaveBeenCalledWith({
      database: mockDbRecommendation,
      deploy: mockDeployRecommendation,
      cost: mockCostProjection,
    });
  });

  // ============================================
  // TAB NAVIGATION
  // ============================================

  it('should allow clicking on completed tabs', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Database Recommendation'));
    await waitFor(() => screen.getByText('Deployment Configuration'));

    // Act - click back on database tab
    fireEvent.click(screen.getByText('1. database'));

    // Assert
    expect(screen.getByText('Database Configuration')).toBeInTheDocument();
  });

  it('should not allow clicking on incomplete tabs', async () => {
    // Arrange
    render(<InfraRecommendations {...defaultProps} />);

    // Act - try to click on deploy tab before completing database
    fireEvent.click(screen.getByText('2. deploy'));

    // Assert - should still be on database step
    expect(screen.getByText('Database Configuration')).toBeInTheDocument();
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  it('should handle database API error gracefully', async () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRecommendationsApi.getDatabaseRecommendation.mockRejectedValue(new Error('API Error'));
    render(<InfraRecommendations {...defaultProps} />);

    // Act
    fireEvent.click(screen.getByText('Get Database Recommendation'));

    // Assert - should stay on database step
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get database recommendation:', expect.any(Error));
    });
    expect(screen.getByText('Database Configuration')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
