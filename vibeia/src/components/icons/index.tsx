'use client';

import React from 'react';

// ============================================
// SHARED ICON PROPS
// ============================================

export interface IconProps {
  className?: string;
  'data-testid'?: string;
  'aria-hidden'?: boolean;
}

const defaultIconProps: IconProps = {
  className: 'w-4 h-4',
  'aria-hidden': true,
};

// ============================================
// STATUS ICONS
// ============================================

export const CheckIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'check-icon'}
    className={props.className || defaultIconProps.className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export const AlertIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'alert-icon'}
    className={props.className || 'w-4 h-4 text-yellow-500'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export const BlockedIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'blocked-icon'}
    className={props.className || 'w-4 h-4 text-red-500'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

export const ErrorIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'error-icon'}
    className={props.className || 'w-4 h-4 text-red-400'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const SuccessIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'success-icon'}
    className={props.className || 'w-4 h-4 text-green-400'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export const WarningIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'warning-icon'}
    className={props.className || 'w-4 h-4 text-yellow-400'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export const InfoIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'info-icon'}
    className={props.className || 'w-4 h-4 text-slate-400'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ============================================
// TIME ICONS
// ============================================

export const ClockIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'clock-icon'}
    className={props.className || defaultIconProps.className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ============================================
// NAVIGATION ICONS
// ============================================

export const ChevronRightIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'chevron-right-icon'}
    className={props.className || 'w-4 h-4 text-slate-500'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export const HomeIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'home-icon'}
    className={props.className || 'w-4 h-4'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

// ============================================
// ACTION ICONS
// ============================================

export const LinkIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'link-icon'}
    className={props.className || defaultIconProps.className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

export const CopyIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'copy-icon'}
    className={props.className || defaultIconProps.className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

export const SendIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'send-icon'}
    className={props.className || defaultIconProps.className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

// ============================================
// UI ICONS
// ============================================

export const MenuIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'menu-icon'}
    className={props.className || 'w-5 h-5'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

export const StarIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'star-icon'}
    className={props.className || 'w-4 h-4 text-yellow-400 fill-current'}
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'lock-icon'}
    className={props.className || defaultIconProps.className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

export const PhaseIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'phase-icon'}
    className={props.className || 'w-4 h-4 text-purple-400'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// ============================================
// DRAG HANDLE
// ============================================

export const DragHandleIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'drag-handle-icon'}
    className={props.className || 'w-4 h-4 text-slate-500'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
  </svg>
);

// ============================================
// FOLDER/PROJECT ICONS
// ============================================

export const FolderIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'folder-icon'}
    className={props.className || 'w-5 h-5 text-purple-400'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'plus-icon'}
    className={props.className || 'w-5 h-5'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// ============================================
// UNASSIGNED/PLACEHOLDER
// ============================================

export const UnassignedIcon: React.FC<IconProps> = (props) => (
  <svg
    data-testid={props['data-testid'] || 'unassigned-icon'}
    className={props.className || 'w-4 h-4 text-slate-500'}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden={props['aria-hidden'] ?? defaultIconProps['aria-hidden']}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
