import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render button', () => {
    // Arrange & Act
    render(<Button>Click me</Button>);

    // Assert
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render button text', () => {
    // Arrange & Act
    render(<Button>Submit</Button>);

    // Assert
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    // Arrange & Act
    render(<Button>Test</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'button');
  });

  // ============================================
  // VARIANTS
  // ============================================

  it('should render default variant', () => {
    // Arrange & Act
    render(<Button>Default</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });

  it('should render destructive variant', () => {
    // Arrange & Act
    render(<Button variant="destructive">Delete</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });

  it('should render outline variant', () => {
    // Arrange & Act
    render(<Button variant="outline">Outline</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('border', 'bg-background');
  });

  it('should render secondary variant', () => {
    // Arrange & Act
    render(<Button variant="secondary">Secondary</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('bg-secondary');
  });

  it('should render ghost variant', () => {
    // Arrange & Act
    render(<Button variant="ghost">Ghost</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('hover:bg-accent');
  });

  it('should render link variant', () => {
    // Arrange & Act
    render(<Button variant="link">Link</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('text-primary', 'underline-offset-4');
  });

  // ============================================
  // SIZES
  // ============================================

  it('should render default size', () => {
    // Arrange & Act
    render(<Button>Default Size</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('h-9', 'px-4');
  });

  it('should render small size', () => {
    // Arrange & Act
    render(<Button size="sm">Small</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('h-8', 'px-3');
  });

  it('should render large size', () => {
    // Arrange & Act
    render(<Button size="lg">Large</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('h-10', 'px-6');
  });

  it('should render icon size', () => {
    // Arrange & Act
    render(<Button size="icon">🔍</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('size-9');
  });

  it('should render icon-sm size', () => {
    // Arrange & Act
    render(<Button size="icon-sm">🔍</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('size-8');
  });

  it('should render icon-lg size', () => {
    // Arrange & Act
    render(<Button size="icon-lg">🔍</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('size-10');
  });

  // ============================================
  // STATES
  // ============================================

  it('should support disabled state', () => {
    // Arrange & Act
    render(<Button disabled>Disabled</Button>);

    // Assert
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveClass('disabled:opacity-50');
  });

  it('should call onClick handler', () => {
    // Arrange
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', () => {
    // Arrange
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>Click</Button>);

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(handleClick).not.toHaveBeenCalled();
  });

  // ============================================
  // CUSTOM STYLING
  // ============================================

  it('should apply custom className', () => {
    // Arrange & Act
    render(<Button className="custom-class">Custom</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('should merge custom className with default classes', () => {
    // Arrange & Act
    render(<Button className="custom-class">Custom</Button>);

    // Assert
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('inline-flex');
  });

  // ============================================
  // AS CHILD (SLOT)
  // ============================================

  it('should render as child when asChild is true', () => {
    // Arrange & Act
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    // Assert
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveClass('inline-flex');
  });

  // ============================================
  // ADDITIONAL PROPS
  // ============================================

  it('should support type attribute', () => {
    // Arrange & Act
    render(<Button type="submit">Submit</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('should support aria-label', () => {
    // Arrange & Act
    render(<Button aria-label="Close dialog">X</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close dialog');
  });

  it('should render with icon', () => {
    // Arrange & Act
    render(
      <Button>
        <svg data-testid="icon" />
        With Icon
      </Button>
    );

    // Assert
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  // ============================================
  // STYLING
  // ============================================

  it('should have rounded corners', () => {
    // Arrange & Act
    render(<Button>Rounded</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('rounded-md');
  });

  it('should have focus visible styles', () => {
    // Arrange & Act
    render(<Button>Focus</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('focus-visible:ring-ring/50');
  });

  it('should have transition', () => {
    // Arrange & Act
    render(<Button>Transition</Button>);

    // Assert
    expect(screen.getByRole('button')).toHaveClass('transition-all');
  });
});
