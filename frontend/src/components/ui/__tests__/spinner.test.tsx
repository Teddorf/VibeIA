import { render, screen } from '@testing-library/react';
import { Spinner, LoadingOverlay, Skeleton, CardSkeleton, ListSkeleton } from '../spinner';

describe('Spinner', () => {
  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render spinner', () => {
    // Arrange & Act
    render(<Spinner />);

    // Assert
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should have default aria-label', () => {
    // Arrange & Act
    render(<Spinner />);

    // Assert
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Cargando...');
  });

  it('should render with custom label', () => {
    // Arrange & Act
    render(<Spinner label="Loading data..." />);

    // Assert
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading data...');
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should have sr-only text for screen readers', () => {
    // Arrange & Act
    render(<Spinner label="Processing" />);

    // Assert
    const srText = screen.getByText('Processing');
    expect(srText).toHaveClass('sr-only');
  });

  // ============================================
  // SIZES
  // ============================================

  it('should render small size', () => {
    // Arrange & Act
    render(<Spinner size="sm" />);

    // Assert
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-4', 'h-4', 'border-2');
  });

  it('should render medium size by default', () => {
    // Arrange & Act
    render(<Spinner />);

    // Assert
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-8', 'h-8', 'border-3');
  });

  it('should render large size', () => {
    // Arrange & Act
    render(<Spinner size="lg" />);

    // Assert
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-12', 'h-12', 'border-4');
  });

  // ============================================
  // STYLING
  // ============================================

  it('should have spin animation', () => {
    // Arrange & Act
    render(<Spinner />);

    // Assert
    expect(screen.getByRole('status')).toHaveClass('animate-spin');
  });

  it('should have rounded style', () => {
    // Arrange & Act
    render(<Spinner />);

    // Assert
    expect(screen.getByRole('status')).toHaveClass('rounded-full');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<Spinner className="custom-spinner" />);

    // Assert
    expect(screen.getByRole('status')).toHaveClass('custom-spinner');
  });
});

describe('LoadingOverlay', () => {
  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render children', () => {
    // Arrange & Act
    render(
      <LoadingOverlay isLoading={false}>
        <div data-testid="content">Content</div>
      </LoadingOverlay>
    );

    // Assert
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('should not show overlay when not loading', () => {
    // Arrange & Act
    render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>
    );

    // Assert
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should show overlay when loading', () => {
    // Arrange & Act
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    // Assert
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should have aria-busy when loading', () => {
    // Arrange & Act
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    // Assert
    expect(screen.getByRole('alert')).toHaveAttribute('aria-busy', 'true');
  });

  it('should display default loading message', () => {
    // Arrange & Act
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    // Assert - message appears in both spinner label and paragraph, use getAllByText
    const messages = screen.getAllByText('Cargando...');
    expect(messages.length).toBeGreaterThan(0);
  });

  it('should display custom loading message', () => {
    // Arrange & Act
    render(
      <LoadingOverlay isLoading={true} message="Saving data...">
        <div>Content</div>
      </LoadingOverlay>
    );

    // Assert - message appears in both spinner label and paragraph, use getAllByText
    const messages = screen.getAllByText('Saving data...');
    expect(messages.length).toBeGreaterThan(0);
  });

  it('should render spinner inside overlay', () => {
    // Arrange & Act
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );

    // Assert
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should still show children when loading', () => {
    // Arrange & Act
    render(
      <LoadingOverlay isLoading={true}>
        <div data-testid="content">Content</div>
      </LoadingOverlay>
    );

    // Assert
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render skeleton', () => {
    // Arrange & Act
    const { container } = render(<Skeleton />);

    // Assert
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have aria-hidden for accessibility', () => {
    // Arrange & Act
    const { container } = render(<Skeleton />);

    // Assert
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('should have pulse animation', () => {
    // Arrange & Act
    const { container } = render(<Skeleton />);

    // Assert
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  // ============================================
  // VARIANTS
  // ============================================

  it('should render text variant by default', () => {
    // Arrange & Act
    const { container } = render(<Skeleton />);

    // Assert
    expect(container.firstChild).toHaveClass('h-4', 'rounded');
  });

  it('should render circular variant', () => {
    // Arrange & Act
    const { container } = render(<Skeleton variant="circular" />);

    // Assert
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('should render rectangular variant', () => {
    // Arrange & Act
    const { container } = render(<Skeleton variant="rectangular" />);

    // Assert
    expect(container.firstChild).toHaveClass('rounded-lg');
  });

  // ============================================
  // DIMENSIONS
  // ============================================

  it('should apply custom width', () => {
    // Arrange & Act
    const { container } = render(<Skeleton width={200} />);

    // Assert
    expect(container.firstChild).toHaveStyle({ width: '200px' });
  });

  it('should apply custom height', () => {
    // Arrange & Act
    const { container } = render(<Skeleton height={50} />);

    // Assert
    expect(container.firstChild).toHaveStyle({ height: '50px' });
  });

  it('should apply string dimensions', () => {
    // Arrange & Act
    const { container } = render(<Skeleton width="100%" height="2rem" />);

    // Assert
    expect(container.firstChild).toHaveStyle({ width: '100%', height: '2rem' });
  });

  it('should apply custom className', () => {
    // Arrange & Act
    const { container } = render(<Skeleton className="custom-skeleton" />);

    // Assert
    expect(container.firstChild).toHaveClass('custom-skeleton');
  });
});

describe('CardSkeleton', () => {
  it('should render card skeleton', () => {
    // Arrange & Act
    const { container } = render(<CardSkeleton />);

    // Assert
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-slate-800/50', 'rounded-xl');
  });

  it('should render multiple skeleton elements', () => {
    // Arrange & Act
    const { container } = render(<CardSkeleton />);

    // Assert - should have multiple skeleton elements with aria-hidden
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(3);
  });

  it('should include circular avatar skeleton', () => {
    // Arrange & Act
    const { container } = render(<CardSkeleton />);

    // Assert
    const circularSkeleton = container.querySelector('.rounded-full');
    expect(circularSkeleton).toBeInTheDocument();
  });
});

describe('ListSkeleton', () => {
  it('should render default 3 items', () => {
    // Arrange & Act
    const { container } = render(<ListSkeleton />);

    // Assert
    const items = container.querySelectorAll('.flex.items-center.gap-3');
    expect(items).toHaveLength(3);
  });

  it('should render custom number of items', () => {
    // Arrange & Act
    const { container } = render(<ListSkeleton count={5} />);

    // Assert
    const items = container.querySelectorAll('.flex.items-center.gap-3');
    expect(items).toHaveLength(5);
  });

  it('should render 1 item when count is 1', () => {
    // Arrange & Act
    const { container } = render(<ListSkeleton count={1} />);

    // Assert
    const items = container.querySelectorAll('.flex.items-center.gap-3');
    expect(items).toHaveLength(1);
  });

  it('should include circular avatars in each item', () => {
    // Arrange & Act
    const { container } = render(<ListSkeleton count={2} />);

    // Assert
    const circularSkeletons = container.querySelectorAll('.rounded-full');
    expect(circularSkeletons).toHaveLength(2);
  });
});
