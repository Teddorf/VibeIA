import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Stage2BusinessAnalysis } from '../Stage2BusinessAnalysis';

describe('Stage2BusinessAnalysis', () => {
  const defaultProps = {
    onNext: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render the component', () => {
    // Arrange & Act
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByText('Stage 2: Business Analysis')).toBeInTheDocument();
  });

  it('should render the first question', () => {
    // Arrange & Act
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByText('Who are your target users?')).toBeInTheDocument();
  });

  it('should show question progress indicator', () => {
    // Arrange & Act
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
  });

  it('should render navigation buttons', () => {
    // Arrange & Act
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();
  });

  // ============================================
  // INPUT TYPES
  // ============================================

  it('should render textarea for textarea type questions', () => {
    // Arrange & Act
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByPlaceholderText('Your answer...')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '6');
  });

  it('should render select for select type questions', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Act - navigate to scalability question (3rd question, index 2)
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test users');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Feature 1, Feature 2');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Assert
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('1-100')).toBeInTheDocument();
    expect(screen.getByText('10000+')).toBeInTheDocument();
  });

  // ============================================
  // NAVIGATION
  // ============================================

  it('should advance to next question when Next is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Act
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test users');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Assert
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();
    expect(screen.getByText('What are the 3-5 main features you need?')).toBeInTheDocument();
  });

  it('should go back to previous question when Back is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Navigate to question 2
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test users');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument();

    // Act - go back
    await user.click(screen.getByRole('button', { name: /back/i }));

    // Assert
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Who are your target users?')).toBeInTheDocument();
  });

  it('should call onBack when Back is clicked on first question', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /back/i }));

    // Assert
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('should call onNext with all answers when completing last question', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Act - answer all 5 questions
    // Q1: Target users (textarea)
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Small business owners');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Q2: Main features (textarea)
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Feature 1, Feature 2, Feature 3');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Q3: Scalability (select)
    await user.selectOptions(screen.getByRole('combobox'), '100-1000');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Q4: Integrations (textarea)
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Stripe, SendGrid');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Q5: Auth (select) - last question
    expect(screen.getByText('Question 5 of 5')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox'), 'Social Login (Google, GitHub)');
    await user.click(screen.getByRole('button', { name: /next: technical analysis/i }));

    // Assert
    expect(defaultProps.onNext).toHaveBeenCalledWith({
      target_users: 'Small business owners',
      main_features: 'Feature 1, Feature 2, Feature 3',
      scalability: '100-1000',
      integrations: 'Stripe, SendGrid',
      auth_requirements: 'Social Login (Google, GitHub)',
    });
  });

  // ============================================
  // BUTTON TEXT
  // ============================================

  it('should show "Next Question" for non-last questions', () => {
    // Arrange & Act
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();
  });

  it('should show "Next: Technical Analysis" on last question', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Navigate to last question
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await user.selectOptions(screen.getByRole('combobox'), '1-100');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Assert
    expect(screen.getByText('Question 5 of 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next: technical analysis/i })).toBeInTheDocument();
  });

  // ============================================
  // DISABLED STATE
  // ============================================

  it('should disable Next button when answer is empty', () => {
    // Arrange & Act
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Assert
    expect(screen.getByRole('button', { name: /next question/i })).toBeDisabled();
  });

  it('should enable Next button when answer is provided', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Act
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test answer');

    // Assert
    expect(screen.getByRole('button', { name: /next question/i })).toBeEnabled();
  });

  it('should disable Next button for select when no option selected', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Navigate to select question
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Assert
    expect(screen.getByRole('button', { name: /next question/i })).toBeDisabled();
  });

  // ============================================
  // INITIAL DATA
  // ============================================

  it('should pre-populate answers from initialData', () => {
    // Arrange
    const initialData = {
      target_users: 'Existing users data',
    };

    // Act
    render(<Stage2BusinessAnalysis {...defaultProps} initialData={initialData} />);

    // Assert
    expect(screen.getByDisplayValue('Existing users data')).toBeInTheDocument();
  });

  it('should preserve answers when navigating back and forth', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Act - enter answer, go forward, come back
    await user.type(screen.getByPlaceholderText('Your answer...'), 'My target users');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await user.click(screen.getByRole('button', { name: /back/i }));

    // Assert
    expect(screen.getByDisplayValue('My target users')).toBeInTheDocument();
  });

  // ============================================
  // QUESTION CONTENT
  // ============================================

  it('should display all 5 questions correctly', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage2BusinessAnalysis {...defaultProps} />);
    const questions = [
      'Who are your target users?',
      'What are the 3-5 main features you need?',
      'How many users do you expect?',
      'Do you need integrations with external services? (e.g., Stripe, SendGrid)',
      'What authentication methods do you need?',
    ];

    // Assert each question
    for (let i = 0; i < questions.length; i++) {
      expect(screen.getByText(questions[i])).toBeInTheDocument();

      if (i < questions.length - 1) {
        // Answer and go to next
        const input = screen.queryByPlaceholderText('Your answer...');
        const select = screen.queryByRole('combobox');

        if (input) {
          await user.type(input, 'Test answer');
        } else if (select) {
          const options = select.querySelectorAll('option');
          await user.selectOptions(select, (options[1] as HTMLOptionElement).value);
        }
        await user.click(screen.getByRole('button', { name: /next/i }));
      }
    }
  });

  // ============================================
  // SELECT OPTIONS
  // ============================================

  it('should show scalability options correctly', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Navigate to scalability question
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Assert
    expect(screen.getByText('Select an option...')).toBeInTheDocument();
    expect(screen.getByText('1-100')).toBeInTheDocument();
    expect(screen.getByText('100-1000')).toBeInTheDocument();
    expect(screen.getByText('1000-10000')).toBeInTheDocument();
    expect(screen.getByText('10000+')).toBeInTheDocument();
  });

  it('should show auth options correctly', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Stage2BusinessAnalysis {...defaultProps} />);

    // Navigate to auth question (5th)
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await user.selectOptions(screen.getByRole('combobox'), '1-100');
    await user.click(screen.getByRole('button', { name: /next question/i }));
    await user.type(screen.getByPlaceholderText('Your answer...'), 'Test');
    await user.click(screen.getByRole('button', { name: /next question/i }));

    // Assert
    expect(screen.getByText('Email/Password')).toBeInTheDocument();
    expect(screen.getByText('Social Login (Google, GitHub)')).toBeInTheDocument();
    expect(screen.getByText('Magic Link')).toBeInTheDocument();
    expect(screen.getByText('All of the above')).toBeInTheDocument();
  });
});
