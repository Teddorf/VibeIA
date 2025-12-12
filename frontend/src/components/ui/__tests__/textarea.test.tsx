import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from '../textarea';

describe('Textarea', () => {
  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render textarea element', () => {
    // Arrange & Act
    render(<Textarea />);

    // Assert
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    // Arrange & Act
    render(<Textarea />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('data-slot', 'textarea');
  });

  it('should render as textarea not input', () => {
    // Arrange & Act
    render(<Textarea />);

    // Assert
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
  });

  // ============================================
  // VALUE AND PLACEHOLDER
  // ============================================

  it('should render with placeholder', () => {
    // Arrange & Act
    render(<Textarea placeholder="Enter your message" />);

    // Assert
    expect(screen.getByPlaceholderText('Enter your message')).toBeInTheDocument();
  });

  it('should render with value', () => {
    // Arrange & Act
    render(<Textarea value="Test message content" onChange={() => {}} />);

    // Assert
    expect(screen.getByDisplayValue('Test message content')).toBeInTheDocument();
  });

  it('should render with defaultValue', () => {
    // Arrange & Act
    render(<Textarea defaultValue="Default message" />);

    // Assert
    expect(screen.getByDisplayValue('Default message')).toBeInTheDocument();
  });

  it('should render multiline text', () => {
    // Arrange & Act
    const multilineText = 'Line 1\nLine 2\nLine 3';
    render(<Textarea value={multilineText} onChange={() => {}} />);

    // Assert
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(multilineText);
  });

  // ============================================
  // ROWS AND COLS
  // ============================================

  it('should support rows attribute', () => {
    // Arrange & Act
    render(<Textarea rows={5} />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
  });

  it('should support cols attribute', () => {
    // Arrange & Act
    render(<Textarea cols={40} />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('cols', '40');
  });

  // ============================================
  // EVENT HANDLERS
  // ============================================

  it('should call onChange when typing', () => {
    // Arrange
    const handleChange = jest.fn();
    render(<Textarea onChange={handleChange} />);

    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });

    // Assert
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should call onFocus when focused', () => {
    // Arrange
    const handleFocus = jest.fn();
    render(<Textarea onFocus={handleFocus} />);

    // Act
    fireEvent.focus(screen.getByRole('textbox'));

    // Assert
    expect(handleFocus).toHaveBeenCalledTimes(1);
  });

  it('should call onBlur when blurred', () => {
    // Arrange
    const handleBlur = jest.fn();
    render(<Textarea onBlur={handleBlur} />);

    // Act
    fireEvent.blur(screen.getByRole('textbox'));

    // Assert
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('should call onKeyDown when key pressed', () => {
    // Arrange
    const handleKeyDown = jest.fn();
    render(<Textarea onKeyDown={handleKeyDown} />);

    // Act
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    // Assert
    expect(handleKeyDown).toHaveBeenCalledTimes(1);
  });

  it('should handle paste events', () => {
    // Arrange
    const handlePaste = jest.fn();
    render(<Textarea onPaste={handlePaste} />);

    // Act
    fireEvent.paste(screen.getByRole('textbox'));

    // Assert
    expect(handlePaste).toHaveBeenCalledTimes(1);
  });

  // ============================================
  // DISABLED STATE
  // ============================================

  it('should support disabled state', () => {
    // Arrange & Act
    render(<Textarea disabled />);

    // Assert
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should have disabled styles', () => {
    // Arrange & Act
    render(<Textarea disabled />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('disabled:opacity-50');
  });

  it('should have disabled cursor style', () => {
    // Arrange & Act
    render(<Textarea disabled />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('disabled:cursor-not-allowed');
  });

  // ============================================
  // READONLY STATE
  // ============================================

  it('should support readonly state', () => {
    // Arrange & Act
    render(<Textarea readOnly value="readonly text" onChange={() => {}} />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });

  // ============================================
  // REQUIRED AND VALIDATION
  // ============================================

  it('should support required attribute', () => {
    // Arrange & Act
    render(<Textarea required />);

    // Assert
    expect(screen.getByRole('textbox')).toBeRequired();
  });

  it('should support aria-invalid for error state', () => {
    // Arrange & Act
    render(<Textarea aria-invalid="true" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox')).toHaveClass('aria-invalid:border-destructive');
  });

  it('should support minLength', () => {
    // Arrange & Act
    render(<Textarea minLength={10} />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('minLength', '10');
  });

  it('should support maxLength', () => {
    // Arrange & Act
    render(<Textarea maxLength={500} />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '500');
  });

  // ============================================
  // CUSTOM STYLING
  // ============================================

  it('should apply custom className', () => {
    // Arrange & Act
    render(<Textarea className="custom-textarea" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('custom-textarea');
  });

  it('should merge custom className with default classes', () => {
    // Arrange & Act
    render(<Textarea className="custom-textarea" />);

    // Assert
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('custom-textarea');
    expect(textarea).toHaveClass('rounded-md');
    expect(textarea).toHaveClass('border');
  });

  // ============================================
  // STYLING CLASSES
  // ============================================

  it('should have rounded corners', () => {
    // Arrange & Act
    render(<Textarea />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('rounded-md');
  });

  it('should have border', () => {
    // Arrange & Act
    render(<Textarea />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('border');
  });

  it('should have minimum height', () => {
    // Arrange & Act
    render(<Textarea />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('min-h-16');
  });

  it('should have full width', () => {
    // Arrange & Act
    render(<Textarea />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('w-full');
  });

  it('should have focus visible styles', () => {
    // Arrange & Act
    render(<Textarea />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('focus-visible:ring-ring/50');
  });

  it('should have transition', () => {
    // Arrange & Act
    render(<Textarea />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('transition-[color,box-shadow]');
  });

  it('should use flex display', () => {
    // Arrange & Act
    render(<Textarea />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveClass('flex');
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should support aria-label', () => {
    // Arrange & Act
    render(<Textarea aria-label="Message content" />);

    // Assert
    expect(screen.getByLabelText('Message content')).toBeInTheDocument();
  });

  it('should support aria-describedby', () => {
    // Arrange & Act
    render(<Textarea aria-describedby="message-hint" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'message-hint');
  });

  it('should support name attribute', () => {
    // Arrange & Act
    render(<Textarea name="message" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('name', 'message');
  });

  it('should support id attribute', () => {
    // Arrange & Act
    render(<Textarea id="message-input" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'message-input');
  });

  // ============================================
  // RESIZE BEHAVIOR
  // ============================================

  it('should support resize attribute', () => {
    // Arrange & Act
    render(<Textarea style={{ resize: 'none' }} />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveStyle({ resize: 'none' });
  });

  it('should support vertical resize', () => {
    // Arrange & Act
    render(<Textarea style={{ resize: 'vertical' }} />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveStyle({ resize: 'vertical' });
  });

  // ============================================
  // AUTO FEATURES
  // ============================================

  it('should support autocomplete attribute', () => {
    // Arrange & Act
    render(<Textarea autoComplete="off" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'off');
  });

  it('should support autoFocus', () => {
    // Arrange & Act
    render(<Textarea autoFocus />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('should support spellCheck', () => {
    // Arrange & Act
    render(<Textarea spellCheck={false} />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('spellcheck', 'false');
  });

  it('should support wrap attribute', () => {
    // Arrange & Act
    render(<Textarea wrap="hard" />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAttribute('wrap', 'hard');
  });
});
