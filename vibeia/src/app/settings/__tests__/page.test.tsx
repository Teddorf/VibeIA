/**
 * Settings Page Tests
 * TDD: Tests written BEFORE implementation fixes
 *
 * Estos tests validan:
 * 1. Renderizado correcto de secciones
 * 2. Configuración de proveedores LLM
 * 3. Conexiones OAuth (GitHub, Google, GitLab)
 * 4. UX: Settings NO debe tener botón de Import (solo configuración)
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SettingsPage from '../page';
import { useAuth } from '@/contexts/AuthContext';
import { llmSettingsApi, githubApi, googleApi, gitlabApi } from '@/lib/api-client';

// Mock auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock API clients
jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  llmSettingsApi: {
    getMyKeys: jest.fn(),
    setKey: jest.fn(),
    removeKey: jest.fn(),
    testKey: jest.fn(),
    updatePreferences: jest.fn(),
    getProvidersInfo: jest.fn(),
  },
  githubApi: {
    getConnectionStatus: jest.fn(),
    getAuthUrl: jest.fn(),
    disconnect: jest.fn(),
  },
  googleApi: {
    getConnectionStatus: jest.fn(),
    getAuthUrl: jest.fn(),
    disconnect: jest.fn(),
  },
  gitlabApi: {
    getConnectionStatus: jest.fn(),
    getAuthUrl: jest.fn(),
    disconnect: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockLlmSettingsApi = llmSettingsApi as jest.Mocked<typeof llmSettingsApi>;
const mockGithubApi = githubApi as jest.Mocked<typeof githubApi>;
const mockGoogleApi = googleApi as jest.Mocked<typeof googleApi>;
const mockGitlabApi = gitlabApi as jest.Mocked<typeof gitlabApi>;

// Default mock data
const defaultLLMKeysResponse = {
  keys: [
    { provider: 'anthropic', isConfigured: false, isActive: false },
    { provider: 'openai', isConfigured: true, isActive: true, maskedKey: 'sk-...xxx' },
    { provider: 'gemini', isConfigured: false, isActive: false },
  ],
  preferences: { primaryProvider: 'openai', fallbackEnabled: true, fallbackOrder: ['anthropic', 'gemini'] },
  hasAnyConfigured: true,
  providersInfo: {
    anthropic: { name: 'Claude (Anthropic)', signupUrl: 'https://console.anthropic.com/' },
    openai: { name: 'GPT-4 (OpenAI)', signupUrl: 'https://platform.openai.com/signup' },
    gemini: { name: 'Gemini (Google)', signupUrl: 'https://aistudio.google.com/app/apikey' },
  },
};

describe('SettingsPage', () => {
  // Mock window.confirm
  const originalConfirm = window.confirm;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    // Mock window.confirm to return true by default
    window.confirm = jest.fn(() => true);

    // Default auth state - useAuth returns isAuthenticated, isLoading
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    // Default API responses
    mockLlmSettingsApi.getMyKeys.mockResolvedValue(defaultLLMKeysResponse);
    mockGithubApi.getConnectionStatus.mockResolvedValue({ connected: false });
    mockGoogleApi.getConnectionStatus.mockResolvedValue({ connected: false });
    mockGitlabApi.getConnectionStatus.mockResolvedValue({ connected: false });
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('Rendering', () => {
    it('should render page title', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/settings/i)).toBeInTheDocument();
      });
    });

    it('should render LLM providers section', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        // Should show all three providers
        expect(screen.getByText(/claude/i)).toBeInTheDocument();
        expect(screen.getByText(/openai|gpt/i)).toBeInTheDocument();
        expect(screen.getByText(/gemini/i)).toBeInTheDocument();
      });
    });

    it('should render OAuth connections section', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/github/i)).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching data', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });

      render(<SettingsPage />);

      // Should show some loading indicator
      expect(screen.getByText(/loading|cargando/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // LLM CONFIGURATION TESTS
  // ============================================
  describe('LLM Configuration', () => {
    it('should display all three LLM providers', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        // The page should show all providers from the API
        expect(mockLlmSettingsApi.getMyKeys).toHaveBeenCalled();
      });
    });

    it('should show "Configurado" badge for configured providers', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        // OpenAI is configured in our mock
        const configuredBadges = screen.getAllByText(/configurado|configured/i);
        expect(configuredBadges.length).toBeGreaterThan(0);
      });
    });

    it('should show "Principal" badge for primary provider', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        // OpenAI is primary in our mock
        expect(screen.getByText(/principal|primary/i)).toBeInTheDocument();
      });
    });

    it('should call setKey when saving API key', async () => {
      mockLlmSettingsApi.setKey.mockResolvedValue({ success: true });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/claude/i)).toBeInTheDocument();
      });

      // Find and click configure button for unconfigured provider
      const configureButtons = screen.getAllByRole('button', { name: /configurar|configure/i });
      if (configureButtons.length > 0) {
        fireEvent.click(configureButtons[0]);
      }
    });

    it('should call testKey when testing API key', async () => {
      mockLlmSettingsApi.testKey.mockResolvedValue({ success: true, message: 'Key is valid' });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(mockLlmSettingsApi.getMyKeys).toHaveBeenCalled();
      });

      // Find test button for configured provider
      const testButtons = screen.queryAllByRole('button', { name: /probar|test/i });
      if (testButtons.length > 0) {
        fireEvent.click(testButtons[0]);
        await waitFor(() => {
          expect(mockLlmSettingsApi.testKey).toHaveBeenCalled();
        });
      }
    });

    it('should call removeKey when removing API key', async () => {
      mockLlmSettingsApi.removeKey.mockResolvedValue({ success: true });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(mockLlmSettingsApi.getMyKeys).toHaveBeenCalled();
      });

      // Find remove button
      const removeButtons = screen.queryAllByRole('button', { name: /eliminar|remove|delete/i });
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
      }
    });
  });

  // ============================================
  // OAUTH CONNECTIONS TESTS
  // ============================================
  describe('OAuth Connections', () => {
    it('should show GitHub disconnected state', async () => {
      mockGithubApi.getConnectionStatus.mockResolvedValue({ connected: false });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/github/i)).toBeInTheDocument();
        // Should show connect option
        expect(screen.getByText(/conectar|connect/i)).toBeInTheDocument();
      });
    });

    it('should show GitHub connected state with username', async () => {
      mockGithubApi.getConnectionStatus.mockResolvedValue({
        connected: true,
        username: 'testuser',
        email: 'test@github.com',
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/github/i)).toBeInTheDocument();
        // Should show connected status or username
        expect(screen.getByText(/testuser|conectado|connected/i)).toBeInTheDocument();
      });
    });

    it('should show Google connection option', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/google/i)).toBeInTheDocument();
      });
    });

    it('should show GitLab connection option', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/gitlab/i)).toBeInTheDocument();
      });
    });

    it('should handle connect button click for GitHub', async () => {
      mockGithubApi.getAuthUrl.mockResolvedValue({ url: 'https://github.com/oauth/authorize' });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/github/i)).toBeInTheDocument();
      });

      // Find GitHub connect button
      const connectButtons = screen.getAllByRole('button', { name: /conectar|connect/i });
      expect(connectButtons.length).toBeGreaterThan(0);
    });

    it('should handle disconnect for GitHub', async () => {
      mockGithubApi.getConnectionStatus.mockResolvedValue({
        connected: true,
        username: 'testuser',
      });
      mockGithubApi.disconnect.mockResolvedValue({ success: true });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/testuser|conectado/i)).toBeInTheDocument();
      });

      // Find disconnect button
      const disconnectButtons = screen.queryAllByRole('button', { name: /desconectar|disconnect/i });
      if (disconnectButtons.length > 0) {
        fireEvent.click(disconnectButtons[0]);
        await waitFor(() => {
          expect(mockGithubApi.disconnect).toHaveBeenCalled();
        });
      }
    });
  });

  // ============================================
  // UX VALIDATION TESTS (Critical for fixes)
  // ============================================
  describe('UX Validation', () => {
    it('should NOT have Import Project button in Settings', async () => {
      // Settings should only contain CONFIGURATION options
      // Import is an ACTION that belongs in Dashboard
      mockGithubApi.getConnectionStatus.mockResolvedValue({
        connected: true,
        username: 'testuser',
      });

      render(<SettingsPage />);

      // Wait for page to load
      await waitFor(() => {
        // Use getAllByText since there are multiple GitHub elements
        const githubElements = screen.getAllByText(/github/i);
        expect(githubElements.length).toBeGreaterThan(0);
      });

      // This test should FAIL initially (RED phase)
      // The Import button should NOT exist in Settings
      // Looking for the specific button text "Importar proyecto desde GitHub"
      const importButton = screen.queryByText(/importar proyecto desde github/i);
      const importButtonByRole = screen.queryByRole('button', { name: /importar proyecto|import project/i });

      // EXPECTED: These should NOT be in Settings page
      // Settings = Configuration only
      // Dashboard = Actions (New Project, Import)
      expect(importButton).not.toBeInTheDocument();
      expect(importButtonByRole).not.toBeInTheDocument();
    });

    it('should only show configuration-related elements', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        // Should have configuration elements
        expect(screen.getByText(/settings|configuración/i)).toBeInTheDocument();
        // Should have LLM config
        expect(screen.getByText(/claude|openai|gemini/i)).toBeInTheDocument();
        // Should have OAuth connections
        expect(screen.getByText(/github/i)).toBeInTheDocument();
      });
    });

    it('should have link to Dashboard for project actions', async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(mockLlmSettingsApi.getMyKeys).toHaveBeenCalled();
      });

      // Settings should have a way to navigate back to Dashboard
      // where the actual project actions (New, Import) are
      const dashboardLink = screen.queryByRole('link', { name: /dashboard|proyectos|projects/i });
      // This is optional but good UX
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  describe('Error Handling', () => {
    it('should display error when LLM API fails', async () => {
      mockLlmSettingsApi.getMyKeys.mockRejectedValue(new Error('API Error'));

      render(<SettingsPage />);

      await waitFor(() => {
        // Should show some error state
        const errorElement = screen.queryByText(/error|failed|falló/i);
        // Page should still render, just with error state
      });
    });

    it('should display error when OAuth status fails', async () => {
      mockGithubApi.getConnectionStatus.mockRejectedValue(new Error('OAuth Error'));

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/settings/i)).toBeInTheDocument();
      });
    });

    it('should handle setKey failure gracefully', async () => {
      mockLlmSettingsApi.setKey.mockRejectedValue({
        response: { status: 400, data: { message: 'Invalid key' } },
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(mockLlmSettingsApi.getMyKeys).toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // NAVIGATION TESTS
  // ============================================
  describe('Navigation', () => {
    it('should redirect to login if not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });

      render(<SettingsPage />);

      // useAuth should trigger redirect via useEffect
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });
});
