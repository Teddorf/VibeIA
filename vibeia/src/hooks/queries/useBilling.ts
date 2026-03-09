'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '@/lib/api-client';

export const billingKeys = {
  subscription: ['billing', 'subscription'] as const,
  plans: ['billing', 'plans'] as const,
  invoices: ['billing', 'invoices'] as const,
  usage: (period?: string) => ['billing', 'usage', period] as const,
};

export function useSubscription() {
  return useQuery({
    queryKey: billingKeys.subscription,
    queryFn: () => billingApi.getMySubscription(),
  });
}

export function useBillingPlans() {
  return useQuery({
    queryKey: billingKeys.plans,
    queryFn: () => billingApi.getPlans(),
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: billingKeys.invoices,
    queryFn: () => billingApi.getInvoices(),
  });
}

export function useUsage(period?: string) {
  return useQuery({
    queryKey: billingKeys.usage(period),
    queryFn: () => billingApi.getMyUsage(period),
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, immediately }: { id: string; immediately?: boolean }) =>
      billingApi.cancelSubscription(id, immediately),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription });
    },
  });
}
