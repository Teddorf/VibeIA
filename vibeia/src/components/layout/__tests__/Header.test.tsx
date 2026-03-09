import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';
import { useAuth } from '@/contexts/AuthContext';

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock next/navigation
const mockPathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

const mockUseAuth = useAuth as jest.Mock;

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/dashboard');
  });

  it('does not render on login page', () => {
    mockPathname.mockReturnValue('/login');
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: jest.fn(),
    });

    const { container } = render(<Header />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render on register page', () => {
    mockPathname.mockReturnValue('/register');
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: jest.fn(),
    });

    const { container } = render(<Header />);
    expect(container.firstChild).toBeNull();
  });

  it('shows sign in and get started buttons when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: jest.fn(),
    });

    render(<Header />);

    // Spanish text: "Iniciar Sesion" and "Comenzar"
    expect(screen.getByRole('link', { name: /iniciar sesion/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /comenzar/i })).toBeInTheDocument();
  });

  it('shows user menu when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'John Doe', email: 'john@test.com' },
      isAuthenticated: true,
      isLoading: false,
      logout: jest.fn(),
    });

    render(<Header />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
  });

  it('shows navigation links when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com' },
      isAuthenticated: true,
      isLoading: false,
      logout: jest.fn(),
    });

    render(<Header />);

    // Get the main navigation container and check links within it
    const nav = screen.getByRole('navigation', { name: /navegacion principal/i });
    expect(nav).toBeInTheDocument();

    // Check for Dashboard link (exact match to avoid logo link)
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toBeInTheDocument();

    // Navigation links
    expect(screen.getByRole('link', { name: /new project/i })).toBeInTheDocument();
  });

  it('shows VibeCoding logo', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: jest.fn(),
    });

    render(<Header />);

    expect(screen.getByText(/vibecoding/i)).toBeInTheDocument();
  });

  it('highlights active navigation link', () => {
    mockPathname.mockReturnValue('/dashboard');
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com' },
      isAuthenticated: true,
      isLoading: false,
      logout: jest.fn(),
    });

    render(<Header />);

    // Use exact match to get only the navigation link, not the logo
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveClass('bg-purple-500/20');
  });

  it('shows loading state for user avatar', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      logout: jest.fn(),
    });

    render(<Header />);

    // Should show loading pulse
    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });
});
