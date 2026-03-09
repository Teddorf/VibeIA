'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRequireAuth } from '@/contexts/AuthContext';
import {
  useTeam,
  useTeamMembers,
  useTeamInvitations,
  useTeamActivity,
  useInviteMember,
  useRemoveMember,
  useDeleteTeam,
  useGitConnections,
} from '@/hooks/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function TeamDetailPage() {
  useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { data: team, isLoading } = useTeam(slug);
  const teamId = team?._id || '';
  const { data: members } = useTeamMembers(teamId);
  const { data: invitations } = useTeamInvitations(teamId);
  const { data: activity } = useTeamActivity(teamId);
  const { data: gitConnections } = useGitConnections(teamId);

  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();
  const deleteTeam = useDeleteTeam();

  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'git' | 'settings'>(
    'overview',
  );
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !teamId) return;
    await inviteMember.mutateAsync({ teamId, email: inviteEmail.trim(), role: inviteRole });
    setShowInvite(false);
    setInviteEmail('');
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !teamId) return;
    await removeMember.mutateAsync({ teamId, memberId: memberToRemove });
    setMemberToRemove(null);
  };

  const handleDeleteTeam = async () => {
    if (!teamId) return;
    await deleteTeam.mutateAsync(teamId);
    router.push('/teams');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Team not found</h2>
          <Link href="/teams" className="text-purple-400 hover:text-purple-300">
            Back to teams
          </Link>
        </div>
      </div>
    );
  }

  const tabs = ['overview', 'members', 'git', 'settings'] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
          <Link href="/teams" className="hover:text-white transition-colors">
            Teams
          </Link>
          <span>/</span>
          <span className="text-white">{team.name}</span>
        </nav>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{team.name}</h1>
            {team.description && <p className="text-slate-400 mt-1">{team.description}</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-slate-800/50 backdrop-blur-xl rounded-lg p-1 border border-slate-700/50">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 text-center">
                <p className="text-2xl font-bold text-white">{members?.length || 0}</p>
                <p className="text-sm text-slate-400">Members</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 text-center">
                <p className="text-2xl font-bold text-white">{invitations?.length || 0}</p>
                <p className="text-sm text-slate-400">Pending Invitations</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 text-center">
                <p className="text-2xl font-bold text-white">{gitConnections?.length || 0}</p>
                <p className="text-sm text-slate-400">Git Connections</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              {activity && activity.length > 0 ? (
                <div className="space-y-3">
                  {activity.slice(0, 10).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-slate-300">{item.description || item.action}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No activity yet</p>
              )}
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button
                onClick={() => setShowInvite(true)}
                className="bg-purple-600 hover:bg-purple-500"
              >
                Invite Member
              </Button>
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              {members && members.length > 0 ? (
                <div className="divide-y divide-slate-700/50">
                  {members.map((member: any) => (
                    <div key={member._id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarFallback>
                            {(member.userId?.name || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-white font-medium">
                            {member.userId?.name || member.userId?.email || 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-400">{member.userId?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => setMemberToRemove(member._id)}
                            className="text-sm text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-slate-500">No members</div>
              )}
            </div>

            {/* Pending Invitations */}
            {invitations && invitations.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="px-6 py-3 border-b border-slate-700/50">
                  <h3 className="text-sm font-semibold text-slate-300">Pending Invitations</h3>
                </div>
                <div className="divide-y divide-slate-700/50">
                  {invitations.map((inv: any) => (
                    <div key={inv._id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">{inv.email}</p>
                        <p className="text-xs text-slate-400">Invited as {inv.role}</p>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Git Connections Tab */}
        {activeTab === 'git' && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Git Connections</h3>
            {gitConnections && gitConnections.length > 0 ? (
              <div className="space-y-3">
                {gitConnections.map((conn: any) => (
                  <div
                    key={conn._id}
                    className="flex items-center justify-between bg-slate-700/30 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Badge>{conn.provider}</Badge>
                      <div>
                        <p className="text-white font-medium">
                          {conn.organizationName || conn.provider}
                        </p>
                        <p className="text-xs text-slate-400">
                          Connected {new Date(conn.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={conn.status === 'active' ? 'default' : 'destructive'}>
                      {conn.status || 'active'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">
                No git connections yet. Connect a provider to enable team collaboration on
                repositories.
              </p>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Team Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Slug</span>
                  <span className="text-white">{team.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Created</span>
                  <span className="text-white">
                    {new Date(team.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-900/10 rounded-xl border border-red-500/30 p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
              <p className="text-sm text-slate-400 mb-4">
                Deleting a team is permanent and cannot be undone.
              </p>
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-500"
              >
                Delete Team
              </Button>
            </div>
          </div>
        )}

        {/* Invite Dialog */}
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Invite Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInvite(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviteMember.isPending}
                className="bg-purple-600 hover:bg-purple-500"
              >
                {inviteMember.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete Team"
          description={`Are you sure you want to delete "${team.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDeleteTeam}
          isLoading={deleteTeam.isPending}
        />

        {/* Remove Member Confirmation */}
        <ConfirmDialog
          open={!!memberToRemove}
          onOpenChange={(open) => !open && setMemberToRemove(null)}
          title="Remove Member"
          description="Are you sure you want to remove this member from the team?"
          confirmLabel="Remove"
          variant="destructive"
          onConfirm={handleRemoveMember}
          isLoading={removeMember.isPending}
        />
      </div>
    </div>
  );
}
