import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserStoryCard } from '../UserStoryCard';

describe('UserStoryCard', () => {
  const defaultStory = {
    id: 'story-1',
    title: 'As a user, I want to login',
    description: 'Users should be able to login with email and password',
    status: 'todo' as const,
    priority: 'high' as const,
    storyPoints: 5,
    acceptanceCriteria: [
      'User can enter email',
      'User can enter password',
      'User sees error for invalid credentials',
    ],
  };

  const defaultProps = {
    story: defaultStory,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render user story card', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('user-story-card')).toBeInTheDocument();
  });

  it('should render story title', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} />);

    // Assert
    expect(screen.getByText('As a user, I want to login')).toBeInTheDocument();
  });

  it('should render story description', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} />);

    // Assert
    expect(screen.getByText(/login with email and password/i)).toBeInTheDocument();
  });

  it('should render as article element', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} />);

    // Assert
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  // ============================================
  // STATUS INDICATORS
  // ============================================

  it('should show todo status', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} />);

    // Assert
    const card = screen.getByTestId('user-story-card');
    expect(card).toHaveAttribute('data-status', 'todo');
  });

  it('should show in_progress status', () => {
    // Arrange
    const inProgressStory = { ...defaultStory, status: 'in_progress' as const };

    // Act
    render(<UserStoryCard story={inProgressStory} />);

    // Assert
    const card = screen.getByTestId('user-story-card');
    expect(card).toHaveAttribute('data-status', 'in_progress');
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-blue-500');
  });

  it('should show completed status with checkmark', () => {
    // Arrange
    const completedStory = { ...defaultStory, status: 'completed' as const };

    // Act
    render(<UserStoryCard story={completedStory} />);

    // Assert
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-green-500');
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  // ============================================
  // PRIORITY
  // ============================================

  it('should show high priority badge', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} />);

    // Assert
    const badge = screen.getByTestId('priority-badge');
    expect(badge).toHaveTextContent('High');
    expect(badge).toHaveClass('bg-orange-500/20');
  });

  it('should show medium priority badge', () => {
    // Arrange
    const mediumStory = { ...defaultStory, priority: 'medium' as const };

    // Act
    render(<UserStoryCard story={mediumStory} />);

    // Assert
    const badge = screen.getByTestId('priority-badge');
    expect(badge).toHaveTextContent('Medium');
    expect(badge).toHaveClass('bg-blue-500/20');
  });

  it('should show low priority badge', () => {
    // Arrange
    const lowStory = { ...defaultStory, priority: 'low' as const };

    // Act
    render(<UserStoryCard story={lowStory} />);

    // Assert
    const badge = screen.getByTestId('priority-badge');
    expect(badge).toHaveTextContent('Low');
  });

  it('should show critical priority badge', () => {
    // Arrange
    const criticalStory = { ...defaultStory, priority: 'critical' as const };

    // Act
    render(<UserStoryCard story={criticalStory} />);

    // Assert
    const badge = screen.getByTestId('priority-badge');
    expect(badge).toHaveTextContent('Critical');
    expect(badge).toHaveClass('bg-red-500/20');
  });

  // ============================================
  // STORY POINTS
  // ============================================

  it('should show story points', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('story-points')).toHaveTextContent('5');
  });

  it('should show story points with label', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} showPointsLabel />);

    // Assert
    expect(screen.getByText(/5 pts/i)).toBeInTheDocument();
  });

  it('should not show story points when not provided', () => {
    // Arrange
    const storyWithoutPoints = { ...defaultStory, storyPoints: undefined };

    // Act
    render(<UserStoryCard story={storyWithoutPoints} />);

    // Assert
    expect(screen.queryByTestId('story-points')).not.toBeInTheDocument();
  });

  // ============================================
  // ACCEPTANCE CRITERIA
  // ============================================

  it('should show acceptance criteria when expanded', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<UserStoryCard {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /expand/i }));

    // Assert
    expect(screen.getByText('User can enter email')).toBeInTheDocument();
    expect(screen.getByText('User can enter password')).toBeInTheDocument();
  });

  it('should show acceptance criteria count', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('criteria-count')).toHaveTextContent('3');
  });

  it('should toggle acceptance criteria visibility', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<UserStoryCard {...defaultProps} />);

    // Act - expand
    await user.click(screen.getByRole('button', { name: /expand/i }));
    expect(screen.getByText('User can enter email')).toBeInTheDocument();

    // Act - collapse
    await user.click(screen.getByRole('button', { name: /collapse/i }));
    expect(screen.queryByText('User can enter email')).not.toBeInTheDocument();
  });

  it('should show completed criteria with checkmark', async () => {
    // Arrange
    const storyWithCompletedCriteria = {
      ...defaultStory,
      acceptanceCriteria: [
        { text: 'User can enter email', completed: true },
        { text: 'User can enter password', completed: false },
      ],
    };
    const user = userEvent.setup();
    render(<UserStoryCard story={storyWithCompletedCriteria} />);

    // Act
    await user.click(screen.getByRole('button', { name: /expand/i }));

    // Assert
    const firstCriteria = screen.getByText('User can enter email').closest('li');
    expect(firstCriteria).toHaveAttribute('data-completed', 'true');
  });

  // ============================================
  // TASKS
  // ============================================

  it('should show related tasks count', () => {
    // Arrange
    const storyWithTasks = {
      ...defaultStory,
      tasks: [
        { id: 'task-1', name: 'Create form', status: 'completed' as const },
        { id: 'task-2', name: 'Add validation', status: 'in_progress' as const },
      ],
    };

    // Act
    render(<UserStoryCard story={storyWithTasks} />);

    // Assert
    expect(screen.getByTestId('tasks-count')).toHaveTextContent('2');
  });

  it('should show tasks progress', () => {
    // Arrange
    const storyWithTasks = {
      ...defaultStory,
      tasks: [
        { id: 'task-1', name: 'Task 1', status: 'completed' as const },
        { id: 'task-2', name: 'Task 2', status: 'completed' as const },
        { id: 'task-3', name: 'Task 3', status: 'in_progress' as const },
      ],
    };

    // Act
    render(<UserStoryCard story={storyWithTasks} showTasksProgress />);

    // Assert - 2 out of 3 completed
    expect(screen.getByTestId('tasks-progress')).toHaveTextContent('2/3');
  });

  // ============================================
  // INTERACTIONS
  // ============================================

  it('should call onClick when card is clicked', async () => {
    // Arrange
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<UserStoryCard {...defaultProps} onClick={onClick} />);

    // Act
    await user.click(screen.getByTestId('user-story-card'));

    // Assert
    expect(onClick).toHaveBeenCalledWith(defaultStory);
  });

  it('should call onStatusChange when status is changed', async () => {
    // Arrange
    const onStatusChange = jest.fn();
    const user = userEvent.setup();
    render(<UserStoryCard {...defaultProps} onStatusChange={onStatusChange} showActions />);

    // Act
    await user.click(screen.getByRole('button', { name: /start/i }));

    // Assert
    expect(onStatusChange).toHaveBeenCalledWith('story-1', 'in_progress');
  });

  // ============================================
  // DRAG AND DROP
  // ============================================

  it('should have draggable attribute when draggable', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} draggable />);

    // Assert
    const card = screen.getByTestId('user-story-card');
    expect(card).toHaveAttribute('draggable', 'true');
  });

  it('should show drag handle when draggable', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} draggable />);

    // Assert
    expect(screen.getByTestId('drag-handle')).toBeInTheDocument();
  });

  it('should call onDragStart when dragging', () => {
    // Arrange
    const onDragStart = jest.fn();
    render(<UserStoryCard {...defaultProps} draggable onDragStart={onDragStart} />);

    // Act
    const card = screen.getByTestId('user-story-card');
    const dragEvent = new Event('dragstart', { bubbles: true });
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: { setData: jest.fn(), effectAllowed: '' },
    });
    card.dispatchEvent(dragEvent);

    // Assert
    expect(onDragStart).toHaveBeenCalled();
  });

  // ============================================
  // ASSIGNEE
  // ============================================

  it('should show assignee when provided', () => {
    // Arrange
    const storyWithAssignee = {
      ...defaultStory,
      assignee: { id: 'user-1', name: 'John Doe', avatar: '/avatar.jpg' },
    };

    // Act
    render(<UserStoryCard story={storyWithAssignee} />);

    // Assert
    expect(screen.getByTestId('assignee-avatar')).toBeInTheDocument();
    expect(screen.getByAltText('John Doe')).toBeInTheDocument();
  });

  it('should show unassigned indicator when no assignee', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('unassigned-indicator')).toBeInTheDocument();
  });

  // ============================================
  // LABELS
  // ============================================

  it('should show story labels', () => {
    // Arrange
    const storyWithLabels = {
      ...defaultStory,
      labels: ['frontend', 'authentication'],
    };

    // Act
    render(<UserStoryCard story={storyWithLabels} />);

    // Assert
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('authentication')).toBeInTheDocument();
  });

  // ============================================
  // VARIANTS
  // ============================================

  it('should render compact variant', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} variant="compact" />);

    // Assert
    const card = screen.getByTestId('user-story-card');
    expect(card).toHaveClass('p-2');
    expect(screen.queryByText(defaultStory.description)).not.toBeInTheDocument();
  });

  it('should render default variant', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} />);

    // Assert
    const card = screen.getByTestId('user-story-card');
    expect(card).toHaveClass('p-4');
  });

  it('should render expanded variant', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} variant="expanded" />);

    // Assert
    const card = screen.getByTestId('user-story-card');
    expect(card).toHaveClass('p-6');
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have accessible name', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} />);

    // Assert
    const card = screen.getByRole('article');
    expect(card).toHaveAccessibleName(/as a user, i want to login/i);
  });

  it('should support keyboard navigation', async () => {
    // Arrange
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<UserStoryCard {...defaultProps} onClick={onClick} />);

    // Act
    const card = screen.getByTestId('user-story-card');
    card.focus();
    await user.keyboard('{Enter}');

    // Assert
    expect(onClick).toHaveBeenCalled();
  });

  it('should have proper focus styles', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} onClick={jest.fn()} />);

    // Assert
    const card = screen.getByTestId('user-story-card');
    expect(card).toHaveClass('focus:ring-2');
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle story with minimal fields', () => {
    // Arrange
    const minimalStory = {
      id: 'story-1',
      title: 'Minimal story',
      status: 'todo' as const,
    };

    // Act
    render(<UserStoryCard story={minimalStory} />);

    // Assert
    expect(screen.getByText('Minimal story')).toBeInTheDocument();
  });

  it('should truncate long titles', () => {
    // Arrange
    const longTitleStory = {
      ...defaultStory,
      title: 'This is a very long story title that should be truncated to fit in the card',
    };

    // Act
    render(<UserStoryCard story={longTitleStory} />);

    // Assert
    const titleElement = screen.getByTestId('story-title');
    expect(titleElement).toHaveClass('truncate');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<UserStoryCard {...defaultProps} className="custom-story" />);

    // Assert
    expect(screen.getByTestId('user-story-card')).toHaveClass('custom-story');
  });

  it('should show epic link when story belongs to epic', () => {
    // Arrange
    const storyWithEpic = {
      ...defaultStory,
      epic: { id: 'epic-1', name: 'Authentication Epic' },
    };

    // Act
    render(<UserStoryCard story={storyWithEpic} showEpic />);

    // Assert
    expect(screen.getByText('Authentication Epic')).toBeInTheDocument();
  });
});
