/**
 * useKeyboardShortcuts Hook
 * Manages keyboard shortcuts with modifier support
 */
import { useEffect, useCallback, useMemo } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
  preventDefault?: boolean;
  triggerInInput?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

export interface UseKeyboardShortcutsReturn {
  shortcuts: KeyboardShortcut[];
}

/**
 * Hook for managing keyboard shortcuts
 * @param shortcuts - Array of keyboard shortcuts to register
 * @param options - Configuration options
 * @returns Object containing registered shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
): UseKeyboardShortcutsReturn {
  const { enabled = true } = options;

  // Memoize shortcuts to prevent unnecessary re-renders
  const memoizedShortcuts = useMemo(() => shortcuts, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if we're in an input element
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of memoizedShortcuts) {
        // Skip if in input and not allowed
        if (isInputElement && !shortcut.triggerInInput) {
          continue;
        }

        // Check key match (case-insensitive)
        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
          continue;
        }

        // Check modifier keys
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (ctrlMatch && metaMatch && shiftMatch && altMatch) {
          // Prevent default if specified
          if (shortcut.preventDefault) {
            event.preventDefault();
          }

          // Call the handler
          shortcut.handler();
          return;
        }
      }
    },
    [enabled, memoizedShortcuts]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: memoizedShortcuts,
  };
}

export default useKeyboardShortcuts;
