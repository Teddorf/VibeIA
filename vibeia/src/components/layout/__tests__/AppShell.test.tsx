import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '../AppShell';
import { useAuth } from '@/contexts/AuthContext';

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock next/navigation
const mockPathname = jest.fn();
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => mockRouter,
}));

const mockUseAuth = useAuth as jest.Mock;

describe('AppShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Reset window width to desktop
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    mockPathname.mockReturnValue('/dashboard');
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com' },
      isAuthenticated: true,
      isLoading: false,
      logout: jest.fn(),
    });
  });

  // ============================================
  // HAPPY PATH
  // ============================================

  it('should render children content', () => {
    // Arrange
    const childContent = 'Test Content';

    // Act
    render(
      <AppShell>
        <div>{childContent}</div>
      </AppShell>
    );

    // Assert
    expect(screen.getByText(childContent)).toBeInTheDocument();
  });

  it('should render sidebar when user is authenticated', () => {
    // Arrange & Act
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Assert
    expect(screen.getByRole('navigation', { name: /sidebar/i })).toBeInTheDocument();
  });

  it('should render header component', () => {
    // Arrange & Act
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Assert
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('should render main content area with proper landmark', () => {
    // Arrange & Act
    render(
      <AppShell>
        <div>Main Content</div>
      </AppShell>
    );

    // Assert
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  // ============================================
  // SIDEBAR COLLAPSE/EXPAND
  // ============================================

  it('should toggle sidebar collapsed state when toggle button is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Act
    const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });
    await user.click(toggleButton);

    // Assert
    const sidebar = screen.getByRole('navigation', { name: /sidebar/i });
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');
  });

  it('should expand sidebar when collapsed and toggle is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Act - collapse then expand
    const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });
    await user.click(toggleButton); // collapse
    await user.click(toggleButton); // expand

    // Assert
    const sidebar = screen.getByRole('navigation', { name: /sidebar/i });
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  });

  it('should persist sidebar state in localStorage', async () => {
    // Arrange
    const user = userEvent.setup();
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Act
    const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });
    await user.click(toggleButton);

    // Assert
    expect(setItemSpy).toHaveBeenCalledWith('sidebar-collapsed', 'true');
    setItemSpy.mockRestore();
  });

  it('should restore sidebar state from localStorage on mount', () => {
    // Arrange
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('true');

    // Act
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Assert
    const sidebar = screen.getByRole('navigation', { name: /sidebar/i });
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');
  });

  // ============================================
  // RESPONSIVE BEHAVIOR
  // ============================================

  it('should hide sidebar on mobile by default', () => {
    // Arrange - simulate mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });

    // Act
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Trigger resize after render
    window.dispatchEvent(new Event('resize'));

    // Assert - sidebar's parent aside should have hidden class
    const aside = document.querySelector('aside');
    expect(aside).toHaveClass('hidden');
  });

  it('should show mobile menu button on small screens', () => {
    // Arrange
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });

    // Act
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Assert
    expect(screen.getByRole('button', { name: /open mobile menu/i })).toBeInTheDocument();
  });

  // ============================================
  // UNAUTHENTICATED STATE
  // ============================================

  it('should not render sidebar when user is not authenticated', () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: jest.fn(),
    });

    // Act
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Assert
    expect(screen.queryByRole('navigation', { name: /sidebar/i })).not.toBeInTheDocument();
  });

  it('should render full-width content when sidebar is hidden', () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: jest.fn(),
    });

    // Act
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Assert
    const main = screen.getByRole('main');
    expect(main).not.toHaveClass('ml-64'); // no sidebar margin
  });

  // ============================================
  // LOADING STATE
  // ============================================

  it('should show loading skeleton while auth is loading', () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      logout: jest.fn(),
    });

    // Act
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Assert
    expect(screen.getByTestId('appshell-loading')).toBeInTheDocument();
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have proper ARIA landmarks', () => {
    // Arrange & Act
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Assert
    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('navigation', { name: /sidebar/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should support keyboard navigation for sidebar toggle', () => {
    // Arrange
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Assert - toggle button should be focusable and have proper accessibility
    const toggleButton = screen.getByRole('button', { name: /toggle sidebar/i });
    expect(toggleButton).toHaveClass('focus:ring-2');
    expect(toggleButton).toHaveClass('focus:outline-none');

    // Button should be keyboard accessible (not have tabindex=-1)
    expect(toggleButton).not.toHaveAttribute('tabindex', '-1');
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle undefined children gracefully', () => {
    // Arrange & Act
    render(<AppShell>{undefined}</AppShell>);

    // Assert
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should handle multiple children', () => {
    // Arrange & Act
    render(
      <AppShell>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </AppShell>
    );

    // Assert
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
    expect(screen.getByText('Child 3')).toBeInTheDocument();
  });
});
