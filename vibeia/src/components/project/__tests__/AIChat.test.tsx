import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIChat } from '../AIChat';

// Mock API client - component uses `apiClient.post('/api/llm/chat', ...)`
const mockPost = jest.fn();
jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockPost(...args),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
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
    mockPost.mockResolvedValue({
      data: {
        message: 'AI response message',
        suggestions: ['Suggestion 1', 'Suggestion 2'],
      },
    });
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render chat container', () => {
    render(<AIChat {...defaultProps} />);
    expect(screen.getByTestId('ai-chat')).toBeInTheDocument();
  });

  it('should render AI conductor avatar', () => {
    render(<AIChat {...defaultProps} />);
    expect(screen.getByTestId('ai-avatar')).toBeInTheDocument();
  });

  it('should render message input field', () => {
    render(<AIChat {...defaultProps} />);
    expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
  });

  it('should render send button', () => {
    render(<AIChat {...defaultProps} />);
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('should render welcome message from AI', () => {
    render(<AIChat {...defaultProps} />);
    expect(screen.getByTestId('ai-message-0')).toBeInTheDocument();
  });

  // ============================================
  // SENDING MESSAGES
  // ============================================

  it('should send message when send button is clicked', async () => {
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(mockPost).toHaveBeenCalledWith(
      '/api/llm/chat',
      expect.objectContaining({
        message: 'Hello AI',
        projectId: '123',
        phaseId: 'intention',
      }),
    );
  });

  it('should send message when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI{Enter}');

    expect(mockPost).toHaveBeenCalled();
  });

  it('should not send empty messages', async () => {
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('should clear input after sending message', async () => {
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  // ============================================
  // DISPLAYING MESSAGES
  // ============================================

  it('should display user message after sending', async () => {
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Hello AI')).toBeInTheDocument();
    });
  });

  it('should display AI response after sending', async () => {
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('AI response message')).toBeInTheDocument();
    });
  });

  it('should style user messages differently from AI messages', async () => {
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      const userMessageWrapper = screen.getByTestId('user-message-1');
      expect(userMessageWrapper).toHaveClass('flex-row-reverse');
      const messageContent = userMessageWrapper.querySelector('div');
      expect(messageContent).toHaveClass('bg-purple-600');
    });
  });

  // ============================================
  // LOADING STATE
  // ============================================

  it('should show loading indicator while waiting for response', async () => {
    mockPost.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('should disable input while loading', async () => {
    mockPost.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(input).toBeDisabled();
  });

  it('should disable send button while loading', async () => {
    mockPost.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  it('should display error message when API fails', async () => {
    mockPost.mockRejectedValue(new Error('API Error'));
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('should allow retry after error', async () => {
    mockPost.mockRejectedValueOnce(new Error('API Error'));
    mockPost.mockResolvedValueOnce({ data: { message: 'Success!' } });
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello AI');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });
  });

  // ============================================
  // SUGGESTIONS
  // ============================================

  it('should display AI suggestions', async () => {
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
      expect(screen.getByText('Suggestion 2')).toBeInTheDocument();
    });
  });

  it('should send suggestion when clicked', async () => {
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
    });

    mockPost.mockClear();

    await user.click(screen.getByText('Suggestion 1'));

    expect(mockPost).toHaveBeenCalledWith(
      '/api/llm/chat',
      expect.objectContaining({
        message: 'Suggestion 1',
      }),
    );
  });

  // ============================================
  // INITIAL MESSAGES
  // ============================================

  it('should render initial messages when provided', () => {
    const initialMessages = [
      { role: 'ai' as const, content: 'Welcome!' },
      { role: 'user' as const, content: 'Hi there' },
    ];

    render(<AIChat {...defaultProps} initialMessages={initialMessages} />);

    expect(screen.getByText('Welcome!')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  // ============================================
  // SYSTEM PROMPT / CONTEXT
  // ============================================

  it('should include context in API calls', async () => {
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} context="Project context here" />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(mockPost).toHaveBeenCalledWith(
      '/api/llm/chat',
      expect.objectContaining({
        context: 'Project context here',
      }),
    );
  });

  // ============================================
  // SCROLL BEHAVIOR
  // ============================================

  it('should auto-scroll to bottom when new message arrives', async () => {
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  // ============================================
  // VARIANTS
  // ============================================

  it('should render in fullscreen mode when variant is fullscreen', () => {
    render(<AIChat {...defaultProps} variant="fullscreen" />);
    const chat = screen.getByTestId('ai-chat');
    expect(chat).toHaveClass('h-screen');
  });

  it('should render in embedded mode by default', () => {
    render(<AIChat {...defaultProps} />);
    const chat = screen.getByTestId('ai-chat');
    expect(chat).toHaveClass('h-96');
  });

  it('should render minimized when variant is minimized', () => {
    render(<AIChat {...defaultProps} variant="minimized" />);
    const chat = screen.getByTestId('ai-chat');
    expect(chat).toHaveClass('h-12');
  });

  // ============================================
  // CALLBACKS
  // ============================================

  it('should call onMessageSent when message is sent', async () => {
    const onMessageSent = jest.fn();
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} onMessageSent={onMessageSent} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(onMessageSent).toHaveBeenCalledWith('Hello');
  });

  it('should call onResponseReceived when AI responds', async () => {
    const onResponseReceived = jest.fn();
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} onResponseReceived={onResponseReceived} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(onResponseReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'AI response message',
        }),
      );
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have proper ARIA live region for messages', () => {
    render(<AIChat {...defaultProps} />);
    const messageContainer = screen.getByTestId('message-container');
    expect(messageContainer).toHaveAttribute('aria-live', 'polite');
  });

  it('should have accessible labels for all interactive elements', () => {
    render(<AIChat {...defaultProps} />);
    expect(screen.getByRole('textbox')).toHaveAccessibleName();
    expect(screen.getByRole('button', { name: /send/i })).toHaveAccessibleName();
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle very long messages', async () => {
    const longMessage = 'A'.repeat(1000);
    mockPost.mockResolvedValue({ data: { message: longMessage } });
    const user = userEvent.setup();
    render(<AIChat {...defaultProps} />);

    const input = screen.getByRole('textbox', { name: /message/i });
    await user.type(input, 'Hi');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    render(<AIChat {...defaultProps} className="custom-chat" />);
    const chat = screen.getByTestId('ai-chat');
    expect(chat).toHaveClass('custom-chat');
  });

  it('should show character count when maxLength is provided', () => {
    render(<AIChat {...defaultProps} maxLength={500} />);
    expect(screen.getByText('0/500')).toBeInTheDocument();
  });
});
