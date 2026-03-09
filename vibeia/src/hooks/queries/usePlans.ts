'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { plansApi } from '@/lib/api-client';

export const planKeys = {
  all: ['plans'] as const,
  byProject: (projectId: string) => ['plans', 'project', projectId] as const,
  detail: (id: string) => ['plans', id] as const,
};

export function usePlans(projectId: string) {
  return useQuery({
    queryKey: planKeys.byProject(projectId),
    queryFn: async () => {
      const res = await apiClient.get(`/api/plans?projectId=${projectId}`);
      return res.data || [];
    },
    enabled: !!projectId,
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: planKeys.detail(id),
    queryFn: async () => {
      const res = await apiClient.get(`/api/plans/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useGeneratePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { projectId: string; wizardData: unknown }) => plansApi.generate(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: planKeys.byProject(variables.projectId) });
    },
  });
}
