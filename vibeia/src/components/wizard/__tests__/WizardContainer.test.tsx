import { render, screen, fireEvent } from '@testing-library/react';
import { WizardContainer } from '../WizardContainer';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock useWizardMode to start in standard mode with preference
jest.mock('../hooks/useWizardMode', () => ({
  useWizardMode: () => ({
    mode: 'standard' as const,
    setMode: jest.fn(),
    hasPreference: true,
    userExperience: 'intermediate',
    clearPreference: jest.fn(),
  }),
  WizardMode: {},
}));

// Mock useWizardProgress to have no saved progress
jest.mock('../hooks/useWizardProgress', () => ({
  useWizardProgress: () => ({
    savedProgress: null,
    hasRestorable: false,
    updateProgress: jest.fn(),
    restoreProgress: jest.fn(),
    clearProgress: jest.fn(),
  }),
}));

// Mock ExecutionDashboard to avoid heavy component loading
jest.mock('@/components/execution/ExecutionDashboard', () => ({
  ExecutionDashboard: () => <div>Execution Dashboard</div>,
}));

describe('WizardContainer', () => {
  it('renders Stage 1 initially when mode preference exists', () => {
    render(<WizardContainer />);

    expect(screen.getByText(/Stage 1: What do you want to build?/i)).toBeInTheDocument();
  });

  it('shows progress indicator', () => {
    render(<WizardContainer />);

    // Progress text is in Spanish: "Paso 1 de 5" / "0% Completo"
    expect(screen.getByText(/paso 1 de 5/i)).toBeInTheDocument();
    expect(screen.getByText(/0% completo/i)).toBeInTheDocument();
  });

  it('progresses to Stage 2 when Stage 1 is completed', () => {
    render(<WizardContainer />);

    // Fill Stage 1
    const projectNameInput = screen.getByPlaceholderText(/e.g., E-commerce Platform/i);
    const descriptionInput = screen.getByPlaceholderText(/Describe your idea/i);

    fireEvent.change(projectNameInput, { target: { value: 'Test Project' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

    const nextButton = screen.getByRole('button', { name: /Next: Business Analysis/i });
    fireEvent.click(nextButton);

    // Should now be on Stage 2
    expect(screen.getByText(/Stage 2: Business Analysis/i)).toBeInTheDocument();
  });

  it('allows navigation back from Stage 2 to Stage 1', () => {
    render(<WizardContainer />);

    // Progress to Stage 2
    const projectNameInput = screen.getByPlaceholderText(/e.g., E-commerce Platform/i);
    const descriptionInput = screen.getByPlaceholderText(/Describe your idea/i);

    fireEvent.change(projectNameInput, { target: { value: 'Test' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test' } });

    fireEvent.click(screen.getByRole('button', { name: /Next: Business Analysis/i }));

    // Go back
    const backButton = screen.getByRole('button', { name: /atrás|back/i });
    fireEvent.click(backButton);

    // Should be back on Stage 1
    expect(screen.getByText(/Stage 1: What do you want to build?/i)).toBeInTheDocument();
  });
});
