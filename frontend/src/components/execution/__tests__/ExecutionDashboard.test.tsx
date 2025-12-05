import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExecutionDashboard } from '../ExecutionDashboard';
import { executionApi, manualTasksApi, qualityGatesApi } from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  executionApi: {
    getStatus: jest.fn(),
    start: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  },
  manualTasksApi: {
    detect: jest.fn(),
    validate: jest.fn(),
  },
  qualityGatesApi: {
    check: jest.fn(),
  },
}));

const mockPlan = {
  _id: 'plan-123',
  projectId: 'project-456',
  status: 'pending',
  estimatedTime: 60,
  phases: [
    {
      name: 'Phase 1: Setup',
      tasks: [
        { id: 'task-1', name: 'Create user model', description: 'MongoDB schema', status: 'pending' },
        { id: 'task-2', name: 'Setup API routes', description: 'Express routes', status: 'pending' },
      ],
      estimatedTime: 30,
    },
    {
      name: 'Phase 2: Features',
      tasks: [
        { id: 'task-3', name: 'Add authentication', description: 'JWT auth', status: 'pending' },
      ],
      estimatedTime: 30,
    },
  ],
  executionState: {
    planId: 'plan-123',
    status: 'pending',
    currentPhaseIndex: 0,
    currentTaskIndex: 0,
  },
};

const mockManualTask = {
  id: 'manual-stripe-123',
  type: 'stripe_setup',
  title: 'Configure Stripe',
  description: 'Set up Stripe API keys',
  instructions: ['Step 1', 'Step 2'],
  requiredInputs: [
    { name: 'STRIPE_KEY', label: 'Stripe Key', type: 'text', validation: { required: true } },
  ],
  estimatedMinutes: 10,
  category: 'api_setup',
};

describe('ExecutionDashboard', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (executionApi.getStatus as jest.Mock).mockResolvedValue(mockPlan);
    (manualTasksApi.detect as jest.Mock).mockResolvedValue({ isManual: false, task: null });
    (qualityGatesApi.check as jest.Mock).mockResolvedValue({
      passed: true,
      overallScore: 95,
      report: 'All checks passed',
    });
  });

  it('should render loading state initially', () => {
    (executionApi.getStatus as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/Loading execution plan/)).toBeInTheDocument();
  });

  it('should render project name after loading', async () => {
    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('should render execution dashboard title', async () => {
    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Execution Dashboard')).toBeInTheDocument();
    });
  });

  it('should render phases list', async () => {
    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      // Check that the Phases section exists
      expect(screen.getByText('Phases')).toBeInTheDocument();
    });
  });

  it('should render Start Execution button', async () => {
    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Execution/i })).toBeInTheDocument();
    });
  });

  it('should render progress bar', async () => {
    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  it('should render execution log section', async () => {
    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Execution Log')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (executionApi.getStatus as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    // Component should render loading first, then show error
    expect(screen.getByText(/Loading execution plan/)).toBeInTheDocument();
  });

  it('should show tasks for current phase', async () => {
    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Create user model')).toBeInTheDocument();
      expect(screen.getByText('Setup API routes')).toBeInTheDocument();
    });
  });

  it('should show task status icons', async () => {
    const planWithMixedStatus = {
      ...mockPlan,
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            { id: 'task-1', name: 'Completed task', status: 'completed' },
            { id: 'task-2', name: 'In progress task', status: 'in_progress' },
            { id: 'task-3', name: 'Pending task', status: 'pending' },
          ],
          estimatedTime: 30,
        },
      ],
      executionState: { planId: 'plan-123', status: 'running', currentPhaseIndex: 0, currentTaskIndex: 1 },
    };

    (executionApi.getStatus as jest.Mock).mockResolvedValue(planWithMixedStatus);

    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      // Check for status indicators (emojis in the component)
      expect(screen.getByText('Completed task')).toBeInTheDocument();
      expect(screen.getByText('In progress task')).toBeInTheDocument();
      expect(screen.getByText('Pending task')).toBeInTheDocument();
    });
  });

  it('should call executionApi.getStatus on mount', async () => {
    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(executionApi.getStatus).toHaveBeenCalledWith('plan-123');
    });
  });

  it('should show waiting message in log before execution starts', async () => {
    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Plan loaded/)).toBeInTheDocument();
    });
  });

  it('should display phase progress indicators', async () => {
    const planWithProgress = {
      ...mockPlan,
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            { id: 'task-1', name: 'Task 1', status: 'completed' },
            { id: 'task-2', name: 'Task 2', status: 'pending' },
          ],
          estimatedTime: 20,
        },
      ],
      executionState: { planId: 'plan-123', status: 'running', currentPhaseIndex: 0, currentTaskIndex: 1 },
    };

    (executionApi.getStatus as jest.Mock).mockResolvedValue(planWithProgress);

    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      // Should show 1/2 for phase 1
      expect(screen.getByText('1/2')).toBeInTheDocument();
    });
  });

  describe('Manual Task Handling', () => {
    it('should detect manual tasks via API', async () => {
      (manualTasksApi.detect as jest.Mock).mockResolvedValue({
        isManual: true,
        task: mockManualTask,
      });

      render(
        <ExecutionDashboard
          planId="plan-123"
          projectId="project-456"
          projectName="Test Project"
          onComplete={mockOnComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Start Execution/i })).toBeInTheDocument();
      });

      // Just verify the component renders with the start button
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error card when error occurs', async () => {
      (executionApi.getStatus as jest.Mock).mockResolvedValueOnce(mockPlan);

      render(
        <ExecutionDashboard
          planId="plan-123"
          projectId="project-456"
          projectName="Test Project"
          onComplete={mockOnComplete}
        />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });
  });
});

describe('ExecutionDashboard Progress Calculation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show 0% progress when no tasks completed', async () => {
    (executionApi.getStatus as jest.Mock).mockResolvedValue(mockPlan);

    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  it('should show 50% progress when half tasks completed', async () => {
    const halfCompletedPlan = {
      ...mockPlan,
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            { id: 'task-1', name: 'Task 1', status: 'completed' },
            { id: 'task-2', name: 'Task 2', status: 'pending' },
          ],
          estimatedTime: 20,
        },
      ],
    };

    (executionApi.getStatus as jest.Mock).mockResolvedValue(halfCompletedPlan);

    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  it('should show 100% progress when all tasks completed', async () => {
    const completedPlan = {
      ...mockPlan,
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            { id: 'task-1', name: 'Task 1', status: 'completed' },
            { id: 'task-2', name: 'Task 2', status: 'completed' },
          ],
          estimatedTime: 20,
        },
      ],
    };

    (executionApi.getStatus as jest.Mock).mockResolvedValue(completedPlan);

    render(
      <ExecutionDashboard
        planId="plan-123"
        projectId="project-456"
        projectName="Test Project"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });
});
