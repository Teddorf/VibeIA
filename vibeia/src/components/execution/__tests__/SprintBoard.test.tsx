import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SprintBoard } from '../SprintBoard';

describe('SprintBoard', () => {
  const defaultTasks = [
    { id: 'task-1', name: 'Task 1', status: 'todo' as const, estimatedTime: 10 },
    { id: 'task-2', name: 'Task 2', status: 'in_progress' as const, estimatedTime: 8 },
    { id: 'task-3', name: 'Task 3', status: 'completed' as const, estimatedTime: 5 },
  ];

  const defaultProps = {
    tasks: defaultTasks,
    sprintName: 'Sprint 1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render sprint board container', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('sprint-board')).toBeInTheDocument();
  });

  it('should render sprint name', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} />);

    // Assert
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
  });

  it('should render all column headers', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} />);

    // Assert
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should render tasks in correct columns', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} />);

    // Assert
    const todoColumn = screen.getByTestId('column-todo');
    const inProgressColumn = screen.getByTestId('column-in_progress');
    const completedColumn = screen.getByTestId('column-completed');

    expect(todoColumn).toHaveTextContent('Task 1');
    expect(inProgressColumn).toHaveTextContent('Task 2');
    expect(completedColumn).toHaveTextContent('Task 3');
  });

  // ============================================
  // COLUMN COUNTS
  // ============================================

  it('should show task count for each column', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('count-todo')).toHaveTextContent('1');
    expect(screen.getByTestId('count-in_progress')).toHaveTextContent('1');
    expect(screen.getByTestId('count-completed')).toHaveTextContent('1');
  });

  it('should show 0 count for empty columns', () => {
    // Arrange
    const tasks = [{ id: 'task-1', name: 'Task 1', status: 'todo' as const, estimatedTime: 10 }];

    // Act
    render(<SprintBoard tasks={tasks} sprintName="Sprint 1" />);

    // Assert
    expect(screen.getByTestId('count-in_progress')).toHaveTextContent('0');
    expect(screen.getByTestId('count-completed')).toHaveTextContent('0');
  });

  // ============================================
  // SPRINT PROGRESS
  // ============================================

  it('should show sprint progress bar', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} />);

    // Assert
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should calculate correct progress percentage', () => {
    // Arrange - 1 completed out of 3 tasks = 33%
    // Act
    render(<SprintBoard {...defaultProps} />);

    // Assert
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '33');
  });

  it('should show 100% when all tasks completed', () => {
    // Arrange
    const allCompleted = defaultTasks.map(t => ({ ...t, status: 'completed' as const }));

    // Act
    render(<SprintBoard tasks={allCompleted} sprintName="Sprint 1" />);

    // Assert
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('should show 0% when no tasks completed', () => {
    // Arrange
    const noCompleted = defaultTasks.map(t => ({ ...t, status: 'todo' as const }));

    // Act
    render(<SprintBoard tasks={noCompleted} sprintName="Sprint 1" />);

    // Assert
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  // ============================================
  // TIME TRACKING
  // ============================================

  it('should show total estimated time', () => {
    // Arrange & Act - total = 10 + 8 + 5 = 23 min
    render(<SprintBoard {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('total-time')).toHaveTextContent('23 min');
  });

  it('should show remaining time', () => {
    // Arrange - only completed (5 min) done, remaining = 18 min
    // Act
    render(<SprintBoard {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('remaining-time')).toHaveTextContent('18 min');
  });

  // ============================================
  // DRAG AND DROP
  // ============================================

  it('should allow drag and drop when enabled', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} enableDragDrop />);

    // Assert
    const taskCards = screen.getAllByTestId(/^task-card-/);
    taskCards.forEach(card => {
      expect(card).toHaveAttribute('draggable', 'true');
    });
  });

  it('should not allow drag and drop when disabled', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} enableDragDrop={false} />);

    // Assert
    const taskCards = screen.getAllByTestId(/^task-card-/);
    taskCards.forEach(card => {
      expect(card).not.toHaveAttribute('draggable', 'true');
    });
  });

  it('should call onTaskMove when task is dropped', async () => {
    // Arrange
    const onTaskMove = jest.fn();
    render(<SprintBoard {...defaultProps} enableDragDrop onTaskMove={onTaskMove} />);

    // Act - simulate drag and drop
    const taskCard = screen.getByTestId('task-card-task-1');
    const targetColumn = screen.getByTestId('column-in_progress');

    // Simulate drag start
    const dragStartEvent = new Event('dragstart', { bubbles: true });
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: { setData: jest.fn(), effectAllowed: '' },
    });
    taskCard.dispatchEvent(dragStartEvent);

    // Simulate drop
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { getData: () => 'task-1' },
    });
    Object.defineProperty(dropEvent, 'preventDefault', { value: jest.fn() });
    targetColumn.dispatchEvent(dropEvent);

    // Assert
    expect(onTaskMove).toHaveBeenCalledWith('task-1', 'in_progress');
  });

  // ============================================
  // TASK INTERACTIONS
  // ============================================

  it('should call onTaskClick when task is clicked', async () => {
    // Arrange
    const onTaskClick = jest.fn();
    const user = userEvent.setup();
    render(<SprintBoard {...defaultProps} onTaskClick={onTaskClick} />);

    // Act
    await user.click(screen.getByTestId('task-card-task-1'));

    // Assert
    expect(onTaskClick).toHaveBeenCalledWith(defaultTasks[0]);
  });

  // ============================================
  // FILTERING
  // ============================================

  it('should filter tasks by assignee', () => {
    // Arrange
    const tasksWithAssignees = [
      { ...defaultTasks[0], assignee: { id: 'user-1', name: 'John' } },
      { ...defaultTasks[1], assignee: { id: 'user-2', name: 'Jane' } },
      { ...defaultTasks[2], assignee: null },
    ];

    // Act
    render(<SprintBoard tasks={tasksWithAssignees} sprintName="Sprint 1" filterByAssignee="user-1" />);

    // Assert
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Task 3')).not.toBeInTheDocument();
  });

  it('should filter tasks by priority', () => {
    // Arrange
    const tasksWithPriority = [
      { ...defaultTasks[0], priority: 'high' as const },
      { ...defaultTasks[1], priority: 'low' as const },
      { ...defaultTasks[2], priority: 'high' as const },
    ];

    // Act
    render(<SprintBoard tasks={tasksWithPriority} sprintName="Sprint 1" filterByPriority="high" />);

    // Assert
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
  });

  // ============================================
  // EMPTY STATE
  // ============================================

  it('should show empty state when no tasks', () => {
    // Arrange & Act
    render(<SprintBoard tasks={[]} sprintName="Sprint 1" />);

    // Assert
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
  });

  // ============================================
  // SPRINT METADATA
  // ============================================

  it('should show sprint dates when provided', () => {
    // Arrange & Act
    render(
      <SprintBoard
        {...defaultProps}
        startDate={new Date('2024-01-01')}
        endDate={new Date('2024-01-14')}
      />
    );

    // Assert
    expect(screen.getByTestId('sprint-dates')).toBeInTheDocument();
  });

  it('should show days remaining when end date provided', () => {
    // Arrange - mock current date
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-10'));

    // Act
    render(
      <SprintBoard
        {...defaultProps}
        endDate={new Date('2024-01-14')}
      />
    );

    // Assert
    expect(screen.getByTestId('days-remaining')).toHaveTextContent('4 days');

    jest.useRealTimers();
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have proper ARIA attributes on columns', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} />);

    // Assert
    const columns = screen.getAllByRole('region');
    expect(columns.length).toBeGreaterThan(0);
  });

  it('should have accessible progress bar', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} />);

    // Assert
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-label');
  });

  // ============================================
  // VARIANTS
  // ============================================

  it('should render compact variant', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} variant="compact" />);

    // Assert
    const board = screen.getByTestId('sprint-board');
    expect(board).toHaveClass('gap-2');
  });

  it('should render default variant', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} />);

    // Assert
    const board = screen.getByTestId('sprint-board');
    expect(board).toHaveClass('gap-4');
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle tasks with failed status', () => {
    // Arrange
    const tasksWithFailed = [
      ...defaultTasks,
      { id: 'task-4', name: 'Failed Task', status: 'failed' as const, estimatedTime: 10 },
    ];

    // Act
    render(<SprintBoard tasks={tasksWithFailed} sprintName="Sprint 1" showFailedColumn />);

    // Assert
    expect(screen.getByTestId('column-failed')).toBeInTheDocument();
    expect(screen.getByText('Failed Task')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<SprintBoard {...defaultProps} className="custom-board" />);

    // Assert
    expect(screen.getByTestId('sprint-board')).toHaveClass('custom-board');
  });
});
