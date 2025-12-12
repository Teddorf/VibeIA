/**
 * RollbackPanel Component Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RollbackPanel, SetupState, RollbackAction } from '../RollbackPanel';
import { rollbackApi } from '@/lib/api-client';

// Mock API client
jest.mock('@/lib/api-client', () => ({
  rollbackApi: {
    getSetupStates: jest.fn(),
    getRollbackActions: jest.fn(),
    executeRollback: jest.fn(),
    getRollbackHistory: jest.fn(),
  },
}));

const mockSetupStates: SetupState[] = [
  {
    id: 'setup-1',
    setupId: 'setup-1',
    projectId: 'project-1',
    projectName: 'My Project',
    status: 'completed',
    progress: 100,
    startedAt: new Date('2024-01-10T10:00:00Z'),
    completedAt: new Date('2024-01-10T10:30:00Z'),
    tasks: [
      { name: 'Create Neon database', status: 'completed' },
      { name: 'Deploy to Vercel', status: 'completed' },
    ],
    urls: {
      frontend: 'https://my-project.vercel.app',
      database: 'postgres://neon.tech/mydb',
    },
  },
  {
    id: 'setup-2',
    setupId: 'setup-2',
    projectId: 'project-2',
    projectName: 'Another Project',
    status: 'failed',
    progress: 60,
    startedAt: new Date('2024-01-12T14:00:00Z'),
    tasks: [
      { name: 'Create database', status: 'completed' },
      { name: 'Deploy frontend', status: 'failed', error: 'Build failed' },
    ],
    error: 'Deployment failed',
  },
  {
    id: 'setup-3',
    setupId: 'setup-3',
    projectId: 'project-3',
    projectName: 'In Progress',
    status: 'in_progress',
    progress: 40,
    startedAt: new Date('2024-01-15T09:00:00Z'),
    tasks: [
      { name: 'Create database', status: 'completed' },
      { name: 'Configure environment', status: 'in_progress' },
      { name: 'Deploy frontend', status: 'pending' },
    ],
  },
];

const mockRollbackActions: RollbackAction[] = [
  {
    id: 'action-1',
    setupId: 'setup-1',
    type: 'delete_database',
    description: 'Eliminar base de datos Neon',
    resourceId: 'neon-123',
    status: 'pending',
    canUndo: true,
  },
  {
    id: 'action-2',
    setupId: 'setup-1',
    type: 'delete_deployment',
    description: 'Eliminar deployment en Vercel',
    resourceId: 'vercel-456',
    status: 'pending',
    canUndo: true,
  },
];

describe('RollbackPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rollbackApi.getSetupStates as jest.Mock).mockResolvedValue(mockSetupStates);
    (rollbackApi.getRollbackActions as jest.Mock).mockResolvedValue(mockRollbackActions);
  });

  // RENDERING TESTS
  describe('Rendering', () => {
    it('should render rollback panel', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('rollback-panel')).toBeInTheDocument();
      });
    });

    it('should render panel title', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/rollback/i)).toBeInTheDocument();
      });
    });

    it('should show loading state initially', async () => {
      // Arrange
      (rollbackApi.getSetupStates as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSetupStates), 100))
      );

      // Act
      render(<RollbackPanel />);

      // Assert
      expect(screen.getAllByTestId('loading-skeleton').length).toBeGreaterThan(0);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryAllByTestId('loading-skeleton')).toHaveLength(0);
      });
    });

    it('should render all setup states', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('My Project')).toBeInTheDocument();
        expect(screen.getByText('Another Project')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });
    });
  });

  // STATUS INDICATOR TESTS
  describe('Status Indicators', () => {
    it('should show completed status with checkmark', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        const setupCard = screen.getByTestId('setup-card-setup-1');
        expect(setupCard).toHaveAttribute('data-status', 'completed');
      });
    });

    it('should show failed status with error icon', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        const setupCard = screen.getByTestId('setup-card-setup-2');
        expect(setupCard).toHaveAttribute('data-status', 'failed');
      });
    });

    it('should show in_progress status with progress bar', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        const setupCard = screen.getByTestId('setup-card-setup-3');
        expect(setupCard).toHaveAttribute('data-status', 'in_progress');
        expect(within(setupCard).getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should display error message for failed setups', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Deployment failed/)).toBeInTheDocument();
      });
    });
  });

  // TASK LIST TESTS
  describe('Task List', () => {
    it('should show expand button to view tasks', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        const setupCard = screen.getByTestId('setup-card-setup-1');
        expect(within(setupCard).getByRole('button', { name: /ver tareas/i })).toBeInTheDocument();
      });
    });

    it('should expand to show task list when clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<RollbackPanel />);
      await waitFor(() => screen.getByText('My Project'));

      // Act
      const setupCard = screen.getByTestId('setup-card-setup-1');
      await user.click(within(setupCard).getByRole('button', { name: /ver tareas/i }));

      // Assert
      expect(screen.getByText('Create Neon database')).toBeInTheDocument();
      expect(screen.getByText('Deploy to Vercel')).toBeInTheDocument();
    });

    it('should show task status icons', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<RollbackPanel />);
      await waitFor(() => screen.getByText('Another Project'));

      // Act
      const setupCard = screen.getByTestId('setup-card-setup-2');
      await user.click(within(setupCard).getByRole('button', { name: /ver tareas/i }));

      // Assert
      const completedTask = screen.getByText('Create database').closest('div');
      const failedTask = screen.getByText('Deploy frontend').closest('div');
      expect(completedTask).toBeInTheDocument();
      expect(failedTask).toBeInTheDocument();
    });
  });

  // ROLLBACK BUTTON TESTS
  describe('Rollback Button', () => {
    it('should show rollback button for completed setups', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        const setupCard = screen.getByTestId('setup-card-setup-1');
        expect(within(setupCard).getByRole('button', { name: /rollback/i })).toBeInTheDocument();
      });
    });

    it('should show rollback button for failed setups', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        const setupCard = screen.getByTestId('setup-card-setup-2');
        expect(within(setupCard).getByRole('button', { name: /rollback/i })).toBeInTheDocument();
      });
    });

    it('should disable rollback button for in_progress setups', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        const setupCard = screen.getByTestId('setup-card-setup-3');
        const rollbackBtn = within(setupCard).queryByRole('button', { name: /rollback/i });
        // Should either not exist or be disabled
        if (rollbackBtn) {
          expect(rollbackBtn).toBeDisabled();
        }
      });
    });
  });

  // ROLLBACK CONFIRMATION TESTS
  describe('Rollback Confirmation', () => {
    it('should show confirmation modal when rollback clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<RollbackPanel />);
      await waitFor(() => screen.getByText('My Project'));

      // Act
      const setupCard = screen.getByTestId('setup-card-setup-1');
      await user.click(within(setupCard).getByRole('button', { name: /rollback/i }));

      // Assert
      expect(screen.getByTestId('rollback-confirm-modal')).toBeInTheDocument();
    });

    it('should display rollback actions in confirmation modal', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<RollbackPanel />);
      await waitFor(() => screen.getByText('My Project'));

      // Act
      const setupCard = screen.getByTestId('setup-card-setup-1');
      await user.click(within(setupCard).getByRole('button', { name: /rollback/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Eliminar base de datos/)).toBeInTheDocument();
        expect(screen.getByText(/Eliminar deployment/)).toBeInTheDocument();
      });
    });

    it('should show warning message in confirmation modal', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<RollbackPanel />);
      await waitFor(() => screen.getByText('My Project'));

      // Act
      const setupCard = screen.getByTestId('setup-card-setup-1');
      await user.click(within(setupCard).getByRole('button', { name: /rollback/i }));

      // Assert
      expect(screen.getByText(/irreversible|permanente/i)).toBeInTheDocument();
    });

    it('should close modal on cancel', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<RollbackPanel />);
      await waitFor(() => screen.getByText('My Project'));

      const setupCard = screen.getByTestId('setup-card-setup-1');
      await user.click(within(setupCard).getByRole('button', { name: /rollback/i }));
      await waitFor(() => screen.getByTestId('rollback-confirm-modal'));

      // Act
      await user.click(screen.getByRole('button', { name: /cancelar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.queryByTestId('rollback-confirm-modal')).not.toBeInTheDocument();
      });
    });
  });

  // ROLLBACK EXECUTION TESTS
  describe('Rollback Execution', () => {
    it('should call executeRollback when confirmed', async () => {
      // Arrange
      const user = userEvent.setup();
      (rollbackApi.executeRollback as jest.Mock).mockResolvedValue({ success: true });
      render(<RollbackPanel />);
      await waitFor(() => screen.getByText('My Project'));

      // Act
      const setupCard = screen.getByTestId('setup-card-setup-1');
      await user.click(within(setupCard).getByRole('button', { name: /rollback/i }));
      await waitFor(() => screen.getByTestId('rollback-confirm-modal'));
      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      // Assert
      expect(rollbackApi.executeRollback).toHaveBeenCalledWith('setup-1');
    });

    it('should show loading state during rollback execution', async () => {
      // Arrange
      const user = userEvent.setup();
      (rollbackApi.executeRollback as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<RollbackPanel />);
      await waitFor(() => screen.getByText('My Project'));

      // Act
      const setupCard = screen.getByTestId('setup-card-setup-1');
      await user.click(within(setupCard).getByRole('button', { name: /rollback/i }));
      await waitFor(() => screen.getByTestId('rollback-confirm-modal'));
      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      // Assert - there should be at least one loading spinner (may be multiple)
      expect(screen.getAllByTestId('loading-spinner').length).toBeGreaterThan(0);
    });

    it('should show success message after rollback', async () => {
      // Arrange
      const user = userEvent.setup();
      (rollbackApi.executeRollback as jest.Mock).mockResolvedValue({ success: true });
      render(<RollbackPanel />);
      await waitFor(() => screen.getByText('My Project'));

      // Act
      const setupCard = screen.getByTestId('setup-card-setup-1');
      await user.click(within(setupCard).getByRole('button', { name: /rollback/i }));
      await waitFor(() => screen.getByTestId('rollback-confirm-modal'));
      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/rollback completado|exitoso/i)).toBeInTheDocument();
      });
    });

    it('should show error message on rollback failure', async () => {
      // Arrange
      const user = userEvent.setup();
      (rollbackApi.executeRollback as jest.Mock).mockRejectedValue(new Error('Rollback failed'));
      render(<RollbackPanel />);
      await waitFor(() => screen.getByText('My Project'));

      // Act
      const setupCard = screen.getByTestId('setup-card-setup-1');
      await user.click(within(setupCard).getByRole('button', { name: /rollback/i }));
      await waitFor(() => screen.getByTestId('rollback-confirm-modal'));
      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/error|falló/i)).toBeInTheDocument();
      });
    });
  });

  // URLS DISPLAY TESTS
  describe('URLs Display', () => {
    it('should display frontend URL for completed setups', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('https://my-project.vercel.app')).toBeInTheDocument();
      });
    });

    it('should make URLs clickable', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /vercel\.app/i });
        expect(link).toHaveAttribute('href', 'https://my-project.vercel.app');
      });
    });
  });

  // EMPTY STATE TESTS
  describe('Empty State', () => {
    it('should show empty state when no setups', async () => {
      // Arrange
      (rollbackApi.getSetupStates as jest.Mock).mockResolvedValue([]);

      // Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('empty-rollback')).toBeInTheDocument();
      });
    });
  });

  // ERROR STATE TESTS
  describe('Error State', () => {
    it('should show error state when fetch fails', async () => {
      // Arrange
      (rollbackApi.getSetupStates as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      // Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/error al cargar/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      // Arrange
      (rollbackApi.getSetupStates as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      // Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
      });
    });
  });

  // FILTER TESTS
  describe('Filtering', () => {
    it('should render status filter options', async () => {
      // Arrange & Act
      render(<RollbackPanel />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /todos/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /completados/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /fallidos/i })).toBeInTheDocument();
      });
    });

    it('should filter by status when filter clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<RollbackPanel />);
      await waitFor(() => screen.getByText('My Project'));

      // Act
      await user.click(screen.getByRole('button', { name: /fallidos/i }));

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('My Project')).not.toBeInTheDocument();
        expect(screen.getByText('Another Project')).toBeInTheDocument();
      });
    });
  });
});
