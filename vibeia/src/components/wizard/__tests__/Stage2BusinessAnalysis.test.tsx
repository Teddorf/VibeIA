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
    await user.type(
      screen.getByPlaceholderText('Your answer...'),
      'Feature 1, Feature 2, Feature 3',
    );
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

// ============================================
// ALL QUESTIONS VIEW MODE (NEW)
// TDD: Tests written BEFORE implementation
// ============================================
describe('Stage2BusinessAnalysis - All Questions View', () => {
  const defaultProps = {
    onNext: jest.fn(),
    onBack: jest.fn(),
    viewMode: 'all' as const, // New prop to enable all-questions view
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // RENDERING ALL QUESTIONS
  // ============================================
  describe('Visualizacion de todas las preguntas', () => {
    it('should render all 5 questions visible at once when viewMode is "all"', () => {
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      // All questions should be visible
      expect(screen.getByText(/usuarios objetivo/i)).toBeInTheDocument();
      expect(screen.getByText(/funcionalidades principales/i)).toBeInTheDocument();
      expect(screen.getByText(/cuantos usuarios/i)).toBeInTheDocument();
      expect(screen.getByText(/integraciones/i)).toBeInTheDocument();
      expect(screen.getByText(/autenticacion/i)).toBeInTheDocument();
    });

    it('should render questions as expandable accordion sections', () => {
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      // Each question should be in an accordion
      const accordions = screen.getAllByTestId(/question-section-/);
      expect(accordions).toHaveLength(5);
    });

    it('should have first question expanded by default', () => {
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      const firstSection = screen.getByTestId('question-section-0');
      expect(firstSection).toHaveAttribute('data-expanded', 'true');
    });

    it('should collapse/expand sections when clicked', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      const firstHeader = screen.getByTestId('question-header-0');
      const firstSection = screen.getByTestId('question-section-0');

      // Initially expanded
      expect(firstSection).toHaveAttribute('data-expanded', 'true');

      // Click to collapse
      await user.click(firstHeader);
      expect(firstSection).toHaveAttribute('data-expanded', 'false');

      // Click to expand again
      await user.click(firstHeader);
      expect(firstSection).toHaveAttribute('data-expanded', 'true');
    });
  });

  // ============================================
  // COMPLETION INDICATORS
  // ============================================
  describe('Indicadores de completitud', () => {
    it('should show completion indicator for each question', () => {
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      const indicators = screen.getAllByTestId(/completion-indicator-/);
      expect(indicators).toHaveLength(5);
    });

    it('should mark question as incomplete initially', () => {
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      const indicator = screen.getByTestId('completion-indicator-0');
      expect(indicator).not.toHaveClass('completed');
    });

    it('should mark question as complete when answered', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      // Answer first question
      await user.type(screen.getByTestId('answer-input-0'), 'Developers');

      const indicator = screen.getByTestId('completion-indicator-0');
      expect(indicator).toHaveClass('completed');
    });

    it('should show green checkmark for completed questions', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      await user.type(screen.getByTestId('answer-input-0'), 'Test answer');

      const checkmark = screen.getByTestId('checkmark-0');
      expect(checkmark).toBeInTheDocument();
    });
  });

  // ============================================
  // PROGRESS BAR
  // ============================================
  describe('Barra de progreso', () => {
    it('should show progress bar with initial 0%', () => {
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should update progress bar to 20% when 1 question answered', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      await user.type(screen.getByTestId('answer-input-0'), 'Answer 1');

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '20');
    });

    it('should update progress bar to 100% when all questions answered', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      // Answer all 5 questions
      await user.type(screen.getByTestId('answer-input-0'), 'A1');
      await user.type(screen.getByTestId('answer-input-1'), 'A2');
      await user.selectOptions(screen.getByTestId('answer-select-2'), '100-1000');
      await user.type(screen.getByTestId('answer-input-3'), 'A4');
      await user.selectOptions(screen.getByTestId('answer-select-4'), 'Email/Password');

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should show progress text (e.g., "3/5 completadas")', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      await user.type(screen.getByTestId('answer-input-0'), 'A1');
      await user.type(screen.getByTestId('answer-input-1'), 'A2');
      await user.selectOptions(screen.getByTestId('answer-select-2'), '1-100');

      expect(screen.getByText(/3\/5/)).toBeInTheDocument();
    });
  });

  // ============================================
  // MINIMUM REQUIRED
  // ============================================
  describe('Minimo requerido', () => {
    it('should require minimum 3 questions answered to proceed', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      // Answer only 2 questions
      await user.type(screen.getByTestId('answer-input-0'), 'A1');
      await user.type(screen.getByTestId('answer-input-1'), 'A2');

      const nextButton = screen.getByRole('button', { name: /siguiente/i });
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when minimum 3 questions answered', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      // Answer 3 questions (minimum)
      await user.type(screen.getByTestId('answer-input-0'), 'A1');
      await user.type(screen.getByTestId('answer-input-1'), 'A2');
      await user.selectOptions(screen.getByTestId('answer-select-2'), '1-100');

      const nextButton = screen.getByRole('button', { name: /siguiente/i });
      expect(nextButton).not.toBeDisabled();
    });

    it('should show helper text about minimum questions', () => {
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      expect(screen.getByText(/responde al menos 3/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // SKIP OPTIONAL QUESTIONS
  // ============================================
  describe('Skip preguntas opcionales', () => {
    it('should show skip button for optional questions (4 and 5)', () => {
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      expect(screen.getByTestId('skip-question-3')).toBeInTheDocument();
      expect(screen.getByTestId('skip-question-4')).toBeInTheDocument();
    });

    it('should NOT show skip button for required questions (1, 2, 3)', () => {
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      expect(screen.queryByTestId('skip-question-0')).not.toBeInTheDocument();
      expect(screen.queryByTestId('skip-question-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('skip-question-2')).not.toBeInTheDocument();
    });

    it('should mark question as skipped when skip is clicked', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      await user.click(screen.getByTestId('skip-question-3'));

      const section = screen.getByTestId('question-section-3');
      expect(section).toHaveClass('skipped');
    });

    it('should collapse skipped question', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      await user.click(screen.getByTestId('skip-question-3'));

      const section = screen.getByTestId('question-section-3');
      expect(section).toHaveAttribute('data-expanded', 'false');
    });

    it('should allow unskipping a question', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      // Skip
      await user.click(screen.getByTestId('skip-question-3'));
      expect(screen.getByTestId('question-section-3')).toHaveClass('skipped');

      // Unskip by clicking header
      await user.click(screen.getByTestId('question-header-3'));
      expect(screen.getByTestId('question-section-3')).not.toHaveClass('skipped');
    });
  });

  // ============================================
  // SUBMIT DATA
  // ============================================
  describe('Envio de datos', () => {
    it('should call onNext with all answered data', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      render(<Stage2BusinessAnalysis {...defaultProps} onNext={onNext} />);

      // Answer required questions
      await user.type(screen.getByTestId('answer-input-0'), 'Developers');
      await user.type(screen.getByTestId('answer-input-1'), 'Feature A, Feature B');
      await user.selectOptions(screen.getByTestId('answer-select-2'), '1000-10000');

      // Click next
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(onNext).toHaveBeenCalledWith(
        expect.objectContaining({
          target_users: 'Developers',
          main_features: 'Feature A, Feature B',
          scalability: '1000-10000',
        }),
      );
    });

    it('should NOT include skipped questions in data', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      render(<Stage2BusinessAnalysis {...defaultProps} onNext={onNext} />);

      // Answer required + skip optional
      await user.type(screen.getByTestId('answer-input-0'), 'Users');
      await user.type(screen.getByTestId('answer-input-1'), 'Features');
      await user.selectOptions(screen.getByTestId('answer-select-2'), '1-100');
      await user.click(screen.getByTestId('skip-question-3'));
      await user.click(screen.getByTestId('skip-question-4'));

      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(onNext).toHaveBeenCalledWith({
        target_users: 'Users',
        main_features: 'Features',
        scalability: '1-100',
      });
    });
  });

  // ============================================
  // AUTO-EXPAND NEXT
  // ============================================
  describe('Auto-expandir siguiente', () => {
    it('should auto-expand next question when current is answered', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      // First question is expanded
      expect(screen.getByTestId('question-section-0')).toHaveAttribute('data-expanded', 'true');
      expect(screen.getByTestId('question-section-1')).toHaveAttribute('data-expanded', 'false');

      // Answer first question
      await user.type(screen.getByTestId('answer-input-0'), 'Test answer');

      // Second question should auto-expand
      expect(screen.getByTestId('question-section-1')).toHaveAttribute('data-expanded', 'true');
    });
  });

  // ============================================
  // KEYBOARD NAVIGATION
  // ============================================
  describe('Navegacion por teclado', () => {
    it('should allow Tab navigation between questions', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis {...defaultProps} />);

      // Tab through elements
      await user.tab();
      expect(screen.getByTestId('answer-input-0')).toHaveFocus();
    });

    it('should submit with Enter on last input when form is valid', async () => {
      const user = userEvent.setup();
      const onNext = jest.fn();
      render(<Stage2BusinessAnalysis {...defaultProps} onNext={onNext} />);

      // Fill minimum questions
      await user.type(screen.getByTestId('answer-input-0'), 'A1');
      await user.type(screen.getByTestId('answer-input-1'), 'A2');
      await user.selectOptions(screen.getByTestId('answer-select-2'), '1-100');

      // Press Enter on last focused element
      await user.keyboard('{Enter}');

      // Should NOT submit on Enter (need to click button)
      expect(onNext).not.toHaveBeenCalled();
    });
  });
});
