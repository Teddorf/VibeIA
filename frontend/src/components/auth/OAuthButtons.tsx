'use client';

import React, { useState, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

export type OAuthProvider = 'github' | 'google' | 'gitlab';

export interface OAuthButtonsProps {
  variant?: 'full' | 'compact';
  enabledProviders?: OAuthProvider[];
  redirectUri?: string;
  isLoading?: boolean;
  loadingProvider?: OAuthProvider;
  error?: string;
  onOAuthStart?: (provider: OAuthProvider) => void;
  onError?: (error: string) => void;
}

// ============================================
// ICONS
// ============================================

const GitHubIcon = () => (
  <svg data-testid="github-icon" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const GoogleIcon = () => (
  <svg data-testid="google-icon" className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const GitLabIcon = () => (
  <svg data-testid="gitlab-icon" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path fill="#E24329" d="m12 21.35l3.75-11.52H8.25z"/>
    <path fill="#FC6D26" d="m12 21.35l-3.75-11.52H1.16z"/>
    <path fill="#FCA326" d="M1.16 9.83L.1 13.09c-.1.3 0 .63.25.82L12 21.35z"/>
    <path fill="#E24329" d="M1.16 9.83h7.09L5.94 2.72c-.1-.32-.56-.32-.67 0z"/>
    <path fill="#FC6D26" d="m12 21.35l3.75-11.52h7.09z"/>
    <path fill="#FCA326" d="m22.84 9.83l1.06 3.26c.1.3 0 .63-.25.82L12 21.35z"/>
    <path fill="#E24329" d="M22.84 9.83h-7.09l2.31-7.11c.1-.32.56-.32.67 0z"/>
  </svg>
);

const LoadingSpinner = () => (
  <svg data-testid="loading-spinner" className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </svg>
);

// ============================================
// PROVIDER CONFIG
// ============================================

const PROVIDERS: Record<OAuthProvider, { name: string; Icon: React.FC; bgColor: string; hoverColor: string }> = {
  github: {
    name: 'GitHub',
    Icon: GitHubIcon,
    bgColor: 'bg-slate-800',
    hoverColor: 'hover:bg-slate-700',
  },
  google: {
    name: 'Google',
    Icon: GoogleIcon,
    bgColor: 'bg-white',
    hoverColor: 'hover:bg-gray-100',
  },
  gitlab: {
    name: 'GitLab',
    Icon: GitLabIcon,
    bgColor: 'bg-[#FC6D26]',
    hoverColor: 'hover:bg-[#E24329]',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateState = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const getOAuthUrl = (provider: OAuthProvider, state: string, redirectUri?: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const encodedRedirectUri = redirectUri ? encodeURIComponent(redirectUri) : '';
  const redirectParam = encodedRedirectUri ? `&redirect_uri=${encodedRedirectUri}` : '';
  return `${baseUrl}/api/auth/oauth/${provider}?state=${state}${redirectParam}`;
};

// ============================================
// MAIN COMPONENT
// ============================================

export function OAuthButtons({
  variant = 'full',
  enabledProviders = ['github', 'google', 'gitlab'],
  redirectUri,
  isLoading = false,
  loadingProvider,
  error,
  onOAuthStart,
  onError,
}: OAuthButtonsProps) {
  const [internalLoading, setInternalLoading] = useState<OAuthProvider | null>(null);

  const handleOAuthClick = useCallback(async (provider: OAuthProvider) => {
    try {
      // Notify parent
      onOAuthStart?.(provider);

      // Generate and store state for CSRF protection
      const state = generateState();
      localStorage.setItem('oauth_state', state);

      // Build OAuth URL
      const oauthUrl = getOAuthUrl(provider, state, redirectUri);

      // Open popup window
      const popup = window.open(
        oauthUrl,
        'oauth-popup',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Check if popup was blocked
      if (!popup) {
        onError?.('popup_blocked');
        return;
      }

      setInternalLoading(provider);

      // Poll for popup close
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          setInternalLoading(null);
        }
      }, 500);
    } catch (err) {
      onError?.('oauth_error');
      setInternalLoading(null);
    }
  }, [onOAuthStart, onError, redirectUri]);

  const currentLoading = loadingProvider || internalLoading;
  const isDisabled = isLoading || !!currentLoading;

  return (
    <div className="space-y-4">
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-800 text-slate-400">
            o continúa con
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* OAuth Buttons */}
      <div className={`flex ${variant === 'compact' ? 'justify-center gap-4' : 'flex-col gap-3'}`}>
        {enabledProviders.map((provider) => {
          const { name, Icon, bgColor, hoverColor } = PROVIDERS[provider];
          const isCurrentLoading = currentLoading === provider;
          const textColor = provider === 'google' ? 'text-gray-700' : 'text-white';

          return (
            <button
              key={provider}
              type="button"
              onClick={() => handleOAuthClick(provider)}
              disabled={isDisabled}
              aria-disabled={isDisabled}
              aria-label={`Continuar con ${name}`}
              className={`
                ${variant === 'compact' ? 'p-2' : 'flex items-center justify-center gap-3 w-full py-3 px-4'}
                ${bgColor} ${hoverColor}
                ${textColor}
                rounded-lg font-medium
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800
              `}
            >
              {isCurrentLoading ? (
                <LoadingSpinner />
              ) : (
                <Icon />
              )}
              {variant === 'full' && (
                <span>{name}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default OAuthButtons;
