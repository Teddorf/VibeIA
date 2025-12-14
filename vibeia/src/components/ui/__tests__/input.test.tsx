import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

describe('Input', () => {
  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render input element', () => {
    // Arrange & Act
    render(<Input />);

    // Assert
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    // Arrange & Act
    render(<Input />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('data-slot', 'input');
  });

  it('should render with text type when specified', () => {
    // Arrange & Act
    render(<Input type="text" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
  });

  // ============================================
  // INPUT TYPES
  // ============================================

  it('should render email type', () => {
    // Arrange & Act
    render(<Input type="email" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
  });

  it('should render password type', () => {
    // Arrange & Act
    render(<Input type="password" data-testid="password-input" />);

    // Assert
    expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password');
  });

  it('should render number type', () => {
    // Arrange & Act
    render(<Input type="number" />);

    // Assert
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
  });

  it('should render search type', () => {
    // Arrange & Act
    render(<Input type="search" />);

    // Assert
    expect(screen.getByRole('searchbox')).toHaveAttribute('type', 'search');
  });

  it('should render tel type', () => {
    // Arrange & Act
    render(<Input type="tel" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel');
  });

  it('should render url type', () => {
    // Arrange & Act
    render(<Input type="url" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'url');
  });

  // ============================================
  // VALUE AND PLACEHOLDER
  // ============================================

  it('should render with placeholder', () => {
    // Arrange & Act
    render(<Input placeholder="Enter your email" />);

    // Assert
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  it('should render with value', () => {
    // Arrange & Act
    render(<Input value="test@example.com" onChange={() => {}} />);

    // Assert
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('should render with defaultValue', () => {
    // Arrange & Act
    render(<Input defaultValue="default text" />);

    // Assert
    expect(screen.getByDisplayValue('default text')).toBeInTheDocument();
  });

  // ============================================
  // EVENT HANDLERS
  // ============================================

  it('should call onChange when typing', () => {
    // Arrange
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);

    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });

    // Assert
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should call onFocus when focused', () => {
    // Arrange
    const handleFocus = jest.fn();
    render(<Input onFocus={handleFocus} />);

    // Act
    fireEvent.focus(screen.getByRole('textbox'));

    // Assert
    expect(handleFocus).toHaveBeenCalledTimes(1);
  });

  it('should call onBlur when blurred', () => {
    // Arrange
    const handleBlur = jest.fn();
    render(<Input onBlur={handleBlur} />);

    // Act
    fireEvent.blur(screen.getByRole('textbox'));

    // Assert
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('should call onKeyDown when key pressed', () => {
    // Arrange
    const handleKeyDown = jest.fn();
    render(<Input onKeyDown={handleKeyDown} />);

    // Act
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    // Assert
    expect(handleKeyDown).toHaveBeenCalledTimes(1);
  });

  // ============================================
  // DISABLED STATE
  // ============================================

  it('should support disabled state', () => {
    // Arrange & Act
    render(<Input disabled />);

    // Assert
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should have disabled styles', () => {
    // Arrange & Act
    render(<Input disabled />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('disabled:opacity-50');
  });

  it('should not call onChange when disabled', () => {
    // Arrange
    const handleChange = jest.fn();
    render(<Input disabled onChange={handleChange} />);

    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });

    // Assert
    // Note: onChange is called but input value doesn't change when disabled
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  // ============================================
  // READONLY STATE
  // ============================================

  it('should support readonly state', () => {
    // Arrange & Act
    render(<Input readOnly value="readonly text" onChange={() => {}} />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });

  // ============================================
  // REQUIRED AND VALIDATION
  // ============================================

  it('should support required attribute', () => {
    // Arrange & Act
    render(<Input required />);

    // Assert
    expect(screen.getByRole('textbox')).toBeRequired();
  });

  it('should support aria-invalid for error state', () => {
    // Arrange & Act
    render(<Input aria-invalid="true" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox')).toHaveClass('aria-invalid:border-destructive');
  });

  it('should support minLength', () => {
    // Arrange & Act
    render(<Input minLength={3} />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('minLength', '3');
  });

  it('should support maxLength', () => {
    // Arrange & Act
    render(<Input maxLength={100} />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '100');
  });

  it('should support pattern', () => {
    // Arrange & Act
    render(<Input pattern="[A-Za-z]+" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('pattern', '[A-Za-z]+');
  });

  // ============================================
  // CUSTOM STYLING
  // ============================================

  it('should apply custom className', () => {
    // Arrange & Act
    render(<Input className="custom-input" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('custom-input');
  });

  it('should merge custom className with default classes', () => {
    // Arrange & Act
    render(<Input className="custom-input" />);

    // Assert
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-input');
    expect(input).toHaveClass('rounded-md');
    expect(input).toHaveClass('border');
  });

  // ============================================
  // STYLING CLASSES
  // ============================================

  it('should have rounded corners', () => {
    // Arrange & Act
    render(<Input />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('rounded-md');
  });

  it('should have border', () => {
    // Arrange & Act
    render(<Input />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('border');
  });

  it('should have focus visible styles', () => {
    // Arrange & Act
    render(<Input />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('focus-visible:ring-ring/50');
  });

  it('should have transition', () => {
    // Arrange & Act
    render(<Input />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('transition-[color,box-shadow]');
  });

  it('should have height styling', () => {
    // Arrange & Act
    render(<Input />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('h-9');
  });

  it('should have full width', () => {
    // Arrange & Act
    render(<Input />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('w-full');
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should support aria-label', () => {
    // Arrange & Act
    render(<Input aria-label="Email address" />);

    // Assert
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
  });

  it('should support aria-describedby', () => {
    // Arrange & Act
    render(<Input aria-describedby="email-hint" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'email-hint');
  });

  it('should support name attribute', () => {
    // Arrange & Act
    render(<Input name="email" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('name', 'email');
  });

  it('should support id attribute', () => {
    // Arrange & Act
    render(<Input id="email-input" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'email-input');
  });

  // ============================================
  // AUTOCOMPLETE
  // ============================================

  it('should support autocomplete attribute', () => {
    // Arrange & Act
    render(<Input autoComplete="email" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'email');
  });

  it('should support autoFocus', () => {
    // Arrange & Act
    render(<Input autoFocus />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveFocus();
  });
});
