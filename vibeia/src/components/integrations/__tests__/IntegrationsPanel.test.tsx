/**
 * IntegrationsPanel Component Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntegrationsPanel, Integration } from '../IntegrationsPanel';
import { integrationsApi } from '@/lib/api-client';

// Mock API client
jest.mock('@/lib/api-client', () => ({
  integrationsApi: {
    getIntegrations: jest.fn(),
    connectIntegration: jest.fn(),
    disconnectIntegration: jest.fn(),
    refreshIntegration: jest.fn(),
    testConnection: jest.fn(),
  },
}));

const mockIntegrations: Integration[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Conecta tus repositorios de GitHub',
    icon: 'github',
    category: 'git',
    status: 'connected',
    connectedAt: new Date('2024-01-10'),
    accountInfo: { username: 'testuser', email: 'test@github.com' },
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy automático a Vercel',
    icon: 'vercel',
    category: 'deploy',
    status: 'disconnected',
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Base de datos PostgreSQL serverless',
    icon: 'neon',
    category: 'database',
    status: 'connected',
    connectedAt: new Date('2024-01-05'),
    accountInfo: { email: 'test@neon.tech' },
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Integración con GPT-4',
    icon: 'openai',
    category: 'ai',
    status: 'error',
    error: 'API key expired',
  },
];

describe('IntegrationsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (integrationsApi.getIntegrations as jest.Mock).mockResolvedValue(mockIntegrations);
  });

  // RENDERING TESTS
  describe('Rendering', () => {
    it('should render integrations panel', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('integrations-panel')).toBeInTheDocument();
      });
    });

    it('should render panel title', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/integraciones/i)).toBeInTheDocument();
      });
    });

    it('should show loading state initially', async () => {
      // Arrange - make the mock take some time
      (integrationsApi.getIntegrations as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockIntegrations), 100))
      );

      // Act
      render(<IntegrationsPanel />);

      // Assert - check loading state immediately (multiple skeletons are rendered)
      expect(screen.getAllByTestId('loading-skeleton').length).toBeGreaterThan(0);

      // Wait for loading to complete to avoid act warnings
      await waitFor(() => {
        expect(screen.queryAllByTestId('loading-skeleton')).toHaveLength(0);
      });
    });

    it('should render all integrations after loading', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('GitHub')).toBeInTheDocument();
        expect(screen.getByText('Vercel')).toBeInTheDocument();
        expect(screen.getByText('Neon')).toBeInTheDocument();
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
      });
    });

    it('should render integration descriptions', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/repositorios de GitHub/)).toBeInTheDocument();
      });
    });
  });

  // CATEGORY FILTERING TESTS
  describe('Category Filtering', () => {
    it('should render category filters', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /todos/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /git/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /deploy/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /database/i })).toBeInTheDocument();
      });
    });

    it('should filter integrations by category', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<IntegrationsPanel />);
      await waitFor(() => screen.getByText('GitHub'));

      // Act
      await user.click(screen.getByRole('button', { name: /git/i }));

      // Assert
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.queryByText('Vercel')).not.toBeInTheDocument();
      expect(screen.queryByText('Neon')).not.toBeInTheDocument();
    });

    it('should show all integrations when "Todos" is selected', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<IntegrationsPanel />);
      await waitFor(() => screen.getByText('GitHub'));

      // Act - first filter by git
      await user.click(screen.getByRole('button', { name: /git/i }));
      // Then click "Todos"
      await user.click(screen.getByRole('button', { name: /todos/i }));

      // Assert
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Vercel')).toBeInTheDocument();
      expect(screen.getByText('Neon')).toBeInTheDocument();
    });
  });

  // STATUS INDICATOR TESTS
  describe('Status Indicators', () => {
    it('should show connected status for connected integrations', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        const githubCard = screen.getByTestId('integration-card-github');
        expect(githubCard).toHaveAttribute('data-status', 'connected');
      });
    });

    it('should show disconnected status for disconnected integrations', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        const vercelCard = screen.getByTestId('integration-card-vercel');
        expect(vercelCard).toHaveAttribute('data-status', 'disconnected');
      });
    });

    it('should show error status for integrations with errors', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        const openaiCard = screen.getByTestId('integration-card-openai');
        expect(openaiCard).toHaveAttribute('data-status', 'error');
      });
    });

    it('should display error message for failed integrations', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/API key expired/)).toBeInTheDocument();
      });
    });
  });

  // CONNECTION TESTS
  describe('Connect Integration', () => {
    it('should show connect button for disconnected integrations', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        const vercelCard = screen.getByTestId('integration-card-vercel');
        expect(within(vercelCard).getByRole('button', { name: /conectar/i })).toBeInTheDocument();
      });
    });

    it('should call connectIntegration when connect button clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      (integrationsApi.connectIntegration as jest.Mock).mockResolvedValue({ success: true });
      render(<IntegrationsPanel />);
      await waitFor(() => screen.getByText('Vercel'));

      // Act
      const vercelCard = screen.getByTestId('integration-card-vercel');
      await user.click(within(vercelCard).getByRole('button', { name: /conectar/i }));

      // Assert
      expect(integrationsApi.connectIntegration).toHaveBeenCalledWith('vercel');
    });

    it('should show loading state while connecting', async () => {
      // Arrange
      const user = userEvent.setup();
      (integrationsApi.connectIntegration as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<IntegrationsPanel />);
      await waitFor(() => screen.getByText('Vercel'));

      // Act
      const vercelCard = screen.getByTestId('integration-card-vercel');
      await user.click(within(vercelCard).getByRole('button', { name: /conectar/i }));

      // Assert
      expect(within(vercelCard).getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  // DISCONNECT TESTS
  describe('Disconnect Integration', () => {
    it('should show disconnect button for connected integrations', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        const githubCard = screen.getByTestId('integration-card-github');
        expect(within(githubCard).getByRole('button', { name: /desconectar/i })).toBeInTheDocument();
      });
    });

    it('should show confirmation modal before disconnecting', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<IntegrationsPanel />);
      await waitFor(() => screen.getByText('GitHub'));

      // Act
      const githubCard = screen.getByTestId('integration-card-github');
      await user.click(within(githubCard).getByRole('button', { name: /desconectar/i }));

      // Assert
      expect(screen.getByTestId('confirm-disconnect-modal')).toBeInTheDocument();
    });

    it('should call disconnectIntegration after confirmation', async () => {
      // Arrange
      const user = userEvent.setup();
      (integrationsApi.disconnectIntegration as jest.Mock).mockResolvedValue({ success: true });
      render(<IntegrationsPanel />);
      await waitFor(() => screen.getByText('GitHub'));

      // Act
      const githubCard = screen.getByTestId('integration-card-github');
      await user.click(within(githubCard).getByRole('button', { name: /desconectar/i }));
      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      // Assert
      expect(integrationsApi.disconnectIntegration).toHaveBeenCalledWith('github');
    });
  });

  // ACCOUNT INFO TESTS
  describe('Account Information', () => {
    it('should display account info for connected integrations', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });
    });

    it('should display connected date for connected integrations', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        // Should show "Conectado" with date
        const githubCard = screen.getByTestId('integration-card-github');
        expect(within(githubCard).getByText(/conectado/i)).toBeInTheDocument();
      });
    });
  });

  // REFRESH TESTS
  describe('Refresh Integration', () => {
    it('should show refresh button for connected integrations', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        const githubCard = screen.getByTestId('integration-card-github');
        expect(within(githubCard).getByRole('button', { name: /actualizar/i })).toBeInTheDocument();
      });
    });

    it('should call refreshIntegration when refresh clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      (integrationsApi.refreshIntegration as jest.Mock).mockResolvedValue({ success: true });
      render(<IntegrationsPanel />);
      await waitFor(() => screen.getByText('GitHub'));

      // Act
      const githubCard = screen.getByTestId('integration-card-github');
      await user.click(within(githubCard).getByRole('button', { name: /actualizar/i }));

      // Assert
      expect(integrationsApi.refreshIntegration).toHaveBeenCalledWith('github');
    });
  });

  // TEST CONNECTION TESTS
  describe('Test Connection', () => {
    it('should show test connection button for connected integrations', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        const githubCard = screen.getByTestId('integration-card-github');
        expect(within(githubCard).getByRole('button', { name: /probar/i })).toBeInTheDocument();
      });
    });

    it('should call testConnection and show success', async () => {
      // Arrange
      const user = userEvent.setup();
      (integrationsApi.testConnection as jest.Mock).mockResolvedValue({ success: true });
      render(<IntegrationsPanel />);
      await waitFor(() => screen.getByText('GitHub'));

      // Act
      const githubCard = screen.getByTestId('integration-card-github');
      await user.click(within(githubCard).getByRole('button', { name: /probar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/conexión exitosa/i)).toBeInTheDocument();
      });
    });

    it('should show error when test connection fails', async () => {
      // Arrange
      const user = userEvent.setup();
      (integrationsApi.testConnection as jest.Mock).mockRejectedValue(new Error('Connection failed'));
      render(<IntegrationsPanel />);
      await waitFor(() => screen.getByText('GitHub'));

      // Act
      const githubCard = screen.getByTestId('integration-card-github');
      await user.click(within(githubCard).getByRole('button', { name: /probar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/error de conexión/i)).toBeInTheDocument();
      });
    });
  });

  // EMPTY STATE TESTS
  describe('Empty State', () => {
    it('should show empty state when no integrations', async () => {
      // Arrange
      (integrationsApi.getIntegrations as jest.Mock).mockResolvedValue([]);

      // Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('empty-integrations')).toBeInTheDocument();
      });
    });
  });

  // ERROR STATE TESTS
  describe('Error State', () => {
    it('should show error state when fetch fails', async () => {
      // Arrange
      (integrationsApi.getIntegrations as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      // Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/error al cargar/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      // Arrange
      (integrationsApi.getIntegrations as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      // Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
      });
    });
  });

  // SEARCH TESTS
  describe('Search', () => {
    it('should render search input', async () => {
      // Arrange & Act
      render(<IntegrationsPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/buscar integración/i)).toBeInTheDocument();
      });
    });

    it('should filter integrations by search term', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<IntegrationsPanel />);
      await waitFor(() => screen.getByText('GitHub'));

      // Act
      await user.type(screen.getByPlaceholderText(/buscar/i), 'git');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('GitHub')).toBeInTheDocument();
        expect(screen.queryByText('Vercel')).not.toBeInTheDocument();
      });
    });
  });
});
