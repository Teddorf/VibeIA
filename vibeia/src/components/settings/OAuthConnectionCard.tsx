'use client';

import React from 'react';
import { Github, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface UserInfo {
  name?: string;
  email?: string;
  username?: string;
}

interface OAuthConnectionCardProps {
  provider: 'github' | 'google' | 'gitlab';
  title: string;
  description: string;
  connected?: boolean;
  userInfo?: UserInfo;
  isLoading?: boolean;
  error?: string;
  icon?: React.ReactNode;
  onConnect: () => void;
  onDisconnect: () => void;
}

// Provider-specific icons
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const GitLabIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="m12 21.35l-3.75-11.52H1.16z" fill="#FC6D26" />
    <path d="M1.16 9.83L.1 13.09c-.1.3 0 .63.25.82L12 21.35z" fill="#FCA326" />
    <path d="M1.16 9.83h7.09L5.94 2.72c-.1-.32-.56-.32-.67 0z" fill="#E24329" />
    <path d="m12 21.35l3.75-11.52h7.09z" fill="#FC6D26" />
    <path d="m22.84 9.83l1.06 3.26c.1.3 0 .63-.25.82L12 21.35z" fill="#FCA326" />
    <path d="M22.84 9.83h-7.09l2.31-7.11c.1-.32.56-.32.67 0z" fill="#E24329" />
  </svg>
);

const providerIcons = {
  github: <Github className="w-5 h-5" />,
  google: <GoogleIcon />,
  gitlab: <GitLabIcon />,
};

const providerColors = {
  github: 'bg-slate-700 hover:bg-slate-600',
  google: 'bg-white/10 hover:bg-white/20',
  gitlab: 'bg-orange-600/20 hover:bg-orange-600/30',
};

export default function OAuthConnectionCard({
  provider,
  title,
  description,
  connected = false,
  userInfo,
  isLoading = false,
  error,
  icon,
  onConnect,
  onDisconnect,
}: OAuthConnectionCardProps) {
  const displayIcon = icon || providerIcons[provider];
  const displayName = userInfo?.name || userInfo?.username || userInfo?.email;

  return (
    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${providerColors[provider]}`}>{displayIcon}</div>
          <div>
            <h3 className="font-medium text-white">{title}</h3>
            <p className="text-sm text-slate-400">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2" aria-label={`${title} connection status`}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span className="text-sm text-slate-400">
                  {connected ? 'Disconnecting...' : 'Connecting...'}
                </span>
              </>
            ) : connected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Connected</span>
                {displayName && <span className="text-sm text-slate-300">({displayName})</span>}
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-400">Not connected</span>
              </>
            )}
          </div>

          {/* Action button */}
          {connected ? (
            <button
              onClick={onDisconnect}
              disabled={isLoading}
              aria-label={`Disconnect ${title}`}
              className="px-3 py-1.5 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={isLoading}
              aria-label={`Connect ${title}`}
              className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
