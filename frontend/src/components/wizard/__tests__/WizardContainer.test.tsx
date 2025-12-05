import { render, screen, fireEvent } from '@testing-library/react';
import { WizardContainer } from '../WizardContainer';

describe('WizardContainer', () => {
  it('renders Stage 1 initially', () => {
    render(<WizardContainer />);

    expect(screen.getByText(/Stage 1: What do you want to build?/i)).toBeInTheDocument();
  });

  it('shows progress indicator', () => {
    render(<WizardContainer />);

    expect(screen.getByText(/Stage 1 of 4/i)).toBeInTheDocument();
    expect(screen.getByText(/20% Complete/i)).toBeInTheDocument();
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
    const backButton = screen.getByRole('button', { name: /Back/i });
    fireEvent.click(backButton);

    // Should be back on Stage 1
    expect(screen.getByText(/Stage 1: What do you want to build?/i)).toBeInTheDocument();
  });
});
