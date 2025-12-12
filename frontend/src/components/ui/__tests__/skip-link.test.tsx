import { render, screen } from '@testing-library/react';
import { SkipLink } from '../skip-link';

describe('SkipLink', () => {
  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render skip link element', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('should render as anchor element', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByRole('link').tagName).toBe('A');
  });

  it('should have correct text content', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByText('Saltar al contenido principal')).toBeInTheDocument();
  });

  // ============================================
  // HREF ATTRIBUTE
  // ============================================

  it('should have href pointing to main-content', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByRole('link')).toHaveAttribute('href', '#main-content');
  });

  // ============================================
  // ACCESSIBILITY - SCREEN READER
  // ============================================

  it('should be visually hidden by default', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByRole('link')).toHaveClass('sr-only');
  });

  it('should become visible on focus', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert - should have focus:not-sr-only class
    expect(screen.getByRole('link')).toHaveClass('focus:not-sr-only');
  });

  // ============================================
  // POSITIONING
  // ============================================

  it('should be fixed position', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByRole('link')).toHaveClass('fixed');
  });

  it('should be positioned at top left', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    const link = screen.getByRole('link');
    expect(link).toHaveClass('top-4');
    expect(link).toHaveClass('left-4');
  });

  it('should have high z-index', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByRole('link')).toHaveClass('z-[9999]');
  });

  // ============================================
  // STYLING
  // ============================================

  it('should have purple background', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByRole('link')).toHaveClass('bg-purple-600');
  });

  it('should have white text', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByRole('link')).toHaveClass('text-white');
  });

  it('should have rounded corners', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByRole('link')).toHaveClass('rounded-lg');
  });

  it('should have padding', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    const link = screen.getByRole('link');
    expect(link).toHaveClass('px-4');
    expect(link).toHaveClass('py-2');
  });

  it('should have medium font weight', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByRole('link')).toHaveClass('font-medium');
  });

  // ============================================
  // FOCUS STYLES
  // ============================================

  it('should have focus outline removal', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByRole('link')).toHaveClass('focus:outline-none');
  });

  it('should have focus ring', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    const link = screen.getByRole('link');
    expect(link).toHaveClass('focus:ring-2');
    expect(link).toHaveClass('focus:ring-purple-400');
  });

  it('should have focus ring offset', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    const link = screen.getByRole('link');
    expect(link).toHaveClass('focus:ring-offset-2');
    expect(link).toHaveClass('focus:ring-offset-slate-900');
  });

  // ============================================
  // TRANSITION
  // ============================================

  it('should have transition for transform', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert
    expect(screen.getByRole('link')).toHaveClass('transition-transform');
  });
});

describe('SkipLink accessibility', () => {
  it('should be accessible to screen readers', () => {
    // Arrange & Act
    render(<SkipLink />);

    // Assert - link should be in the document even if visually hidden
    const link = screen.getByRole('link', { name: 'Saltar al contenido principal' });
    expect(link).toBeInTheDocument();
  });

  it('should be the first focusable element when tabbing', () => {
    // This test documents the expected behavior
    // The skip link should be at the top of the DOM
    // Arrange & Act
    render(
      <div>
        <SkipLink />
        <button>Other button</button>
      </div>
    );

    // Assert
    const link = screen.getByRole('link');
    const button = screen.getByRole('button');

    // Skip link should appear before button in DOM
    expect(link.compareDocumentPosition(button)).toBe(4); // DOCUMENT_POSITION_FOLLOWING
  });

  it('should navigate to main-content when clicked', () => {
    // Arrange & Act
    render(
      <div>
        <SkipLink />
        <main id="main-content">Main content</main>
      </div>
    );

    // Assert - href should point to #main-content
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('#main-content');
  });
});

describe('SkipLink export', () => {
  it('should export as named export', () => {
    // Assert
    expect(SkipLink).toBeDefined();
    expect(typeof SkipLink).toBe('function');
  });
});
