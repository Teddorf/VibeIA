'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi } from '@/lib/api-client';

export const teamKeys = {
  all: ['teams'] as const,
  detail: (slug: string) => ['teams', slug] as const,
  members: (teamId: string) => ['teams', teamId, 'members'] as const,
  invitations: (teamId: string) => ['teams', teamId, 'invitations'] as const,
  myInvitations: ['teams', 'my-invitations'] as const,
  activity: (teamId: string) => ['teams', teamId, 'activity'] as const,
  gitConnections: (teamId: string) => ['teams', teamId, 'git-connections'] as const,
};

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: () => teamsApi.getMyTeams(),
  });
}

export function useTeam(slug: string) {
  return useQuery({
    queryKey: teamKeys.detail(slug),
    queryFn: () => teamsApi.getTeamBySlug(slug),
    enabled: !!slug,
  });
}

export function useTeamMembers(teamId: string) {
  return useQuery({
    queryKey: teamKeys.members(teamId),
    queryFn: () => teamsApi.getMembers(teamId),
    enabled: !!teamId,
  });
}

export function useTeamInvitations(teamId: string) {
  return useQuery({
    queryKey: teamKeys.invitations(teamId),
    queryFn: () => teamsApi.getInvitations(teamId),
    enabled: !!teamId,
  });
}

export function useMyInvitations() {
  return useQuery({
    queryKey: teamKeys.myInvitations,
    queryFn: () => teamsApi.getPendingInvitations(),
  });
}

export function useTeamActivity(teamId: string) {
  return useQuery({
    queryKey: teamKeys.activity(teamId),
    queryFn: () => teamsApi.getTeamActivity(teamId),
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => teamsApi.createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => teamsApi.deleteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, email, role }: { teamId: string; email: string; role: string }) =>
      teamsApi.inviteMember(teamId, email, role),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(variables.teamId) });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, memberId }: { teamId: string; memberId: string }) =>
      teamsApi.removeMember(teamId, memberId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(variables.teamId) });
    },
  });
}

export function useGitConnections(teamId: string) {
  return useQuery({
    queryKey: teamKeys.gitConnections(teamId),
    queryFn: () => teamsApi.getGitConnections(teamId),
    enabled: !!teamId,
  });
}
