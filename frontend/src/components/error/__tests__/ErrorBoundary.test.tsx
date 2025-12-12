import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, SectionErrorBoundary, withErrorBoundary } from '../ErrorBoundary';

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { logger } from '@/lib/logger';

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div data-testid="child-content">Child content</div>;
};

// Suppress console.error for error boundary tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // NORMAL RENDERING
  // ============================================

  it('should render children when there is no error', () => {
    // Arrange & Act
    render(
      <ErrorBoundary>
        <div data-testid="child">Child content</div>
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should not show fallback when there is no error', () => {
    // Arrange & Act
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );

    // Assert
    expect(screen.queryByText('Algo salio mal')).not.toBeInTheDocument();
  });

  // ============================================
  // ERROR CATCHING
  // ============================================

  it('should catch errors and show fallback UI', () => {
    // Arrange & Act
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByText('Algo salio mal')).toBeInTheDocument();
  });

  it('should show error description in fallback', () => {
    // Arrange & Act
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByText(/Ha ocurrido un error inesperado/)).toBeInTheDocument();
  });

  it('should log error via logger', () => {
    // Arrange & Act
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Assert
    expect(logger.error).toHaveBeenCalledWith(
      'React Error Boundary caught error',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should call onError callback when error occurs', () => {
    // Arrange
    const onError = jest.fn();

    // Act
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    // Assert
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  // ============================================
  // CUSTOM FALLBACK
  // ============================================

  it('should render custom fallback when provided', () => {
    // Arrange & Act
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error message</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Algo salio mal')).not.toBeInTheDocument();
  });

  // ============================================
  // ACTION BUTTONS
  // ============================================

  it('should show retry button', () => {
    // Arrange & Act
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByRole('button', { name: /intentar de nuevo/i })).toBeInTheDocument();
  });

  it('should show go to dashboard button', () => {
    // Arrange & Act
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByRole('button', { name: /ir al dashboard/i })).toBeInTheDocument();
  });

  it('should show reload link', () => {
    // Arrange & Act
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByRole('button', { name: /recarga la pagina/i })).toBeInTheDocument();
  });

  // ============================================
  // RESET FUNCTIONALITY
  // ============================================

  it('should call onReset when retry button is clicked', () => {
    // Arrange
    const onReset = jest.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowError />
      </ErrorBoundary>
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: /intentar de nuevo/i }));

    // Assert
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  // ============================================
  // RELOAD AND NAVIGATION
  // ============================================

  it('should reload page when reload button is clicked', () => {
    // Arrange
    const reloadMock = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock, href: '' },
      writable: true,
    });
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: /recarga la pagina/i }));

    // Assert
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('should navigate to dashboard when go home button is clicked', () => {
    // Arrange
    const locationMock = { reload: jest.fn(), href: '' };
    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
    });
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: /ir al dashboard/i }));

    // Assert
    expect(locationMock.href).toBe('/dashboard');
  });

  // ============================================
  // DEVELOPMENT MODE ERROR DETAILS
  // ============================================

  it('should show error details in development mode', () => {
    // Arrange
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    // Act
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Assert
    expect(screen.getByText('Test error message')).toBeInTheDocument();

    // Cleanup
    process.env.NODE_ENV = originalEnv;
  });

  // ============================================
  // UI ELEMENTS
  // ============================================

  it('should render error icon', () => {
    // Arrange & Act
    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Assert
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

describe('SectionErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    // Arrange & Act
    render(
      <SectionErrorBoundary>
        <div data-testid="section-child">Section content</div>
      </SectionErrorBoundary>
    );

    // Assert
    expect(screen.getByTestId('section-child')).toBeInTheDocument();
  });

  it('should show section fallback when error occurs', () => {
    // Arrange & Act
    render(
      <SectionErrorBoundary>
        <ThrowError />
      </SectionErrorBoundary>
    );

    // Assert
    expect(screen.getByText('Error al cargar esta sección')).toBeInTheDocument();
  });

  it('should show custom fallback message when provided', () => {
    // Arrange & Act
    render(
      <SectionErrorBoundary fallbackMessage="Custom section error">
        <ThrowError />
      </SectionErrorBoundary>
    );

    // Assert
    expect(screen.getByText('Custom section error')).toBeInTheDocument();
  });

  it('should show reload button in section fallback', () => {
    // Arrange & Act
    render(
      <SectionErrorBoundary>
        <ThrowError />
      </SectionErrorBoundary>
    );

    // Assert
    expect(screen.getByRole('button', { name: /recargar pagina/i })).toBeInTheDocument();
  });

  it('should reload page when reload button is clicked', () => {
    // Arrange
    const reloadMock = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });
    render(
      <SectionErrorBoundary>
        <ThrowError />
      </SectionErrorBoundary>
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: /recargar pagina/i }));

    // Assert
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    // Arrange
    const TestComponent = () => <div data-testid="wrapped">Wrapped content</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    // Act
    render(<WrappedComponent />);

    // Assert
    expect(screen.getByTestId('wrapped')).toBeInTheDocument();
  });

  it('should catch errors in wrapped component', () => {
    // Arrange
    const ErrorComponent = () => {
      throw new Error('Wrapped error');
    };
    const WrappedComponent = withErrorBoundary(ErrorComponent);

    // Act
    render(<WrappedComponent />);

    // Assert
    expect(screen.getByText('Algo salio mal')).toBeInTheDocument();
  });

  it('should use custom fallback when provided', () => {
    // Arrange
    const ErrorComponent = () => {
      throw new Error('Wrapped error');
    };
    const WrappedComponent = withErrorBoundary(
      ErrorComponent,
      <div data-testid="hoc-fallback">HOC Fallback</div>
    );

    // Act
    render(<WrappedComponent />);

    // Assert
    expect(screen.getByTestId('hoc-fallback')).toBeInTheDocument();
  });

  it('should set displayName correctly', () => {
    // Arrange
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = 'TestComponent';
    const WrappedComponent = withErrorBoundary(TestComponent);

    // Assert
    expect(WrappedComponent.displayName).toBe('WithErrorBoundary(TestComponent)');
  });

  it('should use component name if displayName is not set', () => {
    // Arrange
    function NamedComponent() {
      return <div>Test</div>;
    }
    const WrappedComponent = withErrorBoundary(NamedComponent);

    // Assert
    expect(WrappedComponent.displayName).toBe('WithErrorBoundary(NamedComponent)');
  });

  it('should pass props to wrapped component', () => {
    // Arrange
    const TestComponent = ({ message }: { message: string }) => (
      <div data-testid="with-props">{message}</div>
    );
    const WrappedComponent = withErrorBoundary(TestComponent);

    // Act
    render(<WrappedComponent message="Hello props" />);

    // Assert
    expect(screen.getByText('Hello props')).toBeInTheDocument();
  });
});
