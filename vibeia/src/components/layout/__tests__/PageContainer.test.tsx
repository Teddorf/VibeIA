import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageContainer } from '../PageContainer';

// Mock next/navigation
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
  }),
}));

// Mock Breadcrumbs component
jest.mock('../Breadcrumbs', () => ({
  Breadcrumbs: ({ items }: { items: Array<{ label: string }> }) => (
    <nav data-testid="breadcrumbs">
      {items.map((item, i) => (
        <span key={i}>{item.label}</span>
      ))}
    </nav>
  ),
}));

describe('PageContainer', () => {
  // ============================================
  // HAPPY PATH - BASIC RENDERING
  // ============================================

  it('should render children content', () => {
    // Arrange
    const content = 'Test Content';

    // Act
    render(
      <PageContainer title="Test Page">
        <div>{content}</div>
      </PageContainer>
    );

    // Assert
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('should render page title', () => {
    // Arrange & Act
    render(
      <PageContainer title="Dashboard">
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    // Arrange
    const description = 'This is the dashboard description';

    // Act
    render(
      <PageContainer title="Dashboard" description={description}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  // ============================================
  // BREADCRUMBS
  // ============================================

  it('should render breadcrumbs when items are provided', () => {
    // Arrange
    const breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
    ];

    // Act
    render(
      <PageContainer title="My Page" breadcrumbs={breadcrumbs}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('should not render breadcrumbs when items are not provided', () => {
    // Arrange & Act
    render(
      <PageContainer title="Dashboard">
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    expect(screen.queryByTestId('breadcrumbs')).not.toBeInTheDocument();
  });

  // ============================================
  // ACTIONS AREA
  // ============================================

  it('should render actions when provided', () => {
    // Arrange
    const actions = (
      <button>Create New</button>
    );

    // Act
    render(
      <PageContainer title="Dashboard" actions={actions}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    expect(screen.getByRole('button', { name: 'Create New' })).toBeInTheDocument();
  });

  it('should render multiple actions', () => {
    // Arrange
    const actions = (
      <>
        <button>Export</button>
        <button>Import</button>
        <button>Create</button>
      </>
    );

    // Act
    render(
      <PageContainer title="Dashboard" actions={actions}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('should position actions on the right side of header', () => {
    // Arrange
    const actions = <button>Action</button>;

    // Act
    render(
      <PageContainer title="Dashboard" actions={actions}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    const actionsContainer = screen.getByTestId('page-actions');
    expect(actionsContainer).toHaveClass('ml-auto');
  });

  // ============================================
  // HEADER STRUCTURE
  // ============================================

  it('should render header with title and actions in flex container', () => {
    // Arrange & Act
    render(
      <PageContainer
        title="Dashboard"
        actions={<button>Action</button>}
      >
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    const header = screen.getByTestId('page-header');
    expect(header).toHaveClass('flex');
    expect(header).toHaveClass('items-center');
    expect(header).toHaveClass('justify-between');
  });

  it('should render title section with title and description', () => {
    // Arrange & Act
    render(
      <PageContainer
        title="Dashboard"
        description="Welcome to your dashboard"
      >
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    const titleSection = screen.getByTestId('page-title-section');
    expect(titleSection.querySelector('h1')).toHaveTextContent('Dashboard');
    expect(titleSection.querySelector('p')).toHaveTextContent('Welcome to your dashboard');
  });

  // ============================================
  // LOADING STATE
  // ============================================

  it('should show loading skeleton when loading is true', () => {
    // Arrange & Act
    render(
      <PageContainer title="Dashboard" loading={true}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    expect(screen.getByTestId('page-loading')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should show content when loading is false', () => {
    // Arrange & Act
    render(
      <PageContainer title="Dashboard" loading={false}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    expect(screen.queryByTestId('page-loading')).not.toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should show custom loading component when provided', () => {
    // Arrange
    const customLoader = <div data-testid="custom-loader">Loading...</div>;

    // Act
    render(
      <PageContainer title="Dashboard" loading={true} loadingComponent={customLoader}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
  });

  // ============================================
  // ERROR STATE
  // ============================================

  it('should show error message when error is provided', () => {
    // Arrange
    const error = 'Failed to load data';

    // Act
    render(
      <PageContainer title="Dashboard" error={error}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should show retry button when onRetry is provided', () => {
    // Arrange
    const onRetry = jest.fn();

    // Act
    render(
      <PageContainer title="Dashboard" error="Error occurred" onRetry={onRetry}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    const onRetry = jest.fn();

    render(
      <PageContainer title="Dashboard" error="Error occurred" onRetry={onRetry}>
        <div>Content</div>
      </PageContainer>
    );

    // Act
    await user.click(screen.getByRole('button', { name: /retry/i }));

    // Assert
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // ============================================
  // EMPTY STATE
  // ============================================

  it('should show empty state when isEmpty is true', () => {
    // Arrange
    const emptyState = {
      title: 'No projects yet',
      description: 'Create your first project to get started',
      action: <button>Create Project</button>,
    };

    // Act
    render(
      <PageContainer title="Projects" isEmpty={true} emptyState={emptyState}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first project to get started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  // ============================================
  // CONTAINER VARIANTS
  // ============================================

  it('should apply full-width variant', () => {
    // Arrange & Act
    render(
      <PageContainer title="Dashboard" variant="full">
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    const container = screen.getByTestId('page-container');
    expect(container).toHaveClass('max-w-full');
  });

  it('should apply narrow variant', () => {
    // Arrange & Act
    render(
      <PageContainer title="Dashboard" variant="narrow">
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    const container = screen.getByTestId('page-container');
    expect(container).toHaveClass('max-w-3xl');
  });

  it('should apply default variant (standard width)', () => {
    // Arrange & Act
    render(
      <PageContainer title="Dashboard">
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    const container = screen.getByTestId('page-container');
    expect(container).toHaveClass('max-w-7xl');
  });

  // ============================================
  // PADDING OPTIONS
  // ============================================

  it('should apply default padding', () => {
    // Arrange & Act
    render(
      <PageContainer title="Dashboard">
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    const container = screen.getByTestId('page-container');
    expect(container).toHaveClass('px-4');
    expect(container).toHaveClass('py-6');
  });

  it('should remove padding when noPadding is true', () => {
    // Arrange & Act
    render(
      <PageContainer title="Dashboard" noPadding={true}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    const container = screen.getByTestId('page-container');
    expect(container).not.toHaveClass('px-4');
    expect(container).not.toHaveClass('py-6');
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have main landmark role', () => {
    // Arrange & Act
    render(
      <PageContainer title="Dashboard">
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    // Note: main role is typically on parent AppShell
    // PageContainer should use article or section
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('should associate title with content via aria-labelledby', () => {
    // Arrange & Act
    render(
      <PageContainer title="Dashboard">
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    const article = screen.getByRole('article');
    const heading = screen.getByRole('heading', { name: 'Dashboard' });
    expect(article).toHaveAttribute('aria-labelledby', heading.id);
  });

  // ============================================
  // BACK BUTTON
  // ============================================

  it('should show back button when showBack is true', () => {
    // Arrange & Act
    render(
      <PageContainer title="Project Details" showBack={true}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert - back button (not link, since no href provided)
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  it('should navigate back when back button is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    mockBack.mockClear();

    render(
      <PageContainer title="Project Details" showBack={true}>
        <div>Content</div>
      </PageContainer>
    );

    // Act
    await user.click(screen.getByRole('button', { name: /go back/i }));

    // Assert
    expect(mockBack).toHaveBeenCalled();
  });

  it('should use custom back href when provided', () => {
    // Arrange & Act
    render(
      <PageContainer title="Project Details" showBack={true} backHref="/projects">
        <div>Content</div>
      </PageContainer>
    );

    // Assert - when href is provided, it's a link not a button
    const backLink = screen.getByRole('link', { name: /go back/i });
    expect(backLink).toHaveAttribute('href', '/projects');
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle undefined children gracefully', () => {
    // Arrange & Act
    render(<PageContainer title="Dashboard">{undefined}</PageContainer>);

    // Assert
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('should handle null children gracefully', () => {
    // Arrange & Act
    render(<PageContainer title="Dashboard">{null}</PageContainer>);

    // Assert
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(
      <PageContainer title="Dashboard" className="custom-page">
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    const container = screen.getByTestId('page-container');
    expect(container).toHaveClass('custom-page');
  });

  it('should handle very long title', () => {
    // Arrange
    const longTitle = 'This is a very long page title that might cause layout issues';

    // Act
    render(
      <PageContainer title={longTitle}>
        <div>Content</div>
      </PageContainer>
    );

    // Assert
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(longTitle);
    expect(heading).toHaveClass('truncate');
  });
});
