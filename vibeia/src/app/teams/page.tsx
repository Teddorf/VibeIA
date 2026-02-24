'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/contexts/AuthContext';
import { useTeams, useMyInvitations, useCreateTeam } from '@/hooks/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { teamsApi } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { teamKeys } from '@/hooks/queries/useTeams';

export default function TeamsPage() {
  useRequireAuth();
  const { data: teams, isLoading } = useTeams();
  const { data: invitations } = useMyInvitations();
  const createTeam = useCreateTeam();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createTeam.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setShowCreate(false);
    setName('');
    setDescription('');
  };

  const handleAcceptInvitation = async (token: string) => {
    await teamsApi.acceptInvitation(token);
    queryClient.invalidateQueries({ queryKey: teamKeys.all });
    queryClient.invalidateQueries({ queryKey: teamKeys.myInvitations });
  };

  const handleDeclineInvitation = async (token: string) => {
    await teamsApi.declineInvitation(token);
    queryClient.invalidateQueries({ queryKey: teamKeys.myInvitations });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Teams</h1>
            <p className="mt-1 text-slate-400">Manage your teams and collaborations</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-500">
            Create Team
          </Button>
        </div>

        {/* Pending Invitations */}
        {invitations && invitations.length > 0 && (
          <div className="mb-8 bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-purple-300 mb-3">
              Pending Invitations ({invitations.length})
            </h2>
            <div className="space-y-3">
              {invitations.map((inv: any) => (
                <div
                  key={inv._id}
                  className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3"
                >
                  <div>
                    <p className="text-white font-medium">{inv.teamName || 'Team'}</p>
                    <p className="text-sm text-slate-400">Role: {inv.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAcceptInvitation(inv.token)}
                      className="bg-green-600 hover:bg-green-500 text-sm px-3 py-1"
                      size="sm"
                    >
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleDeclineInvitation(inv.token)}
                      variant="outline"
                      size="sm"
                      className="text-sm px-3 py-1"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teams Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : teams && teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team: any) => (
              <Link
                key={team._id}
                href={`/teams/${team.slug}`}
                className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 hover:border-purple-500/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  {team.isPersonal && <Badge variant="secondary">Personal</Badge>}
                </div>
                <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                  {team.name}
                </h3>
                {team.description && (
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">{team.description}</p>
                )}
                <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                  <span>{team.memberCount || 0} members</span>
                  <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-slate-700/50">
            <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No teams yet</h3>
            <p className="text-slate-400 mb-6">Create a team to collaborate with others</p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-purple-600 hover:bg-purple-500"
            >
              Create Your First Team
            </Button>
          </div>
        )}

        {/* Create Team Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Team Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Team"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description (optional)
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this team about?"
                  className="bg-slate-700/50 border-slate-600 text-white"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || createTeam.isPending}
                className="bg-purple-600 hover:bg-purple-500"
              >
                {createTeam.isPending ? 'Creating...' : 'Create Team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
