'use client';

import React, { useState, useRef, useEffect } from 'react';
import apiClient from '@/lib/api-client';

// ============================================
// TYPES
// ============================================

export interface Message {
  role: 'ai' | 'user';
  content: string;
  timestamp?: Date;
}

export interface AIResponse {
  message: string;
  suggestions?: string[];
}

export interface AIChatProps {
  projectId: string;
  phaseId: string;
  context?: string;
  initialMessages?: Message[];
  variant?: 'embedded' | 'fullscreen' | 'minimized';
  maxLength?: number;
  onMessageSent?: (message: string) => void;
  onResponseReceived?: (response: AIResponse) => void;
  className?: string;
}

// ============================================
// ICONS
// ============================================

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const AIAvatar = () => (
  <div
    data-testid="ai-avatar"
    className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center"
  >
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  </div>
);

const TypingIndicator = () => (
  <div data-testid="typing-indicator" className="flex items-center gap-2 p-3">
    <AIAvatar />
    <div className="flex gap-1">
      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

// ============================================
// HELPER FUNCTIONS
// ============================================

const getVariantClasses = (variant: 'embedded' | 'fullscreen' | 'minimized') => {
  const variants = {
    embedded: 'h-96',
    fullscreen: 'h-screen',
    minimized: 'h-12',
  };
  return variants[variant];
};

// ============================================
// COMPONENT
// ============================================

export function AIChat({
  projectId,
  phaseId,
  context,
  initialMessages = [],
  variant = 'embedded',
  maxLength,
  onMessageSent,
  onResponseReceived,
  className = '',
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Hello! I\'m your AI Conductor. How can I help you with your project today?' },
    ...initialMessages,
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    setLastFailedMessage(null);

    // Add user message
    const userMessage: Message = { role: 'user', content: messageText, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    onMessageSent?.(messageText);

    try {
      const { data: response } = await apiClient.post('/api/llm/chat', {
        message: messageText,
        projectId,
        phaseId,
        context,
      });

      // Add AI response
      const aiMessage: Message = { role: 'ai', content: response.message, timestamp: new Date() };
      setMessages(prev => [...prev, aiMessage]);

      // Update suggestions
      if (response.suggestions) {
        setSuggestions(response.suggestions);
      }

      onResponseReceived?.(response);
    } catch (err) {
      setError('Failed to send message. Please try again.');
      setLastFailedMessage(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      setError(null);
      sendMessage(lastFailedMessage);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div
      data-testid="ai-chat"
      className={`
        flex flex-col bg-slate-900 rounded-lg border border-slate-700
        ${getVariantClasses(variant)}
        ${className}
      `}
    >
      {/* Messages Container */}
      <div
        data-testid="message-container"
        aria-live="polite"
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            data-testid={`${message.role}-message-${index}`}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {message.role === 'ai' && <AIAvatar />}
            <div
              className={`
                max-w-[80%] p-3 rounded-lg
                ${message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-200'
                }
              `}
            >
              {message.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && <TypingIndicator />}

        {/* Error message */}
        {error && (
          <div role="alert" className="flex items-center gap-2 p-3 bg-red-500/20 text-red-400 rounded-lg">
            <span>{error}</span>
            <button
              onClick={handleRetry}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-400 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2 mt-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm hover:bg-slate-600 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Type your message..."
              aria-label="Type your message"
              maxLength={maxLength}
              rows={1}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none disabled:opacity-50"
            />
            {maxLength && (
              <span className="absolute right-2 bottom-2 text-xs text-slate-500">
                {inputValue.length}/{maxLength}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            aria-label="Send message"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}

export default AIChat;
