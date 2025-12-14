/**
 * useKeyboardShortcuts Hook Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useKeyboardShortcuts, KeyboardShortcut } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  // BASIC FUNCTIONALITY TESTS
  describe('Basic Functionality', () => {
    it('should register keyboard shortcuts', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', handler, description: 'Test shortcut' },
      ];

      // Act
      const { result } = renderHook(() => useKeyboardShortcuts(shortcuts));

      // Assert
      expect(result.current.shortcuts).toHaveLength(1);
      expect(result.current.shortcuts[0].key).toBe('k');
    });

    it('should call handler when shortcut key is pressed', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', handler, description: 'Test shortcut' },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Act
      fireEvent.keyDown(document, { key: 'k' });

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not call handler for non-matching keys', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', handler, description: 'Test shortcut' },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Act
      fireEvent.keyDown(document, { key: 'j' });

      // Assert
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // MODIFIER KEYS TESTS
  describe('Modifier Keys', () => {
    it('should handle Ctrl modifier', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', ctrl: true, handler, description: 'Ctrl+K shortcut' },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Act - without ctrl
      fireEvent.keyDown(document, { key: 'k' });
      expect(handler).not.toHaveBeenCalled();

      // Act - with ctrl
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle Meta/Cmd modifier', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', meta: true, handler, description: 'Cmd+K shortcut' },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Act
      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle Shift modifier', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', shift: true, handler, description: 'Shift+K shortcut' },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Act
      fireEvent.keyDown(document, { key: 'k', shiftKey: true });

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle Alt modifier', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', alt: true, handler, description: 'Alt+K shortcut' },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Act
      fireEvent.keyDown(document, { key: 'k', altKey: true });

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple modifiers', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', ctrl: true, shift: true, handler, description: 'Ctrl+Shift+K' },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Act - missing shift
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
      expect(handler).not.toHaveBeenCalled();

      // Act - with both
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true, shiftKey: true });

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // MULTIPLE SHORTCUTS TESTS
  describe('Multiple Shortcuts', () => {
    it('should handle multiple shortcuts', () => {
      // Arrange
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', handler: handler1, description: 'Shortcut 1' },
        { key: 'j', handler: handler2, description: 'Shortcut 2' },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Act
      fireEvent.keyDown(document, { key: 'k' });
      fireEvent.keyDown(document, { key: 'j' });

      // Assert
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  // ENABLED/DISABLED TESTS
  describe('Enabled/Disabled', () => {
    it('should not trigger when disabled', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', handler, description: 'Test shortcut' },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts, { enabled: false }));

      // Act
      fireEvent.keyDown(document, { key: 'k' });

      // Assert
      expect(handler).not.toHaveBeenCalled();
    });

    it('should re-enable when enabled changes', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', handler, description: 'Test shortcut' },
      ];

      const { rerender } = renderHook(
        ({ enabled }) => useKeyboardShortcuts(shortcuts, { enabled }),
        { initialProps: { enabled: false } }
      );

      // Act - disabled
      fireEvent.keyDown(document, { key: 'k' });
      expect(handler).not.toHaveBeenCalled();

      // Re-enable
      rerender({ enabled: true });
      fireEvent.keyDown(document, { key: 'k' });

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // INPUT ELEMENT EXCLUSION TESTS
  describe('Input Element Exclusion', () => {
    it('should not trigger when focused on input', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', handler, description: 'Test shortcut' },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Create and focus an input
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      // Act
      fireEvent.keyDown(input, { key: 'k' });

      // Assert
      expect(handler).not.toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(input);
    });

    it('should not trigger when focused on textarea', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', handler, description: 'Test shortcut' },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Create and focus a textarea
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      // Act
      fireEvent.keyDown(textarea, { key: 'k' });

      // Assert
      expect(handler).not.toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(textarea);
    });

    it('should trigger on inputs when explicitly allowed', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'Escape', handler, description: 'Escape shortcut', triggerInInput: true },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Create and focus an input
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      // Act
      fireEvent.keyDown(input, { key: 'Escape' });

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);

      // Cleanup
      document.body.removeChild(input);
    });
  });

  // CLEANUP TESTS
  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', handler, description: 'Test shortcut' },
      ];

      const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

      // Act
      unmount();
      fireEvent.keyDown(document, { key: 'k' });

      // Assert
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // PREVENT DEFAULT TESTS
  describe('Prevent Default', () => {
    it('should prevent default when specified', () => {
      // Arrange
      const handler = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', ctrl: true, handler, description: 'Ctrl+K', preventDefault: true },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Act
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);

      // Assert
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  // GET SHORTCUTS LIST
  describe('Get Shortcuts', () => {
    it('should return list of registered shortcuts', () => {
      // Arrange
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', ctrl: true, handler: jest.fn(), description: 'Search' },
        { key: 'n', handler: jest.fn(), description: 'New item' },
      ];

      // Act
      const { result } = renderHook(() => useKeyboardShortcuts(shortcuts));

      // Assert
      expect(result.current.shortcuts).toHaveLength(2);
      expect(result.current.shortcuts[0].description).toBe('Search');
      expect(result.current.shortcuts[1].description).toBe('New item');
    });
  });
});
