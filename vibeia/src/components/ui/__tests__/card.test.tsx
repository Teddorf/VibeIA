import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from '../card';

describe('Card', () => {
  // ============================================
  // BASIC RENDERING
  // ============================================

  it('should render card element', () => {
    // Arrange & Act
    render(<Card data-testid="card">Content</Card>);

    // Assert
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    // Arrange & Act
    render(<Card data-testid="card">Content</Card>);

    // Assert
    expect(screen.getByTestId('card')).toHaveAttribute('data-slot', 'card');
  });

  it('should render children', () => {
    // Arrange & Act
    render(<Card>Card content</Card>);

    // Assert
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  // ============================================
  // STYLING
  // ============================================

  it('should have base styling classes', () => {
    // Arrange & Act
    render(<Card data-testid="card">Content</Card>);

    // Assert
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('bg-card');
    expect(card).toHaveClass('text-card-foreground');
    expect(card).toHaveClass('rounded-xl');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('shadow-sm');
  });

  it('should have flex column layout', () => {
    // Arrange & Act
    render(<Card data-testid="card">Content</Card>);

    // Assert
    expect(screen.getByTestId('card')).toHaveClass('flex', 'flex-col');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<Card data-testid="card" className="custom-card">Content</Card>);

    // Assert
    expect(screen.getByTestId('card')).toHaveClass('custom-card');
  });

  it('should merge custom className with default classes', () => {
    // Arrange & Act
    render(<Card data-testid="card" className="custom-card">Content</Card>);

    // Assert
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-card');
    expect(card).toHaveClass('rounded-xl');
  });
});

describe('CardHeader', () => {
  it('should render header element', () => {
    // Arrange & Act
    render(<CardHeader data-testid="header">Header</CardHeader>);

    // Assert
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    // Arrange & Act
    render(<CardHeader data-testid="header">Header</CardHeader>);

    // Assert
    expect(screen.getByTestId('header')).toHaveAttribute('data-slot', 'card-header');
  });

  it('should render children', () => {
    // Arrange & Act
    render(<CardHeader>Header content</CardHeader>);

    // Assert
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('should have grid layout', () => {
    // Arrange & Act
    render(<CardHeader data-testid="header">Header</CardHeader>);

    // Assert
    expect(screen.getByTestId('header')).toHaveClass('grid');
  });

  it('should have padding', () => {
    // Arrange & Act
    render(<CardHeader data-testid="header">Header</CardHeader>);

    // Assert
    expect(screen.getByTestId('header')).toHaveClass('px-6');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<CardHeader data-testid="header" className="custom-header">Header</CardHeader>);

    // Assert
    expect(screen.getByTestId('header')).toHaveClass('custom-header');
  });
});

describe('CardTitle', () => {
  it('should render title element', () => {
    // Arrange & Act
    render(<CardTitle data-testid="title">Title</CardTitle>);

    // Assert
    expect(screen.getByTestId('title')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    // Arrange & Act
    render(<CardTitle data-testid="title">Title</CardTitle>);

    // Assert
    expect(screen.getByTestId('title')).toHaveAttribute('data-slot', 'card-title');
  });

  it('should render children', () => {
    // Arrange & Act
    render(<CardTitle>Card Title</CardTitle>);

    // Assert
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('should have font styling', () => {
    // Arrange & Act
    render(<CardTitle data-testid="title">Title</CardTitle>);

    // Assert
    expect(screen.getByTestId('title')).toHaveClass('font-semibold');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<CardTitle data-testid="title" className="custom-title">Title</CardTitle>);

    // Assert
    expect(screen.getByTestId('title')).toHaveClass('custom-title');
  });
});

describe('CardDescription', () => {
  it('should render description element', () => {
    // Arrange & Act
    render(<CardDescription data-testid="desc">Description</CardDescription>);

    // Assert
    expect(screen.getByTestId('desc')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    // Arrange & Act
    render(<CardDescription data-testid="desc">Description</CardDescription>);

    // Assert
    expect(screen.getByTestId('desc')).toHaveAttribute('data-slot', 'card-description');
  });

  it('should render children', () => {
    // Arrange & Act
    render(<CardDescription>Card description text</CardDescription>);

    // Assert
    expect(screen.getByText('Card description text')).toBeInTheDocument();
  });

  it('should have muted text color', () => {
    // Arrange & Act
    render(<CardDescription data-testid="desc">Description</CardDescription>);

    // Assert
    expect(screen.getByTestId('desc')).toHaveClass('text-muted-foreground');
  });

  it('should have small text size', () => {
    // Arrange & Act
    render(<CardDescription data-testid="desc">Description</CardDescription>);

    // Assert
    expect(screen.getByTestId('desc')).toHaveClass('text-sm');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<CardDescription data-testid="desc" className="custom-desc">Description</CardDescription>);

    // Assert
    expect(screen.getByTestId('desc')).toHaveClass('custom-desc');
  });
});

describe('CardAction', () => {
  it('should render action element', () => {
    // Arrange & Act
    render(<CardAction data-testid="action">Action</CardAction>);

    // Assert
    expect(screen.getByTestId('action')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    // Arrange & Act
    render(<CardAction data-testid="action">Action</CardAction>);

    // Assert
    expect(screen.getByTestId('action')).toHaveAttribute('data-slot', 'card-action');
  });

  it('should render children', () => {
    // Arrange & Act
    render(<CardAction>Action button</CardAction>);

    // Assert
    expect(screen.getByText('Action button')).toBeInTheDocument();
  });

  it('should have grid positioning', () => {
    // Arrange & Act
    render(<CardAction data-testid="action">Action</CardAction>);

    // Assert
    const action = screen.getByTestId('action');
    expect(action).toHaveClass('col-start-2');
    expect(action).toHaveClass('row-span-2');
    expect(action).toHaveClass('row-start-1');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<CardAction data-testid="action" className="custom-action">Action</CardAction>);

    // Assert
    expect(screen.getByTestId('action')).toHaveClass('custom-action');
  });
});

describe('CardContent', () => {
  it('should render content element', () => {
    // Arrange & Act
    render(<CardContent data-testid="content">Content</CardContent>);

    // Assert
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    // Arrange & Act
    render(<CardContent data-testid="content">Content</CardContent>);

    // Assert
    expect(screen.getByTestId('content')).toHaveAttribute('data-slot', 'card-content');
  });

  it('should render children', () => {
    // Arrange & Act
    render(<CardContent>Card body content</CardContent>);

    // Assert
    expect(screen.getByText('Card body content')).toBeInTheDocument();
  });

  it('should have padding', () => {
    // Arrange & Act
    render(<CardContent data-testid="content">Content</CardContent>);

    // Assert
    expect(screen.getByTestId('content')).toHaveClass('px-6');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<CardContent data-testid="content" className="custom-content">Content</CardContent>);

    // Assert
    expect(screen.getByTestId('content')).toHaveClass('custom-content');
  });
});

describe('CardFooter', () => {
  it('should render footer element', () => {
    // Arrange & Act
    render(<CardFooter data-testid="footer">Footer</CardFooter>);

    // Assert
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    // Arrange & Act
    render(<CardFooter data-testid="footer">Footer</CardFooter>);

    // Assert
    expect(screen.getByTestId('footer')).toHaveAttribute('data-slot', 'card-footer');
  });

  it('should render children', () => {
    // Arrange & Act
    render(<CardFooter>Footer content</CardFooter>);

    // Assert
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('should have flex layout', () => {
    // Arrange & Act
    render(<CardFooter data-testid="footer">Footer</CardFooter>);

    // Assert
    expect(screen.getByTestId('footer')).toHaveClass('flex', 'items-center');
  });

  it('should have padding', () => {
    // Arrange & Act
    render(<CardFooter data-testid="footer">Footer</CardFooter>);

    // Assert
    expect(screen.getByTestId('footer')).toHaveClass('px-6');
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<CardFooter data-testid="footer" className="custom-footer">Footer</CardFooter>);

    // Assert
    expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
  });
});

describe('Card composition', () => {
  it('should render complete card with all parts', () => {
    // Arrange & Act
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>My Card</CardTitle>
          <CardDescription>Card description</CardDescription>
          <CardAction>
            <button>Action</button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p>Card body content</p>
        </CardContent>
        <CardFooter>
          <button>Footer action</button>
        </CardFooter>
      </Card>
    );

    // Assert
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('My Card')).toBeInTheDocument();
    expect(screen.getByText('Card description')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Card body content')).toBeInTheDocument();
    expect(screen.getByText('Footer action')).toBeInTheDocument();
  });

  it('should maintain hierarchy with data-slot attributes', () => {
    // Arrange & Act
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );

    // Assert
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card-header"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card-title"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card-description"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card-content"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card-footer"]')).toBeInTheDocument();
  });

  it('should allow nesting any content in card parts', () => {
    // Arrange & Act
    render(
      <Card>
        <CardContent>
          <div data-testid="nested-div">
            <span data-testid="nested-span">Nested content</span>
          </div>
        </CardContent>
      </Card>
    );

    // Assert
    expect(screen.getByTestId('nested-div')).toBeInTheDocument();
    expect(screen.getByTestId('nested-span')).toBeInTheDocument();
  });

  it('should support additional HTML attributes', () => {
    // Arrange & Act
    render(
      <Card
        data-testid="card"
        role="article"
        aria-label="Card component"
      >
        Content
      </Card>
    );

    // Assert
    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('role', 'article');
    expect(card).toHaveAttribute('aria-label', 'Card component');
  });
});
