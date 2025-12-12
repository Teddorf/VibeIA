import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../Sidebar';
import { useAuth } from '@/contexts/AuthContext';

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock next/navigation
const mockPathname = jest.fn();
const mockRouter = {
  push: jest.fn(),
};
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => mockRouter,
}));

const mockUseAuth = useAuth as jest.Mock;

// Default navigation items for testing
const defaultNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' },
  { name: 'Projects', href: '/projects', icon: 'folder' },
  { name: 'Settings', href: '/settings', icon: 'settings' },
];

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/dashboard');
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com' },
      isAuthenticated: true,
      isLoading: false,
      logout: jest.fn(),
    });
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render navigation items', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} />);

    // Assert
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('should render with navigation landmark', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} />);

    // Assert
    expect(screen.getByRole('navigation', { name: /sidebar/i })).toBeInTheDocument();
  });

  it('should render icons for each navigation item', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} />);

    // Assert
    expect(screen.getByTestId('icon-home')).toBeInTheDocument();
    expect(screen.getByTestId('icon-folder')).toBeInTheDocument();
    expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
  });

  // ============================================
  // ACTIVE STATE
  // ============================================

  it('should highlight active navigation item based on current path', () => {
    // Arrange
    mockPathname.mockReturnValue('/dashboard');

    // Act
    render(<Sidebar items={defaultNavItems} />);

    // Assert
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    expect(dashboardLink).toHaveClass('bg-purple-500/20');
  });

  it('should not highlight inactive navigation items', () => {
    // Arrange
    mockPathname.mockReturnValue('/dashboard');

    // Act
    render(<Sidebar items={defaultNavItems} />);

    // Assert
    const projectsLink = screen.getByRole('link', { name: /projects/i });
    expect(projectsLink).not.toHaveAttribute('aria-current');
    expect(projectsLink).not.toHaveClass('bg-purple-500/20');
  });

  it('should match nested routes to parent item', () => {
    // Arrange
    mockPathname.mockReturnValue('/projects/123/settings');

    // Act
    render(<Sidebar items={defaultNavItems} />);

    // Assert
    const projectsLink = screen.getByRole('link', { name: /projects/i });
    expect(projectsLink).toHaveAttribute('aria-current', 'page');
  });

  // ============================================
  // COLLAPSED STATE
  // ============================================

  it('should render in expanded state by default', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} />);

    // Assert
    const sidebar = screen.getByRole('navigation', { name: /sidebar/i });
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  });

  it('should render in collapsed state when collapsed prop is true', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} collapsed={true} />);

    // Assert
    const sidebar = screen.getByRole('navigation', { name: /sidebar/i });
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');
  });

  it('should hide text labels when collapsed', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} collapsed={true} />);

    // Assert
    const labels = screen.queryAllByTestId('nav-label');
    labels.forEach(label => {
      expect(label).toHaveClass('hidden');
    });
  });

  it('should show text labels when expanded', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} collapsed={false} />);

    // Assert
    expect(screen.getByText('Dashboard')).toBeVisible();
    expect(screen.getByText('Projects')).toBeVisible();
    expect(screen.getByText('Settings')).toBeVisible();
  });

  it('should show tooltips on hover when collapsed', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Sidebar items={defaultNavItems} collapsed={true} />);

    // Act
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    await user.hover(dashboardLink);

    // Assert
    expect(screen.getByRole('tooltip')).toHaveTextContent('Dashboard');
  });

  // ============================================
  // WIDTH TRANSITIONS
  // ============================================

  it('should have expanded width class when not collapsed', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} collapsed={false} />);

    // Assert
    const sidebar = screen.getByRole('navigation', { name: /sidebar/i });
    expect(sidebar).toHaveClass('w-64');
  });

  it('should have collapsed width class when collapsed', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} collapsed={true} />);

    // Assert
    const sidebar = screen.getByRole('navigation', { name: /sidebar/i });
    expect(sidebar).toHaveClass('w-16');
  });

  // ============================================
  // TOGGLE CALLBACK
  // ============================================

  it('should call onToggle when toggle button is clicked', async () => {
    // Arrange
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(<Sidebar items={defaultNavItems} onToggle={onToggle} />);

    // Act
    const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });
    await user.click(toggleButton);

    // Assert
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  // ============================================
  // SECTIONS/GROUPS
  // ============================================

  it('should render navigation sections with headers', () => {
    // Arrange
    const itemsWithSections = [
      { name: 'Dashboard', href: '/dashboard', icon: 'home', section: 'Main' },
      { name: 'Projects', href: '/projects', icon: 'folder', section: 'Main' },
      { name: 'Settings', href: '/settings', icon: 'settings', section: 'Account' },
    ];

    // Act
    render(<Sidebar items={itemsWithSections} />);

    // Assert
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('should hide section headers when collapsed', () => {
    // Arrange
    const itemsWithSections = [
      { name: 'Dashboard', href: '/dashboard', icon: 'home', section: 'Main' },
    ];

    // Act
    render(<Sidebar items={itemsWithSections} collapsed={true} />);

    // Assert
    const sectionHeader = screen.queryByText('Main');
    expect(sectionHeader).toHaveClass('hidden');
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have proper ARIA attributes', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} />);

    // Assert
    const nav = screen.getByRole('navigation', { name: /sidebar/i });
    expect(nav).toHaveAttribute('aria-label', 'Sidebar navigation');
  });

  it('should support keyboard navigation between items', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Sidebar items={defaultNavItems} />);

    // Act
    const firstLink = screen.getByRole('link', { name: /dashboard/i });
    firstLink.focus();
    await user.keyboard('{Tab}');

    // Assert
    const secondLink = screen.getByRole('link', { name: /projects/i });
    expect(secondLink).toHaveFocus();
  });

  it('should have focus visible styles', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} />);

    // Assert
    const link = screen.getByRole('link', { name: /dashboard/i });
    expect(link).toHaveClass('focus:ring-2');
  });

  // ============================================
  // BADGES/NOTIFICATIONS
  // ============================================

  it('should render badge when item has badge prop', () => {
    // Arrange
    const itemsWithBadge = [
      { name: 'Projects', href: '/projects', icon: 'folder', badge: 5 },
    ];

    // Act
    render(<Sidebar items={itemsWithBadge} />);

    // Assert
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render badge text when provided', () => {
    // Arrange
    const itemsWithBadge = [
      { name: 'Updates', href: '/updates', icon: 'bell', badge: 'New' },
    ];

    // Act
    render(<Sidebar items={itemsWithBadge} />);

    // Assert
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle empty items array', () => {
    // Arrange & Act
    render(<Sidebar items={[]} />);

    // Assert
    const nav = screen.getByRole('navigation', { name: /sidebar/i });
    expect(nav).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('should handle items without icons gracefully', () => {
    // Arrange
    const itemsNoIcon = [
      { name: 'Dashboard', href: '/dashboard' },
    ];

    // Act
    render(<Sidebar items={itemsNoIcon} />);

    // Assert
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('should handle external links', () => {
    // Arrange
    const itemsWithExternal = [
      { name: 'Docs', href: 'https://docs.example.com', icon: 'book', external: true },
    ];

    // Act
    render(<Sidebar items={itemsWithExternal} />);

    // Assert
    const link = screen.getByRole('link', { name: /docs/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // ============================================
  // USER INFO SECTION
  // ============================================

  it('should render user info at the bottom when showUser is true', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} showUser={true} />);

    // Assert
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@test.com')).toBeInTheDocument();
  });

  it('should not render user info when showUser is false', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} showUser={false} />);

    // Assert
    expect(screen.queryByText('Test User')).not.toBeInTheDocument();
  });

  it('should hide user email when collapsed', () => {
    // Arrange & Act
    render(<Sidebar items={defaultNavItems} showUser={true} collapsed={true} />);

    // Assert - email should not be in the document when collapsed
    expect(screen.queryByText('test@test.com')).not.toBeInTheDocument();
  });
});
