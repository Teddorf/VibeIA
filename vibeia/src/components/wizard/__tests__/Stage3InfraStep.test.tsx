import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Stage3InfraStep } from '../Stage3InfraStep';
import { recommendationsApi } from '@/lib/api-client';

// Mock the API
jest.mock('@/lib/api-client', () => ({
  recommendationsApi: {
    getDatabaseProviders: jest.fn(),
    getDeployProviders: jest.fn(),
    getDatabaseRecommendation: jest.fn(),
    getDeployRecommendation: jest.fn(),
    calculateCost: jest.fn(),
  },
}));

const mockDatabaseProviders = [
  {
    id: 'neon',
    name: 'Neon',
    type: 'PostgreSQL Serverless',
    description: 'Serverless Postgres with branching',
    pros: ['Free tier generous', 'Database branching', 'Serverless'],
    cons: ['Newer platform', 'Cold starts'],
    pricing: { free: '$0', starter: '$19/mo', pro: '$69/mo' },
    recommended: true,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    type: 'PostgreSQL + BaaS',
    description: 'Open source Firebase alternative',
    pros: ['Auth included', 'Real-time', 'Storage'],
    cons: ['Can be complex', 'Egress costs'],
    pricing: { free: '$0', starter: '$25/mo', pro: '$599/mo' },
    recommended: false,
  },
  {
    id: 'planetscale',
    name: 'PlanetScale',
    type: 'MySQL Serverless',
    description: 'Serverless MySQL with branching',
    pros: ['Database branching', 'Vitess based', 'Good DX'],
    cons: ['MySQL only', 'No foreign keys'],
    pricing: { free: '$0', starter: '$29/mo', pro: '$99/mo' },
    recommended: false,
  },
];

const mockDeployProviders = [
  {
    id: 'vercel',
    name: 'Vercel',
    type: 'Frontend + Serverless',
    description: 'Best for Next.js apps',
    pros: ['Zero config', 'Preview deployments', 'Edge functions'],
    cons: ['Vendor lock-in', 'Can be expensive'],
    pricing: { free: '$0', pro: '$20/mo', enterprise: 'Custom' },
    recommended: true,
  },
  {
    id: 'railway',
    name: 'Railway',
    type: 'Full Stack PaaS',
    description: 'Simple deployment for any stack',
    pros: ['Simple pricing', 'Good for backend', 'Docker support'],
    cons: ['Smaller community', 'Limited edge'],
    pricing: { free: '$5 credit', pro: '$20/mo', enterprise: 'Custom' },
    recommended: false,
  },
  {
    id: 'render',
    name: 'Render',
    type: 'Full Stack PaaS',
    description: 'Unified cloud for all services',
    pros: ['Simple', 'Good free tier', 'Native Docker'],
    cons: ['Slower builds', 'Cold starts on free'],
    pricing: { free: '$0', starter: '$7/mo', pro: '$25/mo' },
    recommended: false,
  },
];

const mockCostEstimate = {
  monthly: {
    database: 0,
    deploy: 0,
    total: 0,
  },
  phases: {
    mvp: { monthly: 0, database: 0, deploy: 0 },
    growth: { monthly: 45, database: 19, deploy: 26 },
    scale: { monthly: 150, database: 69, deploy: 81 },
  },
  savingsVsAWS: 65,
};

