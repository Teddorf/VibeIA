export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Team {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  settings: {
    allowMemberInvites: boolean;
    defaultRole: TeamRole;
  };
  isPersonal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  _id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  user?: {
    name: string;
    email: string;
  };
  joinedAt: string;
}

export interface TeamInvitation {
  _id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface TeamActivity {
  _id: string;
  teamId: string;
  userId: string;
  action: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateTeamDto {
  name: string;
  description?: string;
}

export interface InviteMemberDto {
  email: string;
  role?: TeamRole;
}
