import { render, screen, fireEvent } from '@testing-library/react';
import { Stage1IntentDeclaration } from '../Stage1IntentDeclaration';

describe('Stage1IntentDeclaration', () => {
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component', () => {
    render(<Stage1IntentDeclaration onNext={mockOnNext} />);

    expect(screen.getByText(/Stage 1: What do you want to build?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/What do you want to build?/i)).toBeInTheDocument();
  });

  it('disables submit button when fields are empty', () => {
    render(<Stage1IntentDeclaration onNext={mockOnNext} />);

    const submitButton = screen.getByRole('button', { name: /Next: Business Analysis/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when both fields are filled', () => {
    render(<Stage1IntentDeclaration onNext={mockOnNext} />);

    const projectNameInput = screen.getByPlaceholderText(/e.g., E-commerce Platform/i);
    const descriptionInput = screen.getByPlaceholderText(/Describe your idea/i);

    fireEvent.change(projectNameInput, { target: { value: 'My Project' } });
    fireEvent.change(descriptionInput, { target: { value: 'A great project' } });

    const submitButton = screen.getByRole('button', { name: /Next: Business Analysis/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onNext with correct data when submitted', () => {
    render(<Stage1IntentDeclaration onNext={mockOnNext} />);

    const projectNameInput = screen.getByPlaceholderText(/e.g., E-commerce Platform/i);
    const descriptionInput = screen.getByPlaceholderText(/Describe your idea/i);

    fireEvent.change(projectNameInput, { target: { value: 'Test Project' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

    const submitButton = screen.getByRole('button', { name: /Next: Business Analysis/i });
    fireEvent.click(submitButton);

    expect(mockOnNext).toHaveBeenCalledWith({
      projectName: 'Test Project',
      description: 'Test Description',
    });
  });

  it('does not call onNext when fields are empty', () => {
    render(<Stage1IntentDeclaration onNext={mockOnNext} />);

    const submitButton = screen.getByRole('button', { name: /Next: Business Analysis/i });
    fireEvent.click(submitButton);

    expect(mockOnNext).not.toHaveBeenCalled();
  });
});
