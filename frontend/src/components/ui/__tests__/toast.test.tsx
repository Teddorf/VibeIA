import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ToastProvider, useToast, ToastContainer } from '../toast';

// Test component that uses the toast hook
function TestToastConsumer() {
  const { success, error, warning, info, toasts, removeToast } = useToast();

  return (
    <div>
      <button onClick={() => success('Success message')}>Show Success</button>
      <button onClick={() => error('Error message')}>Show Error</button>
      <button onClick={() => warning('Warning message')}>Show Warning</button>
      <button onClick={() => info('Info message')}>Show Info</button>
      <button onClick={() => success('With description', { description: 'More details' })}>
        With Description
      </button>
      <button onClick={() => success('With action', { action: { label: 'Undo', onClick: jest.fn() } })}>
        With Action
      </button>
      <button onClick={() => success('Custom duration', { duration: 1000 })}>
        Custom Duration
      </button>
      <button onClick={() => success('No auto-remove', { duration: 0 })}>
        No Auto Remove
      </button>
      <span data-testid="toast-count">{toasts.length}</span>
      {toasts.length > 0 && (
        <button onClick={() => removeToast(toasts[0].id)}>Remove First</button>
      )}
    </div>
  );
}

// Wrapper component for tests
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render children', () => {
    // Arrange & Act
    render(
      <ToastProvider>
        <div data-testid="child">Child content</div>
      </ToastProvider>
    );

    // Assert
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should not render toast container when no toasts', () => {
    // Arrange & Act
    render(
      <ToastProvider>
        <div>Content</div>
      </ToastProvider>
    );

    // Assert
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  // ============================================
  // TOAST TYPES
  // ============================================

  it('should show success toast', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Success'));

    // Assert
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should show error toast', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Error'));

    // Assert
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should show warning toast', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Warning'));

    // Assert
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('should show info toast', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Info'));

    // Assert
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  // ============================================
  // TOAST CONTENT
  // ============================================

  it('should show toast with description', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('With Description'));

    // Assert
    expect(screen.getByText('With description')).toBeInTheDocument();
    expect(screen.getByText('More details')).toBeInTheDocument();
  });

  it('should show toast with action button', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('With Action'));

    // Assert
    expect(screen.getByText('With action')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  // ============================================
  // TOAST REMOVAL
  // ============================================

  it('should remove toast after default duration (5 seconds)', async () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Wait for toast to be removed
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Assert - toast should be removed
    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('should remove error toast after 7 seconds', async () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // At 5 seconds, error toast should still be visible
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // At 7 seconds, error toast should be removed
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
    });
  });

  it('should remove toast with custom duration', async () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Custom Duration'));
    expect(screen.getByText('Custom duration')).toBeInTheDocument();

    // Wait for custom duration (1 second)
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Assert
    await waitFor(() => {
      expect(screen.queryByText('Custom duration')).not.toBeInTheDocument();
    });
  });

  it('should not auto-remove toast when duration is 0', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('No Auto Remove'));
    expect(screen.getByText('No auto-remove')).toBeInTheDocument();

    // Wait longer than default duration
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Assert - toast should still be visible
    expect(screen.getByText('No auto-remove')).toBeInTheDocument();
  });

  it('should remove toast when close button clicked', async () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Success'));
    const closeButton = screen.getByLabelText('Cerrar notificación');
    fireEvent.click(closeButton);

    // Wait for animation
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Assert
    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('should remove toast programmatically', async () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act - add toast
    fireEvent.click(screen.getByText('No Auto Remove'));
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

    // Remove programmatically
    fireEvent.click(screen.getByText('Remove First'));

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });

  // ============================================
  // MAX TOASTS LIMIT
  // ============================================

  it('should limit toasts to max 5', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act - add 7 toasts
    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByText('No Auto Remove'));
    }

    // Assert - only 5 toasts should be visible
    expect(screen.getByTestId('toast-count')).toHaveTextContent('5');
    expect(screen.getAllByRole('alert')).toHaveLength(5);
  });

  // ============================================
  // KEYBOARD SUPPORT
  // ============================================

  it('should remove toast on Escape key', async () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    // Wait for animation
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Assert
    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  // ============================================
  // ACTION BUTTON
  // ============================================

  it('should call action onClick and close toast when action clicked', async () => {
    // Arrange
    const actionMock = jest.fn();
    function TestWithAction() {
      const { success } = useToast();
      return (
        <button onClick={() => success('Test', { action: { label: 'Click me', onClick: actionMock } })}>
          Add Toast
        </button>
      );
    }

    render(
      <TestWrapper>
        <TestWithAction />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Add Toast'));
    fireEvent.click(screen.getByText('Click me'));

    // Wait for animation
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Assert
    expect(actionMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have region role for toast container', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Success'));

    // Assert
    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Notificaciones');
  });

  it('should have alert role for toast items', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Success'));

    // Assert
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should have aria-live polite for non-error toasts', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Success'));

    // Assert
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
  });

  it('should have aria-live assertive for error toasts', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Error'));

    // Assert
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('should have close button with aria-label', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Success'));

    // Assert
    expect(screen.getByLabelText('Cerrar notificación')).toBeInTheDocument();
  });
});

