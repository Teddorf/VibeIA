import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '../register/page';
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

describe('RegisterPage', () => {
  const mockPush = jest.fn();
  const mockRegister = jest.fn();
  const mockInitFromStorage = jest.fn();

  // Strong password that meets all requirements
  const strongPassword = 'MyStr0ng!Pass';

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useAuth as jest.Mock).mockReturnValue({
      register: mockRegister,
      isAuthenticated: false,
      initFromStorage: mockInitFromStorage,
    });
  });

  it('renders registration form', () => {
    render(<RegisterPage />);

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    // Button text is "Crear Cuenta" (Spanish)
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument();
  });

  it('shows link to login page', () => {
    render(<RegisterPage />);

    // Link text is "Iniciar sesión" (Spanish)
    const loginLink = screen.getByRole('link', { name: /iniciar sesi/i });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('handles successful registration', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({});

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/^email$/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^password$/i), strongPassword);
    await user.type(screen.getByLabelText(/confirm password/i), strongPassword);
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@test.com', strongPassword, 'Test User');
    });
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/^email$/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^password$/i), strongPassword);
    await user.type(screen.getByLabelText(/confirm password/i), 'differentpassword');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error when password is too short', async () => {
    const user = userEvent.setup();

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/^email$/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Short1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Short1!');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 12 characters')).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    mockRegister.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/^email$/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^password$/i), strongPassword);
    await user.type(screen.getByLabelText(/confirm password/i), strongPassword);
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    // Loading text is "Creando cuenta..." (Spanish)
    expect(screen.getByText(/creando cuenta/i)).toBeInTheDocument();
  });

  it('shows error on registration failure', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce({ response: { data: { message: 'Email already exists' } } });

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/^email$/i), 'existing@test.com');
    await user.type(screen.getByLabelText(/^password$/i), strongPassword);
    await user.type(screen.getByLabelText(/confirm password/i), strongPassword);
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  it('shows default error message on unknown error', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce(new Error('Network error'));

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/^email$/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^password$/i), strongPassword);
    await user.type(screen.getByLabelText(/confirm password/i), strongPassword);
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('Registration failed. Please try again.')).toBeInTheDocument();
    });
  });

  it('redirects to home when already authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      register: mockRegister,
      isAuthenticated: true,
      initFromStorage: mockInitFromStorage,
    });

    render(<RegisterPage />);

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('redirects to home on successful registration', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({});

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/^email$/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^password$/i), strongPassword);
    await user.type(screen.getByLabelText(/confirm password/i), strongPassword);
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
