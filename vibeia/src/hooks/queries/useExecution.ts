'use client';

import { useQuery } from '@tanstack/react-query';
import { executionApi } from '@/lib/api-client';

export const executionKeys = {
  status: (planId: string) => ['execution', planId] as const,
};

export function useExecutionStatus(planId: string) {
  return useQuery({
    queryKey: executionKeys.status(planId),
    queryFn: () => executionApi.getStatus(planId),
    enabled: !!planId,
    refetchInterval: 5000, // Poll every 5 seconds while active
  });
}
