import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectCard } from '../ProjectCard';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('ProjectCard', () => {
  const defaultProject = {
    id: 'proj-123',
    name: 'E-commerce Platform',
    description: 'A full-featured e-commerce platform with payment integration',
    status: 'active' as const,
    progress: 65,
    currentPhase: 'Technical Analysis',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const defaultProps = {
    project: defaultProject,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render project card', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('project-card')).toBeInTheDocument();
  });

  it('should render project name', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
  });

  it('should render project description', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    expect(screen.getByText(/full-featured e-commerce/i)).toBeInTheDocument();
  });

  it('should render as article element', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  // ============================================
  // STATUS INDICATORS
  // ============================================

  it('should show active status badge', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Active');
    expect(badge).toHaveClass('bg-green-500/20');
  });

  it('should show paused status badge', () => {
    // Arrange
    const pausedProject = { ...defaultProject, status: 'paused' as const };

    // Act
    render(<ProjectCard project={pausedProject} />);

    // Assert
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Paused');
    expect(badge).toHaveClass('bg-yellow-500/20');
  });

  it('should show completed status badge', () => {
    // Arrange
    const completedProject = { ...defaultProject, status: 'completed' as const };

    // Act
    render(<ProjectCard project={completedProject} />);

    // Assert
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Completed');
    expect(badge).toHaveClass('bg-blue-500/20');
  });

  it('should show archived status badge', () => {
    // Arrange
    const archivedProject = { ...defaultProject, status: 'archived' as const };

    // Act
    render(<ProjectCard project={archivedProject} />);

    // Assert
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Archived');
    expect(badge).toHaveClass('bg-slate-500/20');
  });

  // ============================================
  // PROGRESS
  // ============================================

  it('should show progress bar', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show correct progress percentage', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '65');
  });

  it('should display progress text', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  // ============================================
  // CURRENT PHASE
  // ============================================

  it('should show current phase', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    expect(screen.getByText('Technical Analysis')).toBeInTheDocument();
  });

  it('should show phase indicator icon', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('phase-icon')).toBeInTheDocument();
  });

  // ============================================
  // TIMESTAMPS
  // ============================================

  it('should show last updated time', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} showTimestamps />);

    // Assert
    expect(screen.getByTestId('updated-at')).toBeInTheDocument();
  });

  it('should show created date when showCreated is true', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} showTimestamps showCreated />);

    // Assert
    expect(screen.getByTestId('created-at')).toBeInTheDocument();
  });

  // ============================================
  // INTERACTIONS
  // ============================================

  it('should navigate to project on click', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ProjectCard {...defaultProps} />);

    // Act
    await user.click(screen.getByTestId('project-card'));

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/projects/proj-123');
  });

  it('should call onClick callback when provided', async () => {
    // Arrange
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<ProjectCard {...defaultProps} onClick={onClick} />);

    // Act
    await user.click(screen.getByTestId('project-card'));

    // Assert
    expect(onClick).toHaveBeenCalledWith(defaultProject);
  });

  it('should show hover effect', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    const card = screen.getByTestId('project-card');
    expect(card).toHaveClass('hover:border-purple-500');
  });

  // ============================================
  // MENU ACTIONS
  // ============================================

  it('should show menu button when showMenu is true', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} showMenu />);

    // Assert
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
  });

  it('should show menu options when menu button clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ProjectCard {...defaultProps} showMenu />);

    // Act
    await user.click(screen.getByRole('button', { name: /menu/i }));

    // Assert
    expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /archive/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
  });

  it('should call onEdit when edit is clicked', async () => {
    // Arrange
    const onEdit = jest.fn();
    const user = userEvent.setup();
    render(<ProjectCard {...defaultProps} showMenu onEdit={onEdit} />);

    // Act
    await user.click(screen.getByRole('button', { name: /menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /edit/i }));

    // Assert
    expect(onEdit).toHaveBeenCalledWith('proj-123');
  });

  it('should call onArchive when archive is clicked', async () => {
    // Arrange
    const onArchive = jest.fn();
    const user = userEvent.setup();
    render(<ProjectCard {...defaultProps} showMenu onArchive={onArchive} />);

    // Act
    await user.click(screen.getByRole('button', { name: /menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /archive/i }));

    // Assert
    expect(onArchive).toHaveBeenCalledWith('proj-123');
  });

  it('should call onDelete when delete is clicked', async () => {
    // Arrange
    const onDelete = jest.fn();
    const user = userEvent.setup();
    render(<ProjectCard {...defaultProps} showMenu onDelete={onDelete} />);

    // Act
    await user.click(screen.getByRole('button', { name: /menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));

    // Assert
    expect(onDelete).toHaveBeenCalledWith('proj-123');
  });

  // ============================================
  // TEAM MEMBERS
  // ============================================

  it('should show team members avatars when provided', () => {
    // Arrange
    const projectWithTeam = {
      ...defaultProject,
      team: [
        { id: 'user-1', name: 'John Doe', avatar: '/avatars/john.jpg' },
        { id: 'user-2', name: 'Jane Doe' },
      ],
    };

    // Act
    render(<ProjectCard project={projectWithTeam} showTeam />);

    // Assert
    expect(screen.getByTestId('team-avatars')).toBeInTheDocument();
    expect(screen.getByAltText('John Doe')).toBeInTheDocument();
  });

  it('should show team member count indicator', () => {
    // Arrange
    const projectWithTeam = {
      ...defaultProject,
      team: [
        { id: 'user-1', name: 'John' },
        { id: 'user-2', name: 'Jane' },
        { id: 'user-3', name: 'Bob' },
      ],
    };

    // Act
    render(<ProjectCard project={projectWithTeam} showTeam />);

    // Assert
    expect(screen.getByTestId('team-count')).toHaveTextContent('3');
  });

  // ============================================
  // VARIANTS
  // ============================================

  it('should render compact variant', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} variant="compact" />);

    // Assert
    const card = screen.getByTestId('project-card');
    expect(card).toHaveClass('p-3');
    expect(screen.queryByText(defaultProject.description)).not.toBeInTheDocument();
  });

  it('should render default variant', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    const card = screen.getByTestId('project-card');
    expect(card).toHaveClass('p-4');
  });

  it('should render expanded variant', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} variant="expanded" />);

    // Assert
    const card = screen.getByTestId('project-card');
    expect(card).toHaveClass('p-6');
  });

  // ============================================
  // STATISTICS
  // ============================================

  it('should show task statistics when provided', () => {
    // Arrange
    const projectWithStats = {
      ...defaultProject,
      stats: {
        totalTasks: 20,
        completedTasks: 12,
        pendingTasks: 8,
      },
    };

    // Act
    render(<ProjectCard project={projectWithStats} showStats />);

    // Assert
    expect(screen.getByTestId('stats-total')).toHaveTextContent('20');
    expect(screen.getByTestId('stats-completed')).toHaveTextContent('12');
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have accessible name', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    const card = screen.getByRole('article');
    expect(card).toHaveAccessibleName(/e-commerce platform/i);
  });

  it('should support keyboard navigation', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ProjectCard {...defaultProps} />);

    // Act
    const card = screen.getByTestId('project-card');
    card.focus();
    await user.keyboard('{Enter}');

    // Assert
    expect(mockPush).toHaveBeenCalled();
  });

  it('should have proper focus styles', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} />);

    // Assert
    const card = screen.getByTestId('project-card');
    expect(card).toHaveClass('focus:ring-2');
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle missing optional fields', () => {
    // Arrange
    const minimalProject = {
      id: 'proj-1',
      name: 'Minimal Project',
      status: 'active' as const,
    };

    // Act
    render(<ProjectCard project={minimalProject} />);

    // Assert
    expect(screen.getByText('Minimal Project')).toBeInTheDocument();
  });

  it('should truncate long project names', () => {
    // Arrange
    const projectWithLongName = {
      ...defaultProject,
      name: 'This is a very long project name that should be truncated',
    };

    // Act
    render(<ProjectCard project={projectWithLongName} />);

    // Assert
    const nameElement = screen.getByTestId('project-name');
    expect(nameElement).toHaveClass('truncate');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<ProjectCard {...defaultProps} className="custom-card" />);

    // Assert
    expect(screen.getByTestId('project-card')).toHaveClass('custom-card');
  });

  it('should show favorite indicator when project is favorited', () => {
    // Arrange
    const favoritedProject = { ...defaultProject, isFavorite: true };

    // Act
    render(<ProjectCard project={favoritedProject} />);

    // Assert
    expect(screen.getByTestId('favorite-icon')).toBeInTheDocument();
  });
});
