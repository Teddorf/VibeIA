/**
 * Tooltip Component
 * Accessible tooltip using Radix UI primitives
 */
'use client';

import React, { useState, createContext, useContext, useCallback, useRef, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

type Side = 'top' | 'right' | 'bottom' | 'left';

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

interface TooltipContextValue {
  delayDuration: number;
}

interface TooltipProps {
  children: React.ReactNode;
}

interface TooltipTriggerProps {
  children: React.ReactElement<React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }>;
  asChild?: boolean;
}

interface TooltipContentProps {
  children: React.ReactNode;
  side?: Side;
  sideOffset?: number;
  className?: string;
}

// ============================================
// CONTEXT
// ============================================

const TooltipProviderContext = createContext<TooltipContextValue>({
  delayDuration: 200,
});

const TooltipStateContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
} | null>(null);

// ============================================
// PROVIDER
// ============================================

export const TooltipProvider: React.FC<TooltipProviderProps> = ({
  children,
  delayDuration = 200,
}) => {
  return (
    <TooltipProviderContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipProviderContext.Provider>
  );
};

// ============================================
// TOOLTIP ROOT
// ============================================

export const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);

  return (
    <TooltipStateContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      {children}
    </TooltipStateContext.Provider>
  );
};

// ============================================
// TRIGGER
// ============================================

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children }) => {
  const state = useContext(TooltipStateContext);
  const { delayDuration } = useContext(TooltipProviderContext);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!state) {
    throw new Error('TooltipTrigger must be used within a Tooltip');
  }

  const { setIsOpen, triggerRef } = state;

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delayDuration);
  }, [setIsOpen, delayDuration]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  }, [setIsOpen]);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  const handleBlur = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Clone the child element with event handlers
  return React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    'aria-describedby': state.isOpen ? 'tooltip' : undefined,
  });
};

// ============================================
// CONTENT
// ============================================

export const TooltipContent: React.FC<TooltipContentProps> = ({
  children,
  side = 'top',
  sideOffset = 4,
  className = '',
}) => {
  const state = useContext(TooltipStateContext);

  if (!state) {
    throw new Error('TooltipContent must be used within a Tooltip');
  }

  const { isOpen, setIsOpen, triggerRef } = state;
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Calculate position
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && triggerRef.current && contentRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (side) {
        case 'top':
          top = triggerRect.top - contentRect.height - sideOffset;
          left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + sideOffset;
          left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
          left = triggerRect.left - contentRect.width - sideOffset;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
          left = triggerRect.right + sideOffset;
          break;
      }

      setPosition({ top, left });
    }
  }, [isOpen, side, sideOffset, triggerRef]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={contentRef}
      role="tooltip"
      id="tooltip"
      data-side={side}
      className={`fixed z-50 px-3 py-2 text-sm rounded-lg bg-slate-900 text-white border border-slate-700 shadow-lg animate-in fade-in-0 zoom-in-95 ${className}`}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {children}
      {/* Arrow */}
      <div
        className={`absolute w-2 h-2 bg-slate-900 border-slate-700 rotate-45 ${
          side === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b' :
          side === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-l border-t' :
          side === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-t border-r' :
          'left-[-5px] top-1/2 -translate-y-1/2 border-b border-l'
        }`}
      />
    </div>
  );
};

export default Tooltip;
