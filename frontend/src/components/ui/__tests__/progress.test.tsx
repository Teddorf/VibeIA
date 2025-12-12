import { render, screen } from '@testing-library/react';
import { Progress } from '../progress';

describe('Progress', () => {
  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render progress element', () => {
    // Arrange & Act
    render(<Progress value={50} />);

    // Assert
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render with value of 0', () => {
    // Arrange & Act
    render(<Progress value={0} />);

    // Assert
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render with value of 100', () => {
    // Arrange & Act
    render(<Progress value={100} />);

    // Assert
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render without value prop', () => {
    // Arrange & Act
    render(<Progress />);

    // Assert
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // ============================================
  // DATA ATTRIBUTES
  // ============================================

  it('should have data-state attribute for loading state', () => {
    // Arrange & Act
    render(<Progress value={50} />);

    // Assert - Radix UI Progress uses data-state
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('data-state');
  });

  it('should have data-state indeterminate when no value', () => {
    // Arrange & Act
    render(<Progress />);

    // Assert
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-state', 'indeterminate');
  });

  it('should have data-max attribute', () => {
    // Arrange & Act
    render(<Progress value={50} />);

    // Assert
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-max', '100');
  });

  // ============================================
  // VALUE HANDLING
  // ============================================

  it('should update indicator position based on value', () => {
    // Arrange & Act
    const { container } = render(<Progress value={25} />);

    // Assert - indicator should be translated to show 25%
    const indicator = container.querySelector('[class*="bg-primary"]');
    expect(indicator).toHaveStyle({ transform: 'translateX(-75%)' });
  });

  it('should show full indicator at 100%', () => {
    // Arrange & Act
    const { container } = render(<Progress value={100} />);

    // Assert
    const indicator = container.querySelector('[class*="bg-primary"]');
    expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' });
  });

  it('should show empty indicator at 0%', () => {
    // Arrange & Act
    const { container } = render(<Progress value={0} />);

    // Assert
    const indicator = container.querySelector('[class*="bg-primary"]');
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
  });

  it('should handle undefined value as 0', () => {
    // Arrange & Act
    const { container } = render(<Progress />);

    // Assert
    const indicator = container.querySelector('[class*="bg-primary"]');
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
  });

  // ============================================
  // STYLING
  // ============================================

  it('should have base styling classes', () => {
    // Arrange & Act
    render(<Progress value={50} />);

    // Assert
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveClass('relative');
    expect(progress).toHaveClass('h-4');
    expect(progress).toHaveClass('w-full');
    expect(progress).toHaveClass('overflow-hidden');
    expect(progress).toHaveClass('rounded-full');
    expect(progress).toHaveClass('bg-secondary');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<Progress value={50} className="custom-progress" />);

    // Assert
    expect(screen.getByRole('progressbar')).toHaveClass('custom-progress');
  });

  it('should merge custom className with default classes', () => {
    // Arrange & Act
    render(<Progress value={50} className="custom-progress" />);

    // Assert
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveClass('custom-progress');
    expect(progress).toHaveClass('rounded-full');
  });

  // ============================================
  // INDICATOR STYLING
  // ============================================

  it('should have indicator element', () => {
    // Arrange & Act
    const { container } = render(<Progress value={50} />);

    // Assert
    const indicator = container.querySelector('[class*="bg-primary"]');
    expect(indicator).toBeInTheDocument();
  });

  it('should have indicator with full width', () => {
    // Arrange & Act
    const { container } = render(<Progress value={50} />);

    // Assert
    const indicator = container.querySelector('[class*="bg-primary"]');
    expect(indicator).toHaveClass('w-full');
  });

  it('should have indicator with transition', () => {
    // Arrange & Act
    const { container } = render(<Progress value={50} />);

    // Assert
    const indicator = container.querySelector('[class*="bg-primary"]');
    expect(indicator).toHaveClass('transition-all');
  });

  // ============================================
  // ADDITIONAL PROPS
  // ============================================

  it('should forward ref', () => {
    // Arrange
    const ref = { current: null };

    // Act
    render(<Progress value={50} ref={ref} />);

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('should pass additional props to root element', () => {
    // Arrange & Act
    render(<Progress value={50} data-testid="custom-progress" />);

    // Assert
    expect(screen.getByTestId('custom-progress')).toBeInTheDocument();
  });
});
