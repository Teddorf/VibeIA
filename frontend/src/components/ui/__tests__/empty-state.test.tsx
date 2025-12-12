import { render, screen } from '@testing-library/react';
import { EmptyState, EmptyStateIcons } from '../empty-state';

describe('EmptyState', () => {
  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render empty state', () => {
    // Arrange & Act
    render(<EmptyState title="No data" />);

    // Assert
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render title', () => {
    // Arrange & Act
    render(<EmptyState title="No projects found" />);

    // Assert
    expect(screen.getByText('No projects found')).toBeInTheDocument();
  });

  it('should have aria-label with title', () => {
    // Arrange & Act
    render(<EmptyState title="Empty list" />);

    // Assert
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Empty list');
  });

  // ============================================
  // OPTIONAL ELEMENTS
  // ============================================

  it('should render description when provided', () => {
    // Arrange & Act
    render(
      <EmptyState
        title="No results"
        description="Try adjusting your search filters"
      />
    );

    // Assert
    expect(screen.getByText('Try adjusting your search filters')).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    // Arrange & Act
    render(<EmptyState title="No data" />);

    // Assert
    const description = screen.queryByText(/try adjusting/i);
    expect(description).not.toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    // Arrange
    const TestIcon = () => <svg data-testid="test-icon" />;

    // Act
    render(<EmptyState title="No data" icon={<TestIcon />} />);

    // Assert
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('should not render icon container when no icon provided', () => {
    // Arrange & Act
    const { container } = render(<EmptyState title="No data" />);

    // Assert
    const iconContainer = container.querySelector('.w-16.h-16');
    expect(iconContainer).not.toBeInTheDocument();
  });

  it('should render action when provided', () => {
    // Arrange & Act
    render(
      <EmptyState
        title="No projects"
        action={<button>Create Project</button>}
      />
    );

    // Assert
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument();
  });

  it('should not render action container when no action provided', () => {
    // Arrange & Act
    const { container } = render(<EmptyState title="No data" />);

    // Assert - only title and status container should exist
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(0);
  });

  // ============================================
  // STYLING
  // ============================================

  it('should apply custom className', () => {
    // Arrange & Act
    render(<EmptyState title="No data" className="custom-empty" />);

    // Assert
    expect(screen.getByRole('status')).toHaveClass('custom-empty');
  });

  it('should have centered layout', () => {
    // Arrange & Act
    render(<EmptyState title="No data" />);

    // Assert
    const container = screen.getByRole('status');
    expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'text-center');
  });

  it('should have padding', () => {
    // Arrange & Act
    render(<EmptyState title="No data" />);

    // Assert
    expect(screen.getByRole('status')).toHaveClass('p-8');
  });

  // ============================================
  // TITLE STYLING
  // ============================================

  it('should style title as heading', () => {
    // Arrange & Act
    render(<EmptyState title="No items" />);

    // Assert
    const title = screen.getByText('No items');
    expect(title.tagName).toBe('H3');
    expect(title).toHaveClass('text-lg', 'font-medium', 'text-white');
  });

  // ============================================
  // DESCRIPTION STYLING
  // ============================================

  it('should style description with muted color', () => {
    // Arrange & Act
    render(<EmptyState title="No data" description="Some description" />);

    // Assert
    const description = screen.getByText('Some description');
    expect(description).toHaveClass('text-slate-400');
  });

  it('should constrain description width', () => {
    // Arrange & Act
    render(<EmptyState title="No data" description="A long description" />);

    // Assert
    const description = screen.getByText('A long description');
    expect(description).toHaveClass('max-w-md');
  });

  // ============================================
  // ICON CONTAINER STYLING
  // ============================================

  it('should style icon container', () => {
    // Arrange
    const TestIcon = () => <svg data-testid="icon" />;

    // Act
    const { container } = render(<EmptyState title="No data" icon={<TestIcon />} />);

    // Assert
    const iconContainer = container.querySelector('.w-16.h-16');
    expect(iconContainer).toHaveClass('rounded-full', 'bg-slate-700/50');
  });

  // ============================================
  // FULL COMPOSITION
  // ============================================

  it('should render all elements together', () => {
    // Arrange
    const TestIcon = () => <svg data-testid="custom-icon" />;

    // Act
    render(
      <EmptyState
        title="No projects found"
        description="Create your first project to get started"
        icon={<TestIcon />}
        action={<button>New Project</button>}
      />
    );

    // Assert
    expect(screen.getByText('No projects found')).toBeInTheDocument();
    expect(screen.getByText('Create your first project to get started')).toBeInTheDocument();
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument();
  });
});

describe('EmptyStateIcons', () => {
  // ============================================
  // PREDEFINED ICONS
  // ============================================

  it('should have noData icon', () => {
    // Arrange & Act
    render(<EmptyState title="No data" icon={EmptyStateIcons.noData} />);

    // Assert
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have noProjects icon', () => {
    // Arrange & Act
    render(<EmptyState title="No projects" icon={EmptyStateIcons.noProjects} />);

    // Assert
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have noResults icon', () => {
    // Arrange & Act
    render(<EmptyState title="No results" icon={EmptyStateIcons.noResults} />);

    // Assert
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have error icon with red color', () => {
    // Arrange & Act
    render(<EmptyState title="Error" icon={EmptyStateIcons.error} />);

    // Assert
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('text-red-400');
  });

  it('should have success icon with green color', () => {
    // Arrange & Act
    render(<EmptyState title="Success" icon={EmptyStateIcons.success} />);

    // Assert
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('text-green-400');
  });

  it('should style default icons with slate color', () => {
    // Arrange & Act
    render(<EmptyState title="No data" icon={EmptyStateIcons.noData} />);

    // Assert
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('text-slate-500');
  });

  it('should set icon size to w-8 h-8', () => {
    // Arrange & Act
    render(<EmptyState title="No data" icon={EmptyStateIcons.noData} />);

    // Assert
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('w-8', 'h-8');
  });
});