describe('useToast hook', () => {
  it('should throw error when used outside ToastProvider', () => {
    // Arrange
    const TestComponent = () => {
      useToast();
      return null;
    };

    // Assert
    expect(() => render(<TestComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );
  });

  it('should return toast functions', () => {
    // Arrange
    let hookResult: ReturnType<typeof useToast> | null = null;
    function TestComponent() {
      hookResult = useToast();
      return null;
    }

    // Act
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // Assert
    expect(hookResult).toHaveProperty('toasts');
    expect(hookResult).toHaveProperty('addToast');
    expect(hookResult).toHaveProperty('removeToast');
    expect(hookResult).toHaveProperty('success');
    expect(hookResult).toHaveProperty('error');
    expect(hookResult).toHaveProperty('warning');
    expect(hookResult).toHaveProperty('info');
  });

  it('should return toast id from addToast', () => {
    // Arrange
    let toastId: string | null = null;
    function TestComponent() {
      const { addToast } = useToast();
      return (
        <button
          onClick={() => {
            toastId = addToast({ type: 'success', message: 'Test' });
          }}
        >
          Add
        </button>
      );
    }

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Add'));

    // Assert
    expect(toastId).toBeTruthy();
    expect(typeof toastId).toBe('string');
    expect(toastId).toMatch(/^toast-/);
  });
});

describe('ToastContainer', () => {
  it('should render nothing when toasts array is empty', () => {
    // Arrange & Act
    const { container } = render(
      <ToastContainer toasts={[]} onRemove={jest.fn()} />
    );

    // Assert
    expect(container).toBeEmptyDOMElement();
  });

  it('should render toasts when array has items', () => {
    // Arrange
    const toasts = [
      { id: '1', type: 'success' as const, message: 'Toast 1' },
      { id: '2', type: 'error' as const, message: 'Toast 2' },
    ];

    // Act
    render(<ToastContainer toasts={toasts} onRemove={jest.fn()} />);

    // Assert
    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('should call onRemove when close button clicked', async () => {
    // Arrange
    jest.useFakeTimers();
    const onRemove = jest.fn();
    const toasts = [{ id: 'test-id', type: 'success' as const, message: 'Test' }];

    render(<ToastContainer toasts={toasts} onRemove={onRemove} />);

    // Act
    fireEvent.click(screen.getByLabelText('Cerrar notificación'));

    // Assert - onRemove is called after animation delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(onRemove).toHaveBeenCalledWith('test-id');
    });

    jest.useRealTimers();
  });
});

describe('Toast styling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should apply success styling', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Success'));

    // Assert
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-green-500/20');
    expect(alert).toHaveClass('border-green-500/50');
    expect(alert).toHaveClass('text-green-300');
  });

  it('should apply error styling', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Error'));

    // Assert
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-red-500/20');
    expect(alert).toHaveClass('border-red-500/50');
    expect(alert).toHaveClass('text-red-300');
  });

  it('should apply warning styling', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Warning'));

    // Assert
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-amber-500/20');
    expect(alert).toHaveClass('border-amber-500/50');
    expect(alert).toHaveClass('text-amber-300');
  });

  it('should apply info styling', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Info'));

    // Assert
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-blue-500/20');
    expect(alert).toHaveClass('border-blue-500/50');
    expect(alert).toHaveClass('text-blue-300');
  });

  it('should have fixed positioning for container', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Success'));

    // Assert
    const region = screen.getByRole('region');
    expect(region).toHaveClass('fixed');
    expect(region).toHaveClass('bottom-4');
    expect(region).toHaveClass('right-4');
  });

  it('should have icons for each toast type', () => {
    // Arrange
    render(
      <TestWrapper>
        <TestToastConsumer />
      </TestWrapper>
    );

    // Act
    fireEvent.click(screen.getByText('Show Success'));

    // Assert
    const alert = screen.getByRole('alert');
    const svg = alert.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-5', 'h-5');
  });
});