describe('Stage3InfraStep', () => {
  const mockProjectContext = {
    projectName: 'My SaaS',
    description: 'A SaaS application for project management',
    techStack: ['nextjs', 'nestjs', 'postgresql'],
    scale: 'medium',
    stage2Data: {
      target_users: 'Small businesses',
      main_features: 'Project tracking, Team collaboration',
      scalability: '1000-10000',
    },
  };

  const defaultProps = {
    context: mockProjectContext,
    onNext: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    (recommendationsApi.getDatabaseProviders as jest.Mock).mockResolvedValue(mockDatabaseProviders);
    (recommendationsApi.getDeployProviders as jest.Mock).mockResolvedValue(mockDeployProviders);
    (recommendationsApi.calculateCost as jest.Mock).mockResolvedValue(mockCostEstimate);
  });

  // ============================================
  // RENDERING
  // ============================================
  describe('Renderizado', () => {
    it('should render database recommendations section', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('database-section')).toBeInTheDocument();
      });
    });

    it('should render deploy platform recommendations section', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('deploy-section')).toBeInTheDocument();
      });
    });

    it('should render cost estimation section', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Estimaci[oó]n de Costos/i)).toBeInTheDocument();
      });
    });

    it('should show recommended badge on recommended options', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        const recommendedBadges = screen.getAllByText(/Recomendado/i);
        expect(recommendedBadges.length).toBeGreaterThan(0);
      });
    });

    it('should render navigation buttons', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /atr[aá]s/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
      });
    });

    it('should show stage title', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Infraestructura/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // DATABASE SELECTION
  // ============================================
  describe('Seleccion de base de datos', () => {
    it('should render all database provider options', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('db-option-neon')).toBeInTheDocument();
        expect(screen.getByTestId('db-option-supabase')).toBeInTheDocument();
        expect(screen.getByTestId('db-option-planetscale')).toBeInTheDocument();
      });
    });

    it('should allow selecting a database provider', async () => {
      const user = userEvent.setup();
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('db-option-neon')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('db-option-neon'));

      expect(screen.getByTestId('db-option-neon')).toHaveClass('selected');
    });

    it('should pre-select recommended database by default', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('db-option-neon')).toHaveClass('selected');
      });
    });

    it('should deselect previous option when new one is selected', async () => {
      const user = userEvent.setup();
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('db-option-neon')).toBeInTheDocument();
      });

      // Initially Neon is selected (recommended)
      expect(screen.getByTestId('db-option-neon')).toHaveClass('selected');

      // Select Supabase
      await user.click(screen.getByTestId('db-option-supabase'));

      expect(screen.getByTestId('db-option-supabase')).toHaveClass('selected');
      expect(screen.getByTestId('db-option-neon')).not.toHaveClass('selected');
    });

    it('should show database provider details (pros, cons, pricing)', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Neon')).toBeInTheDocument();
      });

      // Check that provider details are shown
      expect(screen.getByText(/PostgreSQL Serverless/i)).toBeInTheDocument();
      expect(screen.getByText(/Free tier generous/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // DEPLOY SELECTION
  // ============================================
  describe('Seleccion de deploy platform', () => {
    it('should render all deploy provider options', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('deploy-option-vercel')).toBeInTheDocument();
        expect(screen.getByTestId('deploy-option-railway')).toBeInTheDocument();
        expect(screen.getByTestId('deploy-option-render')).toBeInTheDocument();
      });
    });

    it('should allow selecting a deploy platform', async () => {
      const user = userEvent.setup();
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('deploy-option-vercel')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('deploy-option-vercel'));

      expect(screen.getByTestId('deploy-option-vercel')).toHaveClass('selected');
    });

    it('should pre-select recommended deploy platform by default', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('deploy-option-vercel')).toHaveClass('selected');
      });
    });

    it('should show deploy provider details', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Vercel')).toBeInTheDocument();
      });

      expect(screen.getByText(/Frontend \+ Serverless/i)).toBeInTheDocument();
      expect(screen.getByText(/Zero config/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // COST ESTIMATION
  // ============================================
  describe('Estimacion de costos', () => {
    it('should show monthly cost estimate', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('monthly-cost')).toBeInTheDocument();
      });
    });

    it('should update cost estimation when database selection changes', async () => {
      const user = userEvent.setup();
      const updatedCost = {
        ...mockCostEstimate,
        phases: {
          ...mockCostEstimate.phases,
          growth: { monthly: 70, database: 25, deploy: 45 },
        },
      };

      // Mock: first for initial load, then for useEffect on selection, then for user click
      (recommendationsApi.calculateCost as jest.Mock)
        .mockResolvedValueOnce(mockCostEstimate) // Initial load in fetchProviders
        .mockResolvedValueOnce(mockCostEstimate) // useEffect after pre-selection
        .mockResolvedValueOnce(updatedCost); // After user clicks different option

      render(<Stage3InfraStep {...defaultProps} />);

      // Wait for initial cost to be displayed
      await waitFor(() => {
        expect(screen.getByTestId('monthly-cost')).toHaveTextContent('$45');
      });

      // Click a different database option
      await user.click(screen.getByTestId('db-option-supabase'));

      // Wait for cost to update to the new value
      await waitFor(() => {
        expect(screen.getByTestId('monthly-cost')).toHaveTextContent('$70');
      });
    });

    it('should show cost breakdown by phase (MVP, Growth, Scale)', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      // Wait for providers to load first
      await waitFor(() => {
        expect(screen.getByTestId('db-option-neon')).toBeInTheDocument();
      });

      // Then wait for cost section to appear
      await waitFor(() => {
        expect(screen.getByTestId('monthly-cost')).toBeInTheDocument();
      });

      // Verify phase labels are present - use exact text match to avoid matching "PlanetScale"
      expect(screen.getByText('MVP')).toBeInTheDocument();
      expect(screen.getByText('Growth')).toBeInTheDocument();
      expect(screen.getByText('Scale')).toBeInTheDocument();
    });

    it('should show savings comparison vs AWS', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/65%/)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // AUTO-DETECT OPTION
  // ============================================
  describe('Skip opcional / Auto-detectar', () => {
    it('should show "Auto-detectar" option', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /auto-detectar/i })).toBeInTheDocument();
      });
    });

    it('should call onNext with autoDetect flag when clicked', async () => {
      const onNext = jest.fn();
      const user = userEvent.setup();
      render(<Stage3InfraStep {...defaultProps} onNext={onNext} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /auto-detectar/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /auto-detectar/i }));

      expect(onNext).toHaveBeenCalledWith({ autoDetect: true });
    });

    it('should show explanation text for auto-detect', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/detectar[aá]? autom[aá]ticamente/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // API INTEGRATION
  // ============================================
  describe('Integracion con API', () => {
    it('should fetch database providers from API on mount', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(recommendationsApi.getDatabaseProviders).toHaveBeenCalled();
      });
    });

    it('should fetch deploy providers from API on mount', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(recommendationsApi.getDeployProviders).toHaveBeenCalled();
      });
    });

    it('should show loading state while fetching', () => {
      // Make API never resolve to test loading state
      (recommendationsApi.getDatabaseProviders as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );
      (recommendationsApi.getDeployProviders as jest.Mock).mockImplementation(
        () => new Promise(() => {}),
      );

      render(<Stage3InfraStep {...defaultProps} />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should show error state when API fails', async () => {
      (recommendationsApi.getDatabaseProviders as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should allow retry when API fails', async () => {
      const user = userEvent.setup();
      (recommendationsApi.getDatabaseProviders as jest.Mock)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockDatabaseProviders);

      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /reintentar/i }));

      await waitFor(() => {
        expect(screen.getByTestId('db-option-neon')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // NAVIGATION
  // ============================================
  describe('Navegacion', () => {
    it('should call onBack when Back button is clicked', async () => {
      const user = userEvent.setup();
      const onBack = jest.fn();
      render(<Stage3InfraStep {...defaultProps} onBack={onBack} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /atr[aá]s/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /atr[aá]s/i }));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should call onNext with selected options when Next is clicked', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      render(<Stage3InfraStep {...defaultProps} onNext={onNext} />);

      await waitFor(() => {
        expect(screen.getByTestId('db-option-neon')).toBeInTheDocument();
      });

      // Select options (they're already pre-selected as recommended)
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(onNext).toHaveBeenCalledWith(
        expect.objectContaining({
          database: expect.objectContaining({ id: 'neon' }),
          deploy: expect.objectContaining({ id: 'vercel' }),
          autoDetect: false,
        }),
      );
    });

    it('should include cost estimation in onNext data', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      render(<Stage3InfraStep {...defaultProps} onNext={onNext} />);

      await waitFor(() => {
        expect(screen.getByTestId('db-option-neon')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(onNext).toHaveBeenCalledWith(
        expect.objectContaining({
          costEstimate: expect.any(Object),
        }),
      );
    });
  });

  // ============================================
  // RESPONSIVE DESIGN
  // ============================================
  describe('Diseno responsivo', () => {
    it('should render provider cards in grid layout', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        const dbSection = screen.getByTestId('database-section');
        expect(dbSection).toHaveClass('grid');
      });
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================
  describe('Accesibilidad', () => {
    it('should have proper ARIA labels on provider options', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        const neonOption = screen.getByTestId('db-option-neon');
        expect(neonOption).toHaveAttribute('aria-selected');
      });
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('db-option-neon')).toBeInTheDocument();
      });

      // Focus on specific option
      const supabaseOption = screen.getByTestId('db-option-supabase');
      supabaseOption.focus();

      // Should be able to select with Enter
      await user.keyboard('{Enter}');

      expect(screen.getByTestId('db-option-supabase')).toHaveClass('selected');
    });

    it('should announce selection changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('db-option-neon')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('db-option-supabase'));

      // Check for aria-live region
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('Casos limite', () => {
    it('should handle empty providers list gracefully', async () => {
      (recommendationsApi.getDatabaseProviders as jest.Mock).mockResolvedValue([]);
      (recommendationsApi.getDeployProviders as jest.Mock).mockResolvedValue([]);

      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/no hay proveedores disponibles/i)).toBeInTheDocument();
      });
    });

    it('should disable Next button when no selections made', async () => {
      // Return providers without any marked as recommended
      (recommendationsApi.getDatabaseProviders as jest.Mock).mockResolvedValue(
        mockDatabaseProviders.map((p) => ({ ...p, recommended: false })),
      );
      (recommendationsApi.getDeployProviders as jest.Mock).mockResolvedValue(
        mockDeployProviders.map((p) => ({ ...p, recommended: false })),
      );

      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
      });
    });

    it('should maintain selection after user interaction', async () => {
      const user = userEvent.setup();
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('db-option-supabase')).toBeInTheDocument();
      });

      // Click to select supabase
      await user.click(screen.getByTestId('db-option-supabase'));

      // Verify it's selected
      expect(screen.getByTestId('db-option-supabase')).toHaveClass('selected');
      expect(screen.getByTestId('db-option-neon')).not.toHaveClass('selected');

      // Interact with deploy section - selection should persist
      await user.click(screen.getByTestId('deploy-option-railway'));

      // Database selection should still be supabase
      expect(screen.getByTestId('db-option-supabase')).toHaveClass('selected');
    });
  });

  // ============================================
  // COMPARISON VIEW
  // ============================================
  describe('Vista de comparacion', () => {
    it('should have toggle for comparison view', async () => {
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /comparar/i })).toBeInTheDocument();
      });
    });

    it('should show detailed comparison table when toggled', async () => {
      const user = userEvent.setup();
      render(<Stage3InfraStep {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /comparar/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /comparar/i }));

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });
  });
});
