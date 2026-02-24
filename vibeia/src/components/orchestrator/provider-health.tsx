'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';

interface ProviderStatus {
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latencyMs?: number;
  lastChecked?: string;
}

const STATUS_STYLES: Record<string, string> = {
  healthy: 'bg-green-400',
  degraded: 'bg-yellow-400',
  down: 'bg-red-400',
  unknown: 'bg-slate-400',
};

export function ProviderHealth() {
  const [providers, setProviders] = useState<ProviderStatus[]>([
    { name: 'Anthropic', type: 'llm', status: 'unknown' },
    { name: 'OpenAI', type: 'llm', status: 'unknown' },
    { name: 'Gemini', type: 'llm', status: 'unknown' },
    { name: 'MongoDB', type: 'database', status: 'unknown' },
    { name: 'GitHub', type: 'vcs', status: 'unknown' },
    { name: 'Redis', type: 'cache', status: 'unknown' },
  ]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const { data } = await apiClient.get('/api/recommendations/database/providers');
        setProviders((prev) =>
          prev.map((p) => ({
            ...p,
            status: 'healthy' as const,
            lastChecked: new Date().toISOString(),
          })),
        );
      } catch {
        setProviders((prev) =>
          prev.map((p) => ({
            ...p,
            status: p.type === 'database' ? 'down' : p.status,
            lastChecked: new Date().toISOString(),
          })),
        );
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3 text-white">Provider Health</h3>
      <div className="space-y-2">
        {providers.map((provider) => (
          <div
            key={provider.name}
            className="flex items-center justify-between rounded-lg border border-slate-600/50 p-2 bg-slate-700/30"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[provider.status]}`} />
              <span className="text-sm font-medium text-white">{provider.name}</span>
              <span className="text-xs text-slate-400 capitalize">{provider.type}</span>
            </div>
            <div className="flex items-center gap-3">
              {provider.latencyMs !== undefined && (
                <span className="text-xs text-slate-400">{provider.latencyMs}ms</span>
              )}
              <span
                className={`text-xs capitalize ${
                  provider.status === 'healthy'
                    ? 'text-green-400'
                    : provider.status === 'degraded'
                      ? 'text-yellow-400'
                      : provider.status === 'down'
                        ? 'text-red-400'
                        : 'text-slate-400'
                }`}
              >
                {provider.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
