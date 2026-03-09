'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { llmSettingsApi } from '@/lib/api-client';

export const llmKeys = {
  settings: ['llm-settings'] as const,
};

export function useLLMSettings() {
  return useQuery({
    queryKey: llmKeys.settings,
    queryFn: () => llmSettingsApi.getMyKeys(),
  });
}

export function useSetLLMKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, apiKey }: { provider: string; apiKey: string }) =>
      llmSettingsApi.setKey(provider, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: llmKeys.settings });
    },
  });
}

export function useRemoveLLMKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => llmSettingsApi.removeKey(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: llmKeys.settings });
    },
  });
}

export function useTestLLMKey() {
  return useMutation({
    mutationFn: (provider: string) => llmSettingsApi.testKey(provider),
  });
}

export function useUpdateLLMPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: {
      primaryProvider?: string;
      fallbackEnabled?: boolean;
      fallbackOrder?: string[];
    }) => llmSettingsApi.updatePreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: llmKeys.settings });
    },
  });
}
