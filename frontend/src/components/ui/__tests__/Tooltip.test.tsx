/**
 * Tooltip Component Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../Tooltip';

describe('Tooltip', () => {
  // RENDERING TESTS
  describe('Rendering', () => {
    it('should render trigger element', () => {
      // Arrange & Act
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      // Assert
      expect(screen.getByRole('button', { name: /hover me/i })).toBeInTheDocument();
    });

    it('should not show content by default', () => {
      // Arrange & Act
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      // Assert
      expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
    });
  });

  // HOVER BEHAVIOR TESTS
  describe('Hover Behavior', () => {
    it('should show tooltip on hover', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      // Act
      await user.hover(screen.getByRole('button', { name: /hover me/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Tooltip text')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on unhover', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      // Act
      await user.hover(screen.getByRole('button', { name: /hover me/i }));
      await waitFor(() => screen.getByText('Tooltip text'));
      await user.unhover(screen.getByRole('button', { name: /hover me/i }));

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
      });
    });
  });

  // FOCUS BEHAVIOR TESTS
  describe('Focus Behavior', () => {
    it('should show tooltip on focus', async () => {
      // Arrange
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <button>Focus me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      // Act
      fireEvent.focus(screen.getByRole('button', { name: /focus me/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Tooltip text')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on blur', async () => {
      // Arrange
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <button>Focus me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      // Act
      fireEvent.focus(screen.getByRole('button', { name: /focus me/i }));
      await waitFor(() => screen.getByText('Tooltip text'));
      fireEvent.blur(screen.getByRole('button', { name: /focus me/i }));

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
      });
    });
  });

  // POSITIONING TESTS
  describe('Positioning', () => {
    it('should render with default position (top)', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent side="top">Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      // Act
      await user.hover(screen.getByRole('button', { name: /hover me/i }));

      // Assert
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveAttribute('data-side', 'top');
      });
    });

    it('should support different positions', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      // Act
      await user.hover(screen.getByRole('button', { name: /hover me/i }));

      // Assert
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveAttribute('data-side', 'bottom');
      });
    });
  });

  // DELAY TESTS
  describe('Delay', () => {
    it('should respect delay before showing', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      // Act
      await user.hover(screen.getByRole('button', { name: /hover me/i }));

      // Assert - should not show immediately
      expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();

      // Wait for delay
      await waitFor(
        () => {
          expect(screen.getByText('Tooltip text')).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });
  });

  // ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    it('should have proper role attribute', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      // Act
      await user.hover(screen.getByRole('button', { name: /hover me/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('should be dismissable with Escape key', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      // Act
      await user.hover(screen.getByRole('button', { name: /hover me/i }));
      await waitFor(() => screen.getByText('Tooltip text'));
      await user.keyboard('{Escape}');

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
      });
    });
  });

  // CUSTOM CONTENT TESTS
  describe('Custom Content', () => {
    it('should support JSX content', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <button>Hover me</button>
            </TooltipTrigger>
            <TooltipContent>
              <div data-testid="custom-content">
                <strong>Bold text</strong>
                <p>Description</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      // Act
      await user.hover(screen.getByRole('button', { name: /hover me/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('custom-content')).toBeInTheDocument();
        expect(screen.getByText('Bold text')).toBeInTheDocument();
      });
    });
  });
});
