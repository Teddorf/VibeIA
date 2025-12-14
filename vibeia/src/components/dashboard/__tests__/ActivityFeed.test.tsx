/**
 * ActivityFeed Component Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActivityFeed, ActivityItem } from '../ActivityFeed';

// Mock data
const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'project_created',
    title: 'Proyecto creado',
    description: 'Se creó el proyecto "Mi App"',
    timestamp: new Date('2024-01-15T10:00:00'),
    projectId: 'proj-1',
    projectName: 'Mi App',
    userId: 'user-1',
    userName: 'Juan Pérez',
  },
  {
    id: '2',
    type: 'task_completed',
    title: 'Tarea completada',
    description: 'Se completó la tarea "Setup inicial"',
    timestamp: new Date('2024-01-15T11:30:00'),
    projectId: 'proj-1',
    projectName: 'Mi App',
    taskId: 'task-1',
    taskName: 'Setup inicial',
  },
  {
    id: '3',
    type: 'plan_generated',
    title: 'Plan generado',
    description: 'Se generó un nuevo plan de ejecución',
    timestamp: new Date('2024-01-15T12:00:00'),
    projectId: 'proj-2',
    projectName: 'Otro Proyecto',
    planId: 'plan-1',
  },
  {
    id: '4',
    type: 'execution_started',
    title: 'Ejecución iniciada',
    description: 'Se inició la ejecución del plan',
    timestamp: new Date('2024-01-15T14:00:00'),
    projectId: 'proj-1',
    projectName: 'Mi App',
    executionId: 'exec-1',
  },
  {
    id: '5',
    type: 'error',
    title: 'Error en ejecución',
    description: 'Falló la tarea de deployment',
    timestamp: new Date('2024-01-15T15:00:00'),
    projectId: 'proj-1',
    projectName: 'Mi App',
    severity: 'high',
  },
];

describe('ActivityFeed', () => {
  // RENDERING TESTS
  describe('Rendering', () => {
    it('should render activity feed container', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
    });

    it('should render all activity items', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      const items = screen.getAllByTestId(/activity-item/);
      expect(items).toHaveLength(5);
    });

    it('should display activity title', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      expect(screen.getByText('Proyecto creado')).toBeInTheDocument();
    });

    it('should display activity description', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      expect(screen.getByText(/Se creó el proyecto "Mi App"/)).toBeInTheDocument();
    });

    it('should display relative timestamps', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      // Should show relative time like "hace 2 horas" or similar
      const timestamps = screen.getAllByTestId(/activity-timestamp/);
      expect(timestamps.length).toBeGreaterThan(0);
    });

    it('should render activity type icons', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      expect(screen.getByTestId('icon-project_created')).toBeInTheDocument();
      expect(screen.getByTestId('icon-task_completed')).toBeInTheDocument();
      expect(screen.getByTestId('icon-plan_generated')).toBeInTheDocument();
    });
  });

  // EMPTY STATE TESTS
  describe('Empty State', () => {
    it('should show empty state when no activities', () => {
      // Arrange & Act
      render(<ActivityFeed activities={[]} />);

      // Assert
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText(/no hay actividad reciente/i)).toBeInTheDocument();
    });

    it('should not show empty state when activities exist', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });
  });

  // LOADING STATE TESTS
  describe('Loading State', () => {
    it('should show skeleton loaders when loading', () => {
      // Arrange & Act
      render(<ActivityFeed activities={[]} isLoading={true} />);

      // Assert
      const skeletons = screen.getAllByTestId('activity-skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });

    it('should hide skeletons when not loading', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} isLoading={false} />);

      // Assert
      expect(screen.queryByTestId('activity-skeleton')).not.toBeInTheDocument();
    });
  });

  // FILTERING TESTS
  describe('Filtering', () => {
    it('should filter activities by type when filter is applied', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} filterType="task_completed" />);

      // Assert
      const items = screen.getAllByTestId(/activity-item/);
      expect(items).toHaveLength(1);
      expect(screen.getByText('Tarea completada')).toBeInTheDocument();
    });

    it('should show filter dropdown when showFilters is true', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} showFilters />);

      // Assert
      expect(screen.getByTestId('filter-dropdown')).toBeInTheDocument();
    });

    it('should not show filter dropdown by default', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      expect(screen.queryByTestId('filter-dropdown')).not.toBeInTheDocument();
    });
  });

  // PAGINATION TESTS
  describe('Pagination', () => {
    it('should limit displayed activities based on maxItems', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} maxItems={3} />);

      // Assert
      const items = screen.getAllByTestId(/activity-item/);
      expect(items).toHaveLength(3);
    });

    it('should show "View All" button when there are more activities', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} maxItems={3} />);

      // Assert
      expect(screen.getByRole('button', { name: /ver todo/i })).toBeInTheDocument();
    });

    it('should not show "View All" button when all activities are displayed', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} maxItems={10} />);

      // Assert
      expect(screen.queryByRole('button', { name: /ver todo/i })).not.toBeInTheDocument();
    });

    it('should call onViewAll when "View All" is clicked', () => {
      // Arrange
      const onViewAll = jest.fn();
      render(<ActivityFeed activities={mockActivities} maxItems={3} onViewAll={onViewAll} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /ver todo/i }));

      // Assert
      expect(onViewAll).toHaveBeenCalledTimes(1);
    });
  });

  // INTERACTION TESTS
  describe('Interactions', () => {
    it('should call onActivityClick when activity is clicked', () => {
      // Arrange
      const onActivityClick = jest.fn();
      render(<ActivityFeed activities={mockActivities} onActivityClick={onActivityClick} />);

      // Act
      fireEvent.click(screen.getByTestId('activity-item-1'));

      // Assert
      expect(onActivityClick).toHaveBeenCalledWith(mockActivities[0]);
    });

    it('should highlight error activities', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      const errorItem = screen.getByTestId('activity-item-5');
      expect(errorItem).toHaveClass('error');
    });
  });

  // REAL-TIME UPDATES TESTS
  describe('Real-time Updates', () => {
    it('should highlight new activities when added', async () => {
      // Arrange
      const { rerender } = render(<ActivityFeed activities={mockActivities.slice(0, 3)} />);

      // Act
      rerender(<ActivityFeed activities={mockActivities} />);

      // Assert
      await waitFor(() => {
        const newItems = screen.getAllByTestId(/activity-item/);
        // Last 2 items should be marked as new
        expect(newItems[3]).toHaveClass('new');
        expect(newItems[4]).toHaveClass('new');
      });
    });
  });

  // PROJECT LINKING TESTS
  describe('Project Linking', () => {
    it('should render project name as link', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      const projectLinks = screen.getAllByRole('link', { name: /mi app|otro proyecto/i });
      expect(projectLinks.length).toBeGreaterThan(0);
    });

    it('should link to correct project page', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      const projectLink = screen.getByRole('link', { name: /mi app/i });
      expect(projectLink).toHaveAttribute('href', '/projects/proj-1');
    });
  });

  // DATE GROUPING TESTS
  describe('Date Grouping', () => {
    it('should group activities by date when groupByDate is true', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} groupByDate />);

      // Assert
      expect(screen.getByText(/hoy|ayer|esta semana/i)).toBeInTheDocument();
    });

    it('should not group by date when groupByDate is false', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} groupByDate={false} />);

      // Assert
      expect(screen.queryByTestId('date-group-header')).not.toBeInTheDocument();
    });
  });

  // ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    it('should have proper list structure', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(5);
    });

    it('should have aria-live for new activities', () => {
      // Arrange & Act
      render(<ActivityFeed activities={mockActivities} />);

      // Assert
      const feed = screen.getByTestId('activity-feed');
      expect(feed).toHaveAttribute('aria-live', 'polite');
    });
  });
});
