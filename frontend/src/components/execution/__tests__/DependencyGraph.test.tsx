import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DependencyGraph } from '../DependencyGraph';

describe('DependencyGraph', () => {
  const defaultTasks = [
    { id: 'task-1', name: 'Setup Database', status: 'completed' as const, dependencies: [] },
    { id: 'task-2', name: 'Create API', status: 'in_progress' as const, dependencies: ['task-1'] },
    { id: 'task-3', name: 'Build UI', status: 'todo' as const, dependencies: ['task-2'] },
    { id: 'task-4', name: 'Write Tests', status: 'todo' as const, dependencies: ['task-2', 'task-3'] },
  ];

  const defaultProps = {
    tasks: defaultTasks,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render dependency graph container', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('dependency-graph')).toBeInTheDocument();
  });

  it('should render all task nodes', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('node-task-1')).toBeInTheDocument();
    expect(screen.getByTestId('node-task-2')).toBeInTheDocument();
    expect(screen.getByTestId('node-task-3')).toBeInTheDocument();
    expect(screen.getByTestId('node-task-4')).toBeInTheDocument();
  });

  it('should render task names in nodes', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} />);

    // Assert
    expect(screen.getByText('Setup Database')).toBeInTheDocument();
    expect(screen.getByText('Create API')).toBeInTheDocument();
    expect(screen.getByText('Build UI')).toBeInTheDocument();
    expect(screen.getByText('Write Tests')).toBeInTheDocument();
  });

  // ============================================
  // DEPENDENCY EDGES
  // ============================================

  it('should render dependency edges', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} />);

    // Assert - edges from dependencies
    expect(screen.getByTestId('edge-task-1-task-2')).toBeInTheDocument();
    expect(screen.getByTestId('edge-task-2-task-3')).toBeInTheDocument();
    expect(screen.getByTestId('edge-task-2-task-4')).toBeInTheDocument();
    expect(screen.getByTestId('edge-task-3-task-4')).toBeInTheDocument();
  });

  it('should not render edges for tasks without dependencies', () => {
    // Arrange
    const independentTasks = [
      { id: 'task-1', name: 'Task 1', status: 'todo' as const, dependencies: [] },
      { id: 'task-2', name: 'Task 2', status: 'todo' as const, dependencies: [] },
    ];

    // Act
    render(<DependencyGraph tasks={independentTasks} />);

    // Assert
    expect(screen.queryByTestId(/^edge-/)).not.toBeInTheDocument();
  });

  // ============================================
  // NODE STATUS STYLING
  // ============================================

  it('should show completed status on nodes', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} />);

    // Assert
    const completedNode = screen.getByTestId('node-task-1');
    expect(completedNode).toHaveAttribute('data-status', 'completed');
    expect(completedNode).toHaveClass('border-green-500');
  });

  it('should show in_progress status on nodes', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} />);

    // Assert
    const inProgressNode = screen.getByTestId('node-task-2');
    expect(inProgressNode).toHaveAttribute('data-status', 'in_progress');
    expect(inProgressNode).toHaveClass('border-blue-500');
  });

  it('should show todo status on nodes', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} />);

    // Assert
    const todoNode = screen.getByTestId('node-task-3');
    expect(todoNode).toHaveAttribute('data-status', 'todo');
    expect(todoNode).toHaveClass('border-slate-500');
  });

  it('should show blocked status when dependencies not met', () => {
    // Arrange
    const blockedTasks = [
      { id: 'task-1', name: 'Task 1', status: 'todo' as const, dependencies: [] },
      { id: 'task-2', name: 'Task 2', status: 'todo' as const, dependencies: ['task-1'], isBlocked: true },
    ];

    // Act
    render(<DependencyGraph tasks={blockedTasks} />);

    // Assert
    const blockedNode = screen.getByTestId('node-task-2');
    expect(blockedNode).toHaveClass('border-red-500');
    expect(screen.getByTestId('blocked-icon-task-2')).toBeInTheDocument();
  });

  // ============================================
  // EDGE STYLING
  // ============================================

  it('should style completed edges differently', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} />);

    // Assert - edge from completed task-1 to task-2
    const completedEdge = screen.getByTestId('edge-task-1-task-2');
    expect(completedEdge).toHaveClass('stroke-green-500');
  });

  it('should style pending edges differently', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} />);

    // Assert - edge from in_progress task-2 to todo task-3
    const pendingEdge = screen.getByTestId('edge-task-2-task-3');
    expect(pendingEdge).toHaveClass('stroke-slate-500');
  });

  // ============================================
  // INTERACTIONS
  // ============================================

  it('should call onNodeClick when node is clicked', async () => {
    // Arrange
    const onNodeClick = jest.fn();
    const user = userEvent.setup();
    render(<DependencyGraph {...defaultProps} onNodeClick={onNodeClick} />);

    // Act
    await user.click(screen.getByTestId('node-task-1'));

    // Assert
    expect(onNodeClick).toHaveBeenCalledWith(defaultTasks[0]);
  });

  it('should highlight node on hover', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<DependencyGraph {...defaultProps} />);

    // Act
    await user.hover(screen.getByTestId('node-task-1'));

    // Assert
    const node = screen.getByTestId('node-task-1');
    expect(node).toHaveClass('ring-2');
  });

  it('should highlight connected edges on node hover', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<DependencyGraph {...defaultProps} highlightConnections />);

    // Act
    await user.hover(screen.getByTestId('node-task-2'));

    // Assert
    const connectedEdge = screen.getByTestId('edge-task-1-task-2');
    expect(connectedEdge).toHaveClass('stroke-purple-500');
  });

  // ============================================
  // ZOOM AND PAN
  // ============================================

  it('should support zoom controls when enabled', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} enableZoom />);

    // Assert
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('should zoom in when zoom in button clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<DependencyGraph {...defaultProps} enableZoom />);

    // Act
    await user.click(screen.getByRole('button', { name: /zoom in/i }));

    // Assert
    const container = screen.getByTestId('graph-container');
    expect(container).toHaveStyle({ transform: 'scale(1.2)' });
  });

  // ============================================
  // LAYOUT OPTIONS
  // ============================================

  it('should render horizontal layout by default', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} />);

    // Assert
    const graph = screen.getByTestId('dependency-graph');
    expect(graph).toHaveAttribute('data-layout', 'horizontal');
  });

  it('should render vertical layout when specified', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} layout="vertical" />);

    // Assert
    const graph = screen.getByTestId('dependency-graph');
    expect(graph).toHaveAttribute('data-layout', 'vertical');
  });

  // ============================================
  // CRITICAL PATH
  // ============================================

  it('should highlight critical path when enabled', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} showCriticalPath />);

    // Assert - task-1 -> task-2 -> task-4 is the critical path (longest)
    expect(screen.getByTestId('node-task-1')).toHaveClass('ring-orange-500');
    expect(screen.getByTestId('edge-task-1-task-2')).toHaveClass('stroke-orange-500');
  });

  // ============================================
  // LEGEND
  // ============================================

  it('should show legend when enabled', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} showLegend />);

    // Assert
    expect(screen.getByTestId('graph-legend')).toBeInTheDocument();
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  // ============================================
  // EMPTY STATE
  // ============================================

  it('should show empty state when no tasks', () => {
    // Arrange & Act
    render(<DependencyGraph tasks={[]} />);

    // Assert
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have accessible nodes with proper roles', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} />);

    // Assert
    const nodes = screen.getAllByRole('button');
    expect(nodes.length).toBeGreaterThanOrEqual(4);
  });

  it('should support keyboard navigation', async () => {
    // Arrange
    const onNodeClick = jest.fn();
    const user = userEvent.setup();
    render(<DependencyGraph {...defaultProps} onNodeClick={onNodeClick} />);

    // Act
    const node = screen.getByTestId('node-task-1');
    node.focus();
    await user.keyboard('{Enter}');

    // Assert
    expect(onNodeClick).toHaveBeenCalled();
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle circular dependencies gracefully', () => {
    // Arrange - This shouldn't happen but the component should handle it
    const circularTasks = [
      { id: 'task-1', name: 'Task 1', status: 'todo' as const, dependencies: ['task-2'] },
      { id: 'task-2', name: 'Task 2', status: 'todo' as const, dependencies: ['task-1'] },
    ];

    // Act
    render(<DependencyGraph tasks={circularTasks} />);

    // Assert - should render without crashing
    expect(screen.getByTestId('dependency-graph')).toBeInTheDocument();
    expect(screen.getByTestId('circular-warning')).toBeInTheDocument();
  });

  it('should handle missing dependency references', () => {
    // Arrange
    const tasksWithMissing = [
      { id: 'task-1', name: 'Task 1', status: 'todo' as const, dependencies: ['non-existent'] },
    ];

    // Act
    render(<DependencyGraph tasks={tasksWithMissing} />);

    // Assert - should render the task without the invalid edge
    expect(screen.getByTestId('node-task-1')).toBeInTheDocument();
    expect(screen.queryByTestId(/^edge-/)).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<DependencyGraph {...defaultProps} className="custom-graph" />);

    // Assert
    expect(screen.getByTestId('dependency-graph')).toHaveClass('custom-graph');
  });
});
