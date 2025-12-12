import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCard } from '../TaskCard';

describe('TaskCard', () => {
  const defaultTask = {
    id: 'task-1',
    name: 'Implement login form',
    description: 'Create a login form with email and password fields',
    status: 'todo' as const,
    estimatedTime: 10,
    priority: 'medium' as const,
    assignee: null,
    dependencies: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render task name', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} />);

    // Assert
    expect(screen.getByText('Implement login form')).toBeInTheDocument();
  });

  it('should render task description', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} />);

    // Assert
    expect(screen.getByText('Create a login form with email and password fields')).toBeInTheDocument();
  });

  it('should render estimated time', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} />);

    // Assert
    expect(screen.getByText('10 min')).toBeInTheDocument();
  });

  it('should render as article element', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} />);

    // Assert
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  // ============================================
  // STATUS INDICATORS
  // ============================================

  it('should show todo status indicator', () => {
    // Arrange
    const task = { ...defaultTask, status: 'todo' as const };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    const card = screen.getByTestId('task-card');
    expect(card).toHaveAttribute('data-status', 'todo');
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-slate-500');
  });

  it('should show in_progress status indicator', () => {
    // Arrange
    const task = { ...defaultTask, status: 'in_progress' as const };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    const card = screen.getByTestId('task-card');
    expect(card).toHaveAttribute('data-status', 'in_progress');
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-blue-500');
  });

  it('should show completed status indicator', () => {
    // Arrange
    const task = { ...defaultTask, status: 'completed' as const };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-green-500');
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  it('should show failed status indicator', () => {
    // Arrange
    const task = { ...defaultTask, status: 'failed' as const };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-red-500');
  });

  it('should show paused status indicator', () => {
    // Arrange
    const task = { ...defaultTask, status: 'paused' as const };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-yellow-500');
  });

  // ============================================
  // PRIORITY INDICATORS
  // ============================================

  it('should show low priority badge', () => {
    // Arrange
    const task = { ...defaultTask, priority: 'low' as const };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('priority-badge')).toHaveTextContent('Low');
    expect(screen.getByTestId('priority-badge')).toHaveClass('bg-slate-500/20');
  });

  it('should show medium priority badge', () => {
    // Arrange
    const task = { ...defaultTask, priority: 'medium' as const };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('priority-badge')).toHaveTextContent('Medium');
    expect(screen.getByTestId('priority-badge')).toHaveClass('bg-blue-500/20');
  });

  it('should show high priority badge', () => {
    // Arrange
    const task = { ...defaultTask, priority: 'high' as const };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('priority-badge')).toHaveTextContent('High');
    expect(screen.getByTestId('priority-badge')).toHaveClass('bg-orange-500/20');
  });

  it('should show critical priority badge', () => {
    // Arrange
    const task = { ...defaultTask, priority: 'critical' as const };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('priority-badge')).toHaveTextContent('Critical');
    expect(screen.getByTestId('priority-badge')).toHaveClass('bg-red-500/20');
  });

  // ============================================
  // TIME INDICATOR (MAX 10 MIN)
  // ============================================

  it('should show time warning when task exceeds 10 minutes', () => {
    // Arrange
    const task = { ...defaultTask, estimatedTime: 15 };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('time-warning')).toBeInTheDocument();
  });

  it('should not show time warning when task is under 10 minutes', () => {
    // Arrange
    const task = { ...defaultTask, estimatedTime: 8 };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.queryByTestId('time-warning')).not.toBeInTheDocument();
  });

  it('should show timer icon when task has time tracked', () => {
    // Arrange
    const task = { ...defaultTask, timeSpent: 5 };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('timer-icon')).toBeInTheDocument();
    expect(screen.getByText('5/10 min')).toBeInTheDocument();
  });

  // ============================================
  // ASSIGNEE
  // ============================================

  it('should show assignee avatar when assigned', () => {
    // Arrange
    const task = {
      ...defaultTask,
      assignee: { id: 'user-1', name: 'John Doe', avatar: '/avatars/john.jpg' },
    };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('assignee-avatar')).toBeInTheDocument();
    expect(screen.getByAltText('John Doe')).toBeInTheDocument();
  });

  it('should show assignee initials when no avatar', () => {
    // Arrange
    const task = {
      ...defaultTask,
      assignee: { id: 'user-1', name: 'John Doe' },
    };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should show unassigned indicator when no assignee', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} />);

    // Assert
    expect(screen.getByTestId('unassigned-indicator')).toBeInTheDocument();
  });

  // ============================================
  // DEPENDENCIES
  // ============================================

  it('should show dependency count when has dependencies', () => {
    // Arrange
    const task = {
      ...defaultTask,
      dependencies: ['task-2', 'task-3'],
    };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('dependency-count')).toHaveTextContent('2');
  });

  it('should not show dependency indicator when no dependencies', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} />);

    // Assert
    expect(screen.queryByTestId('dependency-count')).not.toBeInTheDocument();
  });

  it('should show blocked indicator when dependencies not completed', () => {
    // Arrange
    const task = {
      ...defaultTask,
      dependencies: ['task-2'],
      isBlocked: true,
    };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('blocked-indicator')).toBeInTheDocument();
  });

  // ============================================
  // INTERACTIONS
  // ============================================

  it('should call onClick when card is clicked', async () => {
    // Arrange
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<TaskCard task={defaultTask} onClick={onClick} />);

    // Act
    await user.click(screen.getByTestId('task-card'));

    // Assert
    expect(onClick).toHaveBeenCalledWith(defaultTask);
  });

  it('should call onStatusChange when status is changed', async () => {
    // Arrange
    const onStatusChange = jest.fn();
    const user = userEvent.setup();
    render(<TaskCard task={defaultTask} onStatusChange={onStatusChange} showActions />);

    // Act
    await user.click(screen.getByRole('button', { name: /start/i }));

    // Assert
    expect(onStatusChange).toHaveBeenCalledWith('task-1', 'in_progress');
  });

  it('should call onAssign when assign button is clicked', async () => {
    // Arrange
    const onAssign = jest.fn();
    const user = userEvent.setup();
    render(<TaskCard task={defaultTask} onAssign={onAssign} showActions />);

    // Act
    await user.click(screen.getByRole('button', { name: /assign/i }));

    // Assert
    expect(onAssign).toHaveBeenCalledWith('task-1');
  });

  // ============================================
  // ACTION BUTTONS
  // ============================================

  it('should show start button for todo tasks', () => {
    // Arrange
    const task = { ...defaultTask, status: 'todo' as const };

    // Act
    render(<TaskCard task={task} showActions />);

    // Assert
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('should show pause and complete buttons for in_progress tasks', () => {
    // Arrange
    const task = { ...defaultTask, status: 'in_progress' as const };

    // Act
    render(<TaskCard task={task} showActions />);

    // Assert
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
  });

  it('should show resume button for paused tasks', () => {
    // Arrange
    const task = { ...defaultTask, status: 'paused' as const };

    // Act
    render(<TaskCard task={task} showActions />);

    // Assert
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });

  it('should not show actions when showActions is false', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} showActions={false} />);

    // Assert
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
  });

  // ============================================
  // DRAG AND DROP
  // ============================================

  it('should have draggable attribute when draggable prop is true', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} draggable />);

    // Assert
    const card = screen.getByTestId('task-card');
    expect(card).toHaveAttribute('draggable', 'true');
  });

  it('should call onDragStart when dragging starts', async () => {
    // Arrange
    const onDragStart = jest.fn();
    render(<TaskCard task={defaultTask} draggable onDragStart={onDragStart} />);

    // Act
    const card = screen.getByTestId('task-card');
    const dragEvent = new Event('dragstart', { bubbles: true });
    card.dispatchEvent(dragEvent);

    // Assert
    expect(onDragStart).toHaveBeenCalled();
  });

  it('should show drag handle when draggable', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} draggable />);

    // Assert
    expect(screen.getByTestId('drag-handle')).toBeInTheDocument();
  });

  // ============================================
  // QUALITY GATES
  // ============================================

  it('should show quality gate status when provided', () => {
    // Arrange
    const task = {
      ...defaultTask,
      qualityGates: {
        lint: 'passed' as const,
        tests: 'failed' as const,
        security: 'pending' as const,
      },
    };

    // Act
    render(<TaskCard task={task} showQualityGates />);

    // Assert
    expect(screen.getByTestId('quality-gate-lint')).toHaveAttribute('data-status', 'passed');
    expect(screen.getByTestId('quality-gate-tests')).toHaveAttribute('data-status', 'failed');
    expect(screen.getByTestId('quality-gate-security')).toHaveAttribute('data-status', 'pending');
  });

  // ============================================
  // LABELS / TAGS
  // ============================================

  it('should render task labels', () => {
    // Arrange
    const task = {
      ...defaultTask,
      labels: ['frontend', 'auth', 'urgent'],
    };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('auth')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  // ============================================
  // VARIANTS
  // ============================================

  it('should render compact variant', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} variant="compact" />);

    // Assert
    const card = screen.getByTestId('task-card');
    expect(card).toHaveClass('p-2');
    expect(screen.queryByText(defaultTask.description)).not.toBeInTheDocument();
  });

  it('should render default variant', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} />);

    // Assert
    const card = screen.getByTestId('task-card');
    expect(card).toHaveClass('p-4');
  });

  it('should render expanded variant', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} variant="expanded" />);

    // Assert
    const card = screen.getByTestId('task-card');
    expect(card).toHaveClass('p-6');
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have accessible name', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} />);

    // Assert
    const card = screen.getByRole('article');
    expect(card).toHaveAccessibleName(/implement login form/i);
  });

  it('should support keyboard navigation', async () => {
    // Arrange
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<TaskCard task={defaultTask} onClick={onClick} />);

    // Act
    const card = screen.getByTestId('task-card');
    card.focus();
    await user.keyboard('{Enter}');

    // Assert
    expect(onClick).toHaveBeenCalled();
  });

  it('should have proper focus styles', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} onClick={jest.fn()} />);

    // Assert
    const card = screen.getByTestId('task-card');
    expect(card).toHaveClass('focus:ring-2');
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle missing optional fields', () => {
    // Arrange
    const minimalTask = {
      id: 'task-1',
      name: 'Simple task',
      status: 'todo' as const,
    };

    // Act
    render(<TaskCard task={minimalTask} />);

    // Assert
    expect(screen.getByText('Simple task')).toBeInTheDocument();
  });

  it('should truncate long task names', () => {
    // Arrange
    const task = {
      ...defaultTask,
      name: 'This is a very long task name that should be truncated to fit in the card',
    };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    const nameElement = screen.getByTestId('task-name');
    expect(nameElement).toHaveClass('truncate');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<TaskCard task={defaultTask} className="custom-card" />);

    // Assert
    const card = screen.getByTestId('task-card');
    expect(card).toHaveClass('custom-card');
  });

  it('should show AI assisted badge when task is AI generated', () => {
    // Arrange
    const task = { ...defaultTask, isAIGenerated: true };

    // Act
    render(<TaskCard task={task} />);

    // Assert
    expect(screen.getByTestId('ai-badge')).toBeInTheDocument();
  });
});
