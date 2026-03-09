import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../login/page';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock OAuthButtons
jest.mock('@/components/auth/OAuthButtons', () => ({
  OAuthButtons: () => <div data-testid="oauth-buttons">OAuth Buttons</div>,
}));

describe('LoginPage', () => {
  const mockPush = jest.fn();
  const mockLogin = jest.fn();
  const mockInitFromStorage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      initFromStorage: mockInitFromStorage,
    });
  });

  it('renders login form', () => {
    render(<LoginPage />);

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    // Button text is "Iniciar Sesion" (Spanish)
    expect(screen.getByRole('button', { name: /iniciar sesion/i })).toBeInTheDocument();
  });

  it('shows link to register page', () => {
    render(<LoginPage />);

    const registerLink = screen.getByRole('link', { name: /sign up/i });
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('handles form submission', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({});

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123');
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }));

    // Loading text is "Iniciando sesion..." (Spanish)
    expect(screen.getByText(/iniciando sesion/i)).toBeInTheDocument();
  });

  it('shows error on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce({ response: { data: { message: 'Invalid credentials' } } });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('shows default error message on unknown error', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('Network error'));

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('redirects to home when already authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      isAuthenticated: true,
      initFromStorage: mockInitFromStorage,
    });

    render(<LoginPage />);

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('redirects to home on successful login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({});

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar sesion/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
