/**
 * KanbanBoard Component Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanBoard, KanbanTask, KanbanColumn } from '../KanbanBoard';

// Mock data
const mockTasks: KanbanTask[] = [
  {
    id: 'task-1',
    title: 'Setup proyecto',
    description: 'Configurar el proyecto inicial',
    status: 'pending',
    priority: 'high',
    estimatedTime: 30,
    assignee: { id: 'user-1', name: 'Juan', avatar: '/avatar1.png' },
    labels: ['setup', 'backend'],
  },
  {
    id: 'task-2',
    title: 'Diseñar UI',
    description: 'Crear mockups de la interfaz',
    status: 'in_progress',
    priority: 'medium',
    estimatedTime: 60,
    assignee: { id: 'user-2', name: 'María', avatar: '/avatar2.png' },
    labels: ['ui', 'design'],
  },
  {
    id: 'task-3',
    title: 'Implementar login',
    description: 'Crear flujo de autenticación',
    status: 'in_progress',
    priority: 'high',
    estimatedTime: 45,
    labels: ['auth'],
  },
  {
    id: 'task-4',
    title: 'Tests unitarios',
    description: 'Escribir tests para componentes',
    status: 'completed',
    priority: 'low',
    estimatedTime: 90,
    completedAt: new Date('2024-01-15'),
  },
  {
    id: 'task-5',
    title: 'Deploy staging',
    description: 'Desplegar a ambiente de pruebas',
    status: 'failed',
    priority: 'high',
    estimatedTime: 15,
    errorMessage: 'Build failed: Missing dependencies',
  },
];

const defaultColumns: KanbanColumn[] = [
  { id: 'pending', title: 'Pendientes', color: 'slate' },
  { id: 'in_progress', title: 'En Progreso', color: 'blue' },
  { id: 'completed', title: 'Completadas', color: 'green' },
  { id: 'failed', title: 'Fallidas', color: 'red' },
];

describe('KanbanBoard', () => {
  // RENDERING TESTS
  describe('Rendering', () => {
    it('should render kanban board container', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    });

    it('should render all columns', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      expect(screen.getByTestId('column-pending')).toBeInTheDocument();
      expect(screen.getByTestId('column-in_progress')).toBeInTheDocument();
      expect(screen.getByTestId('column-completed')).toBeInTheDocument();
      expect(screen.getByTestId('column-failed')).toBeInTheDocument();
    });

    it('should render column titles', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      expect(screen.getByText('Pendientes')).toBeInTheDocument();
      expect(screen.getByText('En Progreso')).toBeInTheDocument();
      expect(screen.getByText('Completadas')).toBeInTheDocument();
      expect(screen.getByText('Fallidas')).toBeInTheDocument();
    });

    it('should render tasks in correct columns', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      const pendingColumn = screen.getByTestId('column-pending');
      const inProgressColumn = screen.getByTestId('column-in_progress');
      const completedColumn = screen.getByTestId('column-completed');

      expect(within(pendingColumn).getByText('Setup proyecto')).toBeInTheDocument();
      expect(within(inProgressColumn).getByText('Diseñar UI')).toBeInTheDocument();
      expect(within(inProgressColumn).getByText('Implementar login')).toBeInTheDocument();
      expect(within(completedColumn).getByText('Tests unitarios')).toBeInTheDocument();
    });

    it('should show task count in column headers', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      expect(screen.getByTestId('count-pending')).toHaveTextContent('1');
      expect(screen.getByTestId('count-in_progress')).toHaveTextContent('2');
      expect(screen.getByTestId('count-completed')).toHaveTextContent('1');
      expect(screen.getByTestId('count-failed')).toHaveTextContent('1');
    });
  });

  // TASK CARD TESTS
  describe('Task Cards', () => {
    it('should render task title', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      expect(screen.getByText('Setup proyecto')).toBeInTheDocument();
    });

    it('should render task description', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      expect(screen.getByText('Configurar el proyecto inicial')).toBeInTheDocument();
    });

    it('should show priority indicator', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      const taskCard = screen.getByTestId('task-card-task-1');
      expect(within(taskCard).getByTestId('priority-high')).toBeInTheDocument();
    });

    it('should show estimated time', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      const taskCard = screen.getByTestId('task-card-task-1');
      expect(within(taskCard).getByText('30 min')).toBeInTheDocument();
    });

    it('should show assignee avatar when assigned', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      const taskCard = screen.getByTestId('task-card-task-1');
      expect(within(taskCard).getByTestId('assignee-avatar')).toBeInTheDocument();
    });

    it('should show labels when present', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      const taskCard = screen.getByTestId('task-card-task-1');
      expect(within(taskCard).getByText('setup')).toBeInTheDocument();
      expect(within(taskCard).getByText('backend')).toBeInTheDocument();
    });

    it('should show error message for failed tasks', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      const failedColumn = screen.getByTestId('column-failed');
      expect(within(failedColumn).getByText(/Build failed/)).toBeInTheDocument();
    });
  });

  // DRAG AND DROP TESTS
  describe('Drag and Drop', () => {
    it('should have draggable tasks', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      const taskCard = screen.getByTestId('task-card-task-1');
      expect(taskCard).toHaveAttribute('draggable', 'true');
    });

    it('should call onTaskMove when task is dropped to new column', async () => {
      // Arrange
      const onTaskMove = jest.fn();
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} onTaskMove={onTaskMove} />);

      const taskCard = screen.getByTestId('task-card-task-1');
      const targetColumn = screen.getByTestId('column-in_progress');

      // Create mock dataTransfer
      const dataTransfer = {
        setData: jest.fn(),
        getData: jest.fn().mockReturnValue('task-1'),
        effectAllowed: 'move',
        dropEffect: 'move',
      };

      // Act - simulate drag and drop with mock dataTransfer
      fireEvent.dragStart(taskCard, { dataTransfer });
      fireEvent.dragOver(targetColumn, { dataTransfer });
      fireEvent.drop(targetColumn, { dataTransfer });

      // Assert
      expect(onTaskMove).toHaveBeenCalledWith('task-1', 'in_progress');
    });

    it('should highlight drop zone when dragging over', async () => {
      // Arrange
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      const taskCard = screen.getByTestId('task-card-task-1');
      const targetColumn = screen.getByTestId('column-in_progress');

      // Create mock dataTransfer
      const dataTransfer = {
        setData: jest.fn(),
        getData: jest.fn(),
        effectAllowed: 'move',
        dropEffect: 'move',
      };

      // Act
      fireEvent.dragStart(taskCard, { dataTransfer });
      fireEvent.dragEnter(targetColumn, { dataTransfer });

      // Assert
      expect(targetColumn).toHaveClass('drag-over');
    });

    it('should disable drag when isDragDisabled is true', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} isDragDisabled />);

      // Assert
      const taskCard = screen.getByTestId('task-card-task-1');
      expect(taskCard).toHaveAttribute('draggable', 'false');
    });
  });

  // FILTERING TESTS
  describe('Filtering', () => {
    it('should filter tasks by priority when filter is applied', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} filterPriority="high" />);

      // Assert
      expect(screen.getByText('Setup proyecto')).toBeInTheDocument();
      expect(screen.queryByText('Tests unitarios')).not.toBeInTheDocument();
    });

    it('should filter tasks by assignee when filter is applied', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} filterAssignee="user-1" />);

      // Assert
      expect(screen.getByText('Setup proyecto')).toBeInTheDocument();
      expect(screen.queryByText('Diseñar UI')).not.toBeInTheDocument();
    });

    it('should filter tasks by label when filter is applied', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} filterLabel="ui" />);

      // Assert
      expect(screen.getByText('Diseñar UI')).toBeInTheDocument();
      expect(screen.queryByText('Setup proyecto')).not.toBeInTheDocument();
    });

    it('should show search input when showSearch is true', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} showSearch />);

      // Assert
      expect(screen.getByPlaceholderText(/buscar tareas/i)).toBeInTheDocument();
    });

    it('should filter tasks by search term', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} showSearch />);

      // Act
      await user.type(screen.getByPlaceholderText(/buscar tareas/i), 'login');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Implementar login')).toBeInTheDocument();
        expect(screen.queryByText('Setup proyecto')).not.toBeInTheDocument();
      });
    });
  });

  // LOADING STATE TESTS
  describe('Loading State', () => {
    it('should show skeleton loaders when loading', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={[]} columns={defaultColumns} isLoading />);

      // Assert
      const skeletons = screen.getAllByTestId('task-skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });

    it('should hide skeletons when not loading', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} isLoading={false} />);

      // Assert
      expect(screen.queryByTestId('task-skeleton')).not.toBeInTheDocument();
    });
  });

  // EMPTY STATE TESTS
  describe('Empty State', () => {
    it('should show empty message for empty columns', () => {
      // Arrange
      const tasksWithoutPending = mockTasks.filter(t => t.status !== 'pending');

      // Act
      render(<KanbanBoard tasks={tasksWithoutPending} columns={defaultColumns} />);

      // Assert
      const pendingColumn = screen.getByTestId('column-pending');
      expect(within(pendingColumn).getByText(/no hay tareas/i)).toBeInTheDocument();
    });

    it('should show empty board message when no tasks', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={[]} columns={defaultColumns} />);

      // Assert
      expect(screen.getByTestId('empty-board')).toBeInTheDocument();
    });
  });

  // INTERACTION TESTS
  describe('Interactions', () => {
    it('should call onTaskClick when task is clicked', async () => {
      // Arrange
      const onTaskClick = jest.fn();
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} onTaskClick={onTaskClick} />);

      // Act
      fireEvent.click(screen.getByTestId('task-card-task-1'));

      // Assert
      expect(onTaskClick).toHaveBeenCalledWith(mockTasks[0]);
    });

    it('should show context menu on right-click', async () => {
      // Arrange
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} showContextMenu />);

      // Act
      fireEvent.contextMenu(screen.getByTestId('task-card-task-1'));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('context-menu')).toBeInTheDocument();
      });
    });

    it('should call onAddTask when add button is clicked', async () => {
      // Arrange
      const onAddTask = jest.fn();
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} onAddTask={onAddTask} />);

      // Act
      const pendingColumn = screen.getByTestId('column-pending');
      fireEvent.click(within(pendingColumn).getByRole('button', { name: /agregar/i }));

      // Assert
      expect(onAddTask).toHaveBeenCalledWith('pending');
    });
  });

  // ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    it('should have proper ARIA labels for columns', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      expect(screen.getByRole('region', { name: /pendientes/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /en progreso/i })).toBeInTheDocument();
    });

    it('should have proper ARIA labels for task cards', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      const taskCard = screen.getByTestId('task-card-task-1');
      expect(taskCard).toHaveAttribute('aria-label', expect.stringContaining('Setup proyecto'));
    });

    it('should support keyboard navigation', async () => {
      // Arrange
      const user = userEvent.setup();
      const onTaskClick = jest.fn();
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} onTaskClick={onTaskClick} />);

      // Act
      const taskCard = screen.getByTestId('task-card-task-1');
      taskCard.focus();
      await user.keyboard('{Enter}');

      // Assert
      expect(onTaskClick).toHaveBeenCalled();
    });
  });

  // RESPONSIVE TESTS
  describe('Responsive Layout', () => {
    it('should apply horizontal scroll on small screens', () => {
      // Arrange & Act
      render(<KanbanBoard tasks={mockTasks} columns={defaultColumns} />);

      // Assert
      const board = screen.getByTestId('kanban-board');
      expect(board).toHaveClass('overflow-x-auto');
    });
  });
});
