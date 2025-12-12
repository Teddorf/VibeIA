import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIChat } from '../AIChat';

// Mock API client
const mockSendMessage = jest.fn();
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    ai: {
      sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    },
  },
}));

describe('AIChat', () => {
  const defaultProps = {
    projectId: '123',
    phaseId: 'intention',
    context: 'We are defining the project intention',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock scrollIntoView for JSDOM
    Element.prototype.scrollIntoView = jest.fn();
    mockSendMessage.mockResolvedValue({
      message: 'AI response message',
      suggestions: ['Suggestion 1', 'Suggestion 2'],
    });
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render chat container', () => {
    // Arrange & Act
    render(<AIChat {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('ai-chat')).toBeInTheDocument();
  });

  it('should render AI conductor avatar', () => {
    // Arrange & Act
    render(<AIChat {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('ai-avatar')).toBeInTheDocument();
  });

  it('should render message input field', () => {
    // Arrange & Act
    render(<AIChat {...defaultProps} />);

    // Assert
    expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
  });

  it('should render send button', () => {
    // Arrange & Act
    render(<AIChat {...defaultProps} />);

    // Assert
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('should render welcome message from AI', () => {
    // Arrange & Act
    render(<AIChat {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('ai-message-0')).toBeInTheDocument();
  });

  // ============================================
  // SENDING MESSAGES
  // ============================================

  it('should send message when send button is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hello AI',
        projectId: '123',
        phaseId: 'intention',
      })
    );
  });

  it('should send message when Enter is pressed', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI{Enter}');

    // Assert
    expect(mockSendMessage).toHaveBeenCalled();
  });

  it('should not send empty messages', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('should clear input after sending message', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  // ============================================
  // DISPLAYING MESSAGES
  // ============================================

  it('should display user message after sending', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Hello AI')).toBeInTheDocument();
    });
  });

  it('should display AI response after sending', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('AI response message')).toBeInTheDocument();
    });
  });

  it('should style user messages differently from AI messages', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert - user message wrapper has flex-row-reverse, content has bg-purple-600
    await waitFor(() => {
      const userMessageWrapper = screen.getByTestId('user-message-1');
      expect(userMessageWrapper).toHaveClass('flex-row-reverse');
      // Find the message content inside the wrapper
      const messageContent = userMessageWrapper.querySelector('div');
      expect(messageContent).toHaveClass('bg-purple-600');
    });
  });

  // ============================================
  // LOADING STATE
  // ============================================

  it('should show loading indicator while waiting for response', async () => {
    // Arrange
    mockSendMessage.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('should disable input while loading', async () => {
    // Arrange
    mockSendMessage.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    expect(input).toBeDisabled();
  });

  it('should disable send button while loading', async () => {
    // Arrange
    mockSendMessage.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  it('should display error message when API fails', async () => {
    // Arrange
    mockSendMessage.mockRejectedValue(new Error('API Error'));
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('should allow retry after error', async () => {
    // Arrange
    mockSendMessage.mockRejectedValueOnce(new Error('API Error'));
    mockSendMessage.mockResolvedValueOnce({ message: 'Success!' });
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act - first attempt fails
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Act - retry
    await user.click(screen.getByRole('button', { name: /retry/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });
  });

  // ============================================
  // SUGGESTIONS
  // ============================================

  it('should display AI suggestions', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
      expect(screen.getByText('Suggestion 2')).toBeInTheDocument();
    });
  });

  it('should send suggestion when clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // First message to get suggestions
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
    });

    // Clear mock to check next call
    mockSendMessage.mockClear();

    // Act - click suggestion
    await user.click(screen.getByText('Suggestion 1'));

    // Assert
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Suggestion 1',
      })
    );
  });

  // ============================================
  // INITIAL MESSAGES
  // ============================================

  it('should render initial messages when provided', () => {
    // Arrange
    const initialMessages = [
      { role: 'ai' as const, content: 'Welcome!' },
      { role: 'user' as const, content: 'Hi there' },
    ];

    // Act
    render(<AIChat {...defaultProps} initialMessages={initialMessages} />);

    // Assert
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  // ============================================
  // SYSTEM PROMPT / CONTEXT
  // ============================================

  it('should include context in API calls', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} context="Project context here" />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'Project context here',
      })
    );
  });

  // ============================================
  // SCROLL BEHAVIOR
  // ============================================

  it('should auto-scroll to bottom when new message arrives', async () => {
    // Arrange
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  // ============================================
  // VARIANTS
  // ============================================

  it('should render in fullscreen mode when variant is fullscreen', () => {
    // Arrange & Act
    render(<AIChat {...defaultProps} variant="fullscreen" />);

    // Assert
    const chat = screen.getByTestId('ai-chat');
    expect(chat).toHaveClass('h-screen');
  });

  it('should render in embedded mode by default', () => {
    // Arrange & Act
    render(<AIChat {...defaultProps} />);

    // Assert
    const chat = screen.getByTestId('ai-chat');
    expect(chat).toHaveClass('h-96');
  });

  it('should render minimized when variant is minimized', () => {
    // Arrange & Act
    render(<AIChat {...defaultProps} variant="minimized" />);

    // Assert
    const chat = screen.getByTestId('ai-chat');
    expect(chat).toHaveClass('h-12');
  });

  // ============================================
  // CALLBACKS
  // ============================================

  it('should call onMessageSent when message is sent', async () => {
    // Arrange
    const onMessageSent = jest.fn();
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} onMessageSent={onMessageSent} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    expect(onMessageSent).toHaveBeenCalledWith('Hello');
  });

  it('should call onResponseReceived when AI responds', async () => {
    // Arrange
    const onResponseReceived = jest.fn();
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} onResponseReceived={onResponseReceived} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    await waitFor(() => {
      expect(onResponseReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'AI response message',
        })
      );
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have proper ARIA live region for messages', () => {
    // Arrange & Act
    render(<AIChat {...defaultProps} />);

    // Assert
    const messageContainer = screen.getByTestId('message-container');
    expect(messageContainer).toHaveAttribute('aria-live', 'polite');
  });

  it('should have accessible labels for all interactive elements', () => {
    // Arrange & Act
    render(<AIChat {...defaultProps} />);

    // Assert
    expect(screen.getByRole('textbox')).toHaveAccessibleName();
    expect(screen.getByRole('button', { name: /send/i })).toHaveAccessibleName();
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle very long messages', async () => {
    // Arrange
    const longMessage = 'A'.repeat(1000);
    mockSendMessage.mockResolvedValue({ message: longMessage });
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    // Act
    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hi');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<AIChat {...defaultProps} className="custom-chat" />);

    // Assert
    const chat = screen.getByTestId('ai-chat');
    expect(chat).toHaveClass('custom-chat');
  });

  it('should show character count when maxLength is provided', () => {
    // Arrange & Act
    render(<AIChat {...defaultProps} maxLength={500} />);

    // Assert
    expect(screen.getByText('0/500')).toBeInTheDocument();
  });
});
