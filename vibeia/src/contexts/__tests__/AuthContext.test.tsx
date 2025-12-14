import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';
import apiClient from '@/lib/api-client';

// Mock the api client
jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      response: {
        use: jest.fn(() => 1),
        eject: jest.fn(),
      },
    },
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test component that uses the auth context
function TestComponent() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{auth.isLoading.toString()}</span>
      <span data-testid="authenticated">{auth.isAuthenticated.toString()}</span>
      <span data-testid="user">{auth.user ? auth.user.email : 'null'}</span>
      <button onClick={() => auth.login('test@test.com', 'password')}>Login</button>
      <button onClick={() => auth.register('test@test.com', 'password', 'Test User')}>Register</button>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('provides initial unauthenticated state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('throws error when useAuth is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('handles login successfully', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        user: { id: '1', email: 'test@test.com', name: 'Test', role: 'user' },
      },
    };
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      await user.click(screen.getByText('Login'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('test@test.com');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'test-access-token');
  });

  it('handles registration successfully', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      data: {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        user: { id: '1', email: 'test@test.com', name: 'Test User', role: 'user' },
      },
    };
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      await user.click(screen.getByText('Register'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/auth/register', {
      email: 'test@test.com',
      password: 'password',
      name: 'Test User',
    });
  });

  it('handles logout', async () => {
    const user = userEvent.setup();

    // Setup initial authenticated state
    localStorageMock.setItem('auth_token', 'test-token');
    localStorageMock.setItem('refresh_token', 'test-refresh');
    localStorageMock.setItem('auth_user', JSON.stringify({ id: '1', email: 'test@test.com', name: 'Test', role: 'user' }));

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { id: '1', email: 'test@test.com', name: 'Test', role: 'user' },
    });
    (apiClient.post as jest.Mock).mockResolvedValueOnce({});

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await act(async () => {
      await user.click(screen.getByText('Logout'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
  });

  it('restores auth state from localStorage on mount', async () => {
    localStorageMock.setItem('auth_token', 'stored-token');
    localStorageMock.setItem('refresh_token', 'stored-refresh');
    localStorageMock.setItem('auth_user', JSON.stringify({ id: '1', email: 'stored@test.com', name: 'Stored', role: 'user' }));

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { id: '1', email: 'stored@test.com', name: 'Stored', role: 'user' },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('stored@test.com');
    });
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('stored@test.com');
    });
  });

  it('clears auth state when localStorage data is invalid (validation failure)', async () => {
    // Set valid token but invalid user data (missing email)
    localStorageMock.setItem('auth_token', 'valid-token');
    localStorageMock.setItem('refresh_token', 'valid-refresh');
    localStorageMock.setItem('auth_user', JSON.stringify({ id: '1', name: 'Incomplete User' })); // missing email and role

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should default to unauthenticated state because validation failed
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('clears auth state when localStorage data is malformed (JSON parse failure)', async () => {
    // Set valid token but MALFORMED JSON
    localStorageMock.setItem('auth_token', 'valid-token');
    localStorageMock.setItem('refresh_token', 'valid-refresh');
    localStorageMock.setItem('auth_user', '{ "id": 1, "name": "Broken JSON"'); // Missing closing brace

    // Mock console.error to prevent pollution during test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');

    consoleSpy.mockRestore();
  });
});
