/**
 * DashboardStats Component Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardStats } from '../DashboardStats';

// Mock data
const mockStats = {
  totalProjects: 12,
  activeProjects: 5,
  completedTasks: 48,
  pendingTasks: 15,
  totalPlans: 8,
  successRate: 92,
};

describe('DashboardStats', () => {
  // RENDERING TESTS
  describe('Rendering', () => {
    it('should render stats cards', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} />);

      // Assert
      expect(screen.getByTestId('stats-container')).toBeInTheDocument();
    });

    it('should display total projects count', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} />);

      // Assert
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText(/proyectos totales/i)).toBeInTheDocument();
    });

    it('should display active projects count', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} />);

      // Assert
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText(/proyectos activos/i)).toBeInTheDocument();
    });

    it('should display completed tasks count', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} />);

      // Assert
      expect(screen.getByText('48')).toBeInTheDocument();
      expect(screen.getByText(/tareas completadas/i)).toBeInTheDocument();
    });

    it('should display pending tasks count', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} />);

      // Assert
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText(/tareas pendientes/i)).toBeInTheDocument();
    });

    it('should display success rate percentage', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} />);

      // Assert
      expect(screen.getByText('92%')).toBeInTheDocument();
      expect(screen.getByText(/tasa de éxito/i)).toBeInTheDocument();
    });

    it('should render stat icons', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} />);

      // Assert
      const icons = screen.getAllByTestId(/stat-icon/);
      expect(icons.length).toBeGreaterThanOrEqual(4);
    });
  });

  // LOADING STATE TESTS
  describe('Loading State', () => {
    it('should show skeleton loaders when isLoading is true', () => {
      // Arrange & Act
      render(<DashboardStats stats={null} isLoading={true} />);

      // Assert
      const skeletons = screen.getAllByTestId('stat-skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });

    it('should not show skeletons when data is loaded', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} isLoading={false} />);

      // Assert
      expect(screen.queryByTestId('stat-skeleton')).not.toBeInTheDocument();
    });
  });

  // EMPTY STATE TESTS
  describe('Empty State', () => {
    it('should display zero values when stats are all zero', () => {
      // Arrange
      const emptyStats = {
        totalProjects: 0,
        activeProjects: 0,
        completedTasks: 0,
        pendingTasks: 0,
        totalPlans: 0,
        successRate: 0,
      };

      // Act
      render(<DashboardStats stats={emptyStats} />);

      // Assert
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(4);
    });
  });

  // VARIANT TESTS
  describe('Variants', () => {
    it('should render compact variant correctly', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} variant="compact" />);

      // Assert
      const container = screen.getByTestId('stats-container');
      expect(container).toHaveClass('compact');
    });

    it('should render full variant by default', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} />);

      // Assert
      const container = screen.getByTestId('stats-container');
      expect(container).not.toHaveClass('compact');
    });
  });

  // TREND INDICATORS TESTS
  describe('Trend Indicators', () => {
    it('should show positive trend indicator when value increased', () => {
      // Arrange
      const statsWithTrend = {
        ...mockStats,
        trends: {
          totalProjects: 10, // 10% increase
          completedTasks: 15,
        },
      };

      // Act
      render(<DashboardStats stats={statsWithTrend} showTrends />);

      // Assert
      expect(screen.getByTestId('trend-positive')).toBeInTheDocument();
      expect(screen.getByText('+10%')).toBeInTheDocument();
    });

    it('should show negative trend indicator when value decreased', () => {
      // Arrange
      const statsWithTrend = {
        ...mockStats,
        trends: {
          activeProjects: -5, // 5% decrease
        },
      };

      // Act
      render(<DashboardStats stats={statsWithTrend} showTrends />);

      // Assert
      expect(screen.getByTestId('trend-negative')).toBeInTheDocument();
      expect(screen.getByText('-5%')).toBeInTheDocument();
    });

    it('should not show trends when showTrends is false', () => {
      // Arrange
      const statsWithTrend = {
        ...mockStats,
        trends: { totalProjects: 10 },
      };

      // Act
      render(<DashboardStats stats={statsWithTrend} showTrends={false} />);

      // Assert
      expect(screen.queryByTestId('trend-positive')).not.toBeInTheDocument();
    });
  });

  // ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    it('should have accessible labels for all stat cards', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} />);

      // Assert
      const statCards = screen.getAllByRole('listitem');
      expect(statCards.length).toBeGreaterThanOrEqual(4);
    });

    it('should have proper aria-labels for stat values', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} />);

      // Assert
      expect(screen.getByLabelText(/12 proyectos totales/i)).toBeInTheDocument();
    });
  });

  // RESPONSIVE TESTS
  describe('Responsive Layout', () => {
    it('should apply grid layout classes', () => {
      // Arrange & Act
      render(<DashboardStats stats={mockStats} />);

      // Assert
      const container = screen.getByTestId('stats-container');
      expect(container).toHaveClass('grid');
    });
  });
});
