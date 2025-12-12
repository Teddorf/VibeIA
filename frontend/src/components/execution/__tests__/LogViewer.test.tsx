import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogViewer } from '../LogViewer';

describe('LogViewer', () => {
  const defaultLogs = [
    { id: '1', timestamp: new Date('2024-01-15T10:00:00'), level: 'info' as const, message: 'Starting task execution...', source: 'executor' },
    { id: '2', timestamp: new Date('2024-01-15T10:00:01'), level: 'success' as const, message: 'Task completed successfully', source: 'executor' },
    { id: '3', timestamp: new Date('2024-01-15T10:00:02'), level: 'warning' as const, message: 'Rate limit approaching', source: 'api' },
    { id: '4', timestamp: new Date('2024-01-15T10:00:03'), level: 'error' as const, message: 'Connection failed', source: 'network' },
  ];

  const defaultProps = {
    logs: defaultLogs,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Element.prototype.scrollIntoView = jest.fn();
  });

  // ============================================
  // HAPPY PATH - RENDERING
  // ============================================

  it('should render log viewer container', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} />);

    // Assert
    expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
  });

  it('should render all log entries', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} />);

    // Assert
    expect(screen.getByText('Starting task execution...')).toBeInTheDocument();
    expect(screen.getByText('Task completed successfully')).toBeInTheDocument();
    expect(screen.getByText('Rate limit approaching')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('should render timestamps for each log', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} showTimestamps />);

    // Assert
    const timestamps = screen.getAllByTestId(/^timestamp-/);
    expect(timestamps).toHaveLength(4);
  });

  // ============================================
  // LOG LEVELS
  // ============================================

  it('should style info logs correctly', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} />);

    // Assert
    const infoLog = screen.getByTestId('log-entry-1');
    expect(infoLog).toHaveAttribute('data-level', 'info');
    expect(infoLog).toHaveClass('text-blue-400');
  });

  it('should style success logs correctly', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} />);

    // Assert
    const successLog = screen.getByTestId('log-entry-2');
    expect(successLog).toHaveAttribute('data-level', 'success');
    expect(successLog).toHaveClass('text-green-400');
  });

  it('should style warning logs correctly', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} />);

    // Assert
    const warningLog = screen.getByTestId('log-entry-3');
    expect(warningLog).toHaveAttribute('data-level', 'warning');
    expect(warningLog).toHaveClass('text-yellow-400');
  });

  it('should style error logs correctly', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} />);

    // Assert
    const errorLog = screen.getByTestId('log-entry-4');
    expect(errorLog).toHaveAttribute('data-level', 'error');
    expect(errorLog).toHaveClass('text-red-400');
  });

  it('should show level icon for each log', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} showIcons />);

    // Assert
    expect(screen.getByTestId('icon-info')).toBeInTheDocument();
    expect(screen.getByTestId('icon-success')).toBeInTheDocument();
    expect(screen.getByTestId('icon-warning')).toBeInTheDocument();
    expect(screen.getByTestId('icon-error')).toBeInTheDocument();
  });

  // ============================================
  // FILTERING
  // ============================================

  it('should filter logs by level', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} filterLevel="error" />);

    // Assert
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    expect(screen.queryByText('Starting task execution...')).not.toBeInTheDocument();
  });

  it('should filter logs by source', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} filterSource="api" />);

    // Assert
    expect(screen.getByText('Rate limit approaching')).toBeInTheDocument();
    expect(screen.queryByText('Starting task execution...')).not.toBeInTheDocument();
  });

  it('should allow toggling level filters', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<LogViewer {...defaultProps} showFilters />);

    // Act
    await user.click(screen.getByRole('checkbox', { name: /error/i }));

    // Assert
    expect(screen.queryByText('Connection failed')).not.toBeInTheDocument();
  });

  // ============================================
  // SEARCH
  // ============================================

  it('should show search input when enabled', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} showSearch />);

    // Assert
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('should filter logs by search term', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<LogViewer {...defaultProps} showSearch />);

    // Act
    await user.type(screen.getByPlaceholderText(/search/i), 'failed');

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.queryByText('Starting task execution...')).not.toBeInTheDocument();
    });
  });

  it('should highlight search matches', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<LogViewer {...defaultProps} showSearch highlightMatches />);

    // Act
    await user.type(screen.getByPlaceholderText(/search/i), 'task');

    // Assert - "task" appears multiple times, so use getAllByTestId
    await waitFor(() => {
      const highlights = screen.getAllByTestId('highlight-match');
      expect(highlights.length).toBeGreaterThan(0);
      expect(highlights[0]).toHaveClass('bg-yellow-500/30');
    });
  });

  // ============================================
  // AUTO-SCROLL
  // ============================================

  it('should auto-scroll to bottom by default', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} autoScroll />);

    // Assert
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('should show scroll to bottom button when not at bottom', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<LogViewer {...defaultProps} autoScroll />);

    // Simulate scrolling up (mock scroll event)
    const container = screen.getByTestId('log-container');
    Object.defineProperty(container, 'scrollTop', { value: 0, writable: true });
    Object.defineProperty(container, 'scrollHeight', { value: 1000, writable: true });
    Object.defineProperty(container, 'clientHeight', { value: 200, writable: true });

    // Act - trigger scroll
    container.dispatchEvent(new Event('scroll'));

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /scroll to bottom/i })).toBeInTheDocument();
    });
  });

  // ============================================
  // REAL-TIME UPDATES
  // ============================================

  it('should show new log indicator when new logs arrive', () => {
    // Arrange
    const { rerender } = render(<LogViewer {...defaultProps} />);

    // Act - add new log
    const newLogs = [
      ...defaultLogs,
      { id: '5', timestamp: new Date(), level: 'info' as const, message: 'New log entry', source: 'system' },
    ];
    rerender(<LogViewer logs={newLogs} />);

    // Assert
    expect(screen.getByText('New log entry')).toBeInTheDocument();
  });

  it('should show loading indicator when streaming', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} isStreaming />);

    // Assert
    expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();
  });

  // ============================================
  // COPY & EXPORT
  // ============================================

  it('should show copy button for each log', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} showCopyButton />);

    // Assert
    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    expect(copyButtons).toHaveLength(4);
  });

  it('should copy log text when copy button clicked', async () => {
    // Arrange
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
    render(<LogViewer {...defaultProps} showCopyButton />);

    // Act
    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    fireEvent.click(copyButtons[0]);

    // Assert
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('Starting task execution...');
    });
  });

  it('should show export button when enabled', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} showExport />);

    // Assert
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  // ============================================
  // LOG SOURCES
  // ============================================

  it('should show source badge for each log', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} showSource />);

    // Assert - executor appears twice in our test data, so use getAllByText
    expect(screen.getAllByText('executor')).toHaveLength(2);
    expect(screen.getByText('api')).toBeInTheDocument();
    expect(screen.getByText('network')).toBeInTheDocument();
  });

  // ============================================
  // VARIANTS
  // ============================================

  it('should render compact variant', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} variant="compact" />);

    // Assert
    const viewer = screen.getByTestId('log-viewer');
    expect(viewer).toHaveClass('text-xs');
  });

  it('should render default variant', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} />);

    // Assert
    const viewer = screen.getByTestId('log-viewer');
    expect(viewer).toHaveClass('text-sm');
  });

  it('should render expanded variant', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} variant="expanded" />);

    // Assert
    const viewer = screen.getByTestId('log-viewer');
    expect(viewer).toHaveClass('text-base');
  });

  // ============================================
  // EMPTY STATE
  // ============================================

  it('should show empty state when no logs', () => {
    // Arrange & Act
    render(<LogViewer logs={[]} />);

    // Assert
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/no logs/i)).toBeInTheDocument();
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================

  it('should have proper ARIA attributes', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} />);

    // Assert
    const viewer = screen.getByTestId('log-viewer');
    expect(viewer).toHaveAttribute('role', 'log');
    expect(viewer).toHaveAttribute('aria-live', 'polite');
  });

  it('should announce new logs to screen readers', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} />);

    // Assert
    const container = screen.getByTestId('log-container');
    expect(container).toHaveAttribute('aria-relevant', 'additions');
  });

  // ============================================
  // EDGE CASES
  // ============================================

  it('should handle very long log messages', () => {
    // Arrange
    const longMessage = 'A'.repeat(500);
    const logsWithLong = [
      { id: '1', timestamp: new Date(), level: 'info' as const, message: longMessage, source: 'test' },
    ];

    // Act
    render(<LogViewer logs={logsWithLong} wrapLongLines />);

    // Assert
    const logEntry = screen.getByTestId('log-entry-1');
    expect(logEntry).toHaveClass('whitespace-pre-wrap');
  });

  it('should handle logs with special characters', () => {
    // Arrange
    const logsWithSpecial = [
      { id: '1', timestamp: new Date(), level: 'info' as const, message: '<script>alert("xss")</script>', source: 'test' },
    ];

    // Act
    render(<LogViewer logs={logsWithSpecial} />);

    // Assert
    expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} className="custom-viewer" />);

    // Assert
    expect(screen.getByTestId('log-viewer')).toHaveClass('custom-viewer');
  });

  it('should limit displayed logs when maxLogs is set', () => {
    // Arrange & Act
    render(<LogViewer {...defaultProps} maxLogs={2} />);

    // Assert
    const entries = screen.getAllByTestId(/^log-entry-/);
    expect(entries).toHaveLength(2);
  });
});
