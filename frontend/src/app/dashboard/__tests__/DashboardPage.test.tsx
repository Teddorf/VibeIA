import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../page';
import { useRequireAuth } from '@/contexts/AuthContext';
import { projectsApi, plansApi } from '@/lib/api-client';

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useRequireAuth: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  projectsApi: {
    getAll: jest.fn(),
  },
  plansApi: {
    getAll: jest.fn(),
  },
}));

const mockUseRequireAuth = useRequireAuth as jest.Mock;
const mockProjectsApi = projectsApi as jest.Mocked<typeof projectsApi>;
const mockPlansApi = plansApi as jest.Mocked<typeof plansApi>;

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRequireAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@test.com' },
      isLoading: false,
    });
    mockProjectsApi.getAll.mockResolvedValue([]);
    mockPlansApi.getAll.mockResolvedValue([]);
  });

  it('shows loading state while auth is loading', () => {
    mockUseRequireAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    render(<DashboardPage />);
    expect(screen.getByText(/loading your projects/i)).toBeInTheDocument();
  });

  it('displays welcome message with user name', async () => {
    mockUseRequireAuth.mockReturnValue({
      user: { id: '1', name: 'John Doe', email: 'john@test.com' },
      isLoading: false,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/welcome back, john!/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no projects exist', async () => {
    mockProjectsApi.getAll.mockResolvedValue([]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
    });
  });

  it('displays project cards when projects exist', async () => {
    const mockProjects = [
      {
        _id: '1',
        name: 'Test Project',
        description: 'A test project',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    mockProjectsApi.getAll.mockResolvedValue(mockProjects);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('shows "New Project" button', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /new project/i })).toBeInTheDocument();
    });
  });
});
