import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Breadcrumbs } from '../Breadcrumbs';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/projects/123/settings',
}));

describe('Breadcrumbs', () => {
  // ============================================
  // HAPPY PATH - BASIC RENDERING
  // ============================================

  it('should render breadcrumb items', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
      { label: 'My Project', href: '/projects/123' },
    ];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('should render with nav landmark', () => {
    // Arrange
    const items = [{ label: 'Home', href: '/' }];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
  });

  it('should render as an ordered list', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
    ];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  // ============================================
  // LINKS VS CURRENT PAGE
  // ============================================

  it('should render all items except the last as links', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
      { label: 'Current Page', href: '/projects/123' },
    ];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    // Last item should not be a link
    expect(screen.queryByRole('link', { name: 'Current Page' })).not.toBeInTheDocument();
    expect(screen.getByText('Current Page')).toBeInTheDocument();
  });

  it('should mark the last item as current page', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Current', href: '/current' },
    ];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    const currentItem = screen.getByText('Current');
    expect(currentItem).toHaveAttribute('aria-current', 'page');
  });

  it('should render single item without link', () => {
    // Arrange
    const items = [{ label: 'Home', href: '/' }];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Home')).toHaveAttribute('aria-current', 'page');
  });

  // ============================================
  // SEPARATORS
  // ============================================

  it('should render separators between items', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
      { label: 'Current', href: '/current' },
    ];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    const separators = screen.getAllByTestId('breadcrumb-separator');
    expect(separators).toHaveLength(2); // n-1 separators
  });

  it('should render custom separator when provided', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
    ];

    // Act
    render(<Breadcrumbs items={items} separator=">" />);

    // Assert
    expect(screen.getByText('>')).toBeInTheDocument();
  });

  it('should hide separators from screen readers', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
    ];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    const separator = screen.getByTestId('breadcrumb-separator');
    expect(separator).toHaveAttribute('aria-hidden', 'true');
  });

  // ============================================
  // ICONS
  // ============================================

  it('should render home icon for first item when showHomeIcon is true', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
    ];

    // Act
    render(<Breadcrumbs items={items} showHomeIcon={true} />);

    // Assert
    expect(screen.getByTestId('home-icon')).toBeInTheDocument();
  });

  it('should render item icon when provided', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/', icon: 'home' },
      { label: 'Projects', href: '/projects', icon: 'folder' },
    ];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    expect(screen.getByTestId('icon-home')).toBeInTheDocument();
    expect(screen.getByTestId('icon-folder')).toBeInTheDocument();
  });

  // ============================================
  // TRUNCATION
  // ============================================

  it('should truncate long labels', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'This is a very long breadcrumb label that should be truncated', href: '/long' },
    ];

    // Act
    render(<Breadcrumbs items={items} maxLength={20} />);

    // Assert
    expect(screen.getByText(/This is a very long\.{3}/)).toBeInTheDocument();
  });

  it('should show full label in title attribute when truncated', () => {
    // Arrange
    const longLabel = 'This is a very long breadcrumb label';
    const items = [
      { label: 'Home', href: '/' },
      { label: longLabel, href: '/long' },
    ];

    // Act
    render(<Breadcrumbs items={items} maxLength={20} />);

    // Assert
    const truncatedElement = screen.getByText(/This is a very long\.{3}/);
    expect(truncatedElement).toHaveAttribute('title', longLabel);
  });

  // ============================================
  // COLLAPSING BEHAVIOR
  // ============================================

  it('should collapse middle items when maxItems is exceeded', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Level 1', href: '/1' },
      { label: 'Level 2', href: '/2' },
      { label: 'Level 3', href: '/3' },
      { label: 'Current', href: '/current' },
    ];

    // Act
    render(<Breadcrumbs items={items} maxItems={3} />);

    // Assert
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument(); // collapsed indicator
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.queryByText('Level 2')).not.toBeInTheDocument();
  });

  it('should expand collapsed items when ellipsis is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Level 1', href: '/1' },
      { label: 'Level 2', href: '/2' },
      { label: 'Current', href: '/current' },
    ];

    // Act
    render(<Breadcrumbs items={items} maxItems={2} />);
    const ellipsis = screen.getByRole('button', { name: /show more/i });
    await user.click(ellipsis);

    // Assert
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('Level 2')).toBeInTheDocument();
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have proper aria-label on navigation', () => {
    // Arrange
    const items = [{ label: 'Home', href: '/' }];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Breadcrumb');
  });

  it('should use semantic list structure', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
    ];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
  });

  it('should have proper link attributes', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Current', href: '/current' },
    ];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toHaveAttribute('href', '/');
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle empty items array', () => {
    // Arrange & Act
    render(<Breadcrumbs items={[]} />);

    // Assert
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('should handle items with same label', () => {
    // Arrange
    const items = [
      { label: 'Home', href: '/' },
      { label: 'Home', href: '/home' },
    ];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    const homes = screen.getAllByText('Home');
    expect(homes).toHaveLength(2);
  });

  it('should handle special characters in labels', () => {
    // Arrange
    const items = [
      { label: 'Home & Dashboard', href: '/' },
      { label: 'Project <Test>', href: '/project' },
    ];

    // Act
    render(<Breadcrumbs items={items} />);

    // Assert
    expect(screen.getByText('Home & Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Project <Test>')).toBeInTheDocument();
  });

  // ============================================
  // STYLING PROPS
  // ============================================

  it('should apply custom className', () => {
    // Arrange
    const items = [{ label: 'Home', href: '/' }];

    // Act
    render(<Breadcrumbs items={items} className="custom-class" />);

    // Assert
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-class');
  });

  it('should apply size variant styles', () => {
    // Arrange
    const items = [{ label: 'Home', href: '/' }];

    // Act
    render(<Breadcrumbs items={items} size="sm" />);

    // Assert
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('text-sm');
  });
});
