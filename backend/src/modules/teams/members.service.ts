import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  TeamMember,
  TeamRole,
  Permission,
  ROLE_PERMISSIONS,
} from './dto/teams.dto';

@Injectable()
export class MembersService {
  private members: Map<string, TeamMember> = new Map();
  private teamMemberIndex: Map<string, Set<string>> = new Map(); // teamId -> Set<memberId>
  private userTeamIndex: Map<string, Set<string>> = new Map(); // userId -> Set<memberId>

  async addMember(
    teamId: string,
    userId: string,
    role: TeamRole,
    invitedBy?: string,
  ): Promise<TeamMember> {
    // Check if already a member
    const existing = await this.getMemberByUserAndTeam(teamId, userId);
    if (existing) {
      return existing;
    }

    const id = randomUUID();
    const member: TeamMember = {
      id,
      teamId,
      userId,
      role,
      joinedAt: new Date(),
      invitedBy,
    };

    this.members.set(id, member);

    // Update team index
    if (!this.teamMemberIndex.has(teamId)) {
      this.teamMemberIndex.set(teamId, new Set());
    }
    this.teamMemberIndex.get(teamId)!.add(id);

    // Update user index
    if (!this.userTeamIndex.has(userId)) {
      this.userTeamIndex.set(userId, new Set());
    }
    this.userTeamIndex.get(userId)!.add(id);

    return member;
  }

  async removeMember(teamId: string, userId: string): Promise<boolean> {
    const member = await this.getMemberByUserAndTeam(teamId, userId);
    if (!member) return false;

    // Cannot remove owner
    if (member.role === TeamRole.OWNER) {
      return false;
    }

    this.members.delete(member.id);

    // Update indexes
    this.teamMemberIndex.get(teamId)?.delete(member.id);
    this.userTeamIndex.get(userId)?.delete(member.id);

    return true;
  }

  async getMember(memberId: string): Promise<TeamMember | null> {
    return this.members.get(memberId) || null;
  }

  async getMemberByUserAndTeam(
    teamId: string,
    userId: string,
  ): Promise<TeamMember | null> {
    const memberIds = this.teamMemberIndex.get(teamId);
    if (!memberIds) return null;

    for (const memberId of memberIds) {
      const member = this.members.get(memberId);
      if (member && member.userId === userId) {
        return member;
      }
    }

    return null;
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const memberIds = this.teamMemberIndex.get(teamId);
    if (!memberIds) return [];

    const members: TeamMember[] = [];
    for (const memberId of memberIds) {
      const member = this.members.get(memberId);
      if (member) {
        members.push(member);
      }
    }

    // Sort by role (owner first, then admin, member, viewer)
    const roleOrder = {
      [TeamRole.OWNER]: 0,
      [TeamRole.ADMIN]: 1,
      [TeamRole.MEMBER]: 2,
      [TeamRole.VIEWER]: 3,
    };

    return members.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
  }

  async getUserTeams(userId: string): Promise<TeamMember[]> {
    const memberIds = this.userTeamIndex.get(userId);
    if (!memberIds) return [];

    const members: TeamMember[] = [];
    for (const memberId of memberIds) {
      const member = this.members.get(memberId);
      if (member) {
        members.push(member);
      }
    }

    return members;
  }

  async updateRole(
    teamId: string,
    userId: string,
    newRole: TeamRole,
  ): Promise<TeamMember | null> {
    const member = await this.getMemberByUserAndTeam(teamId, userId);
    if (!member) return null;

    // Cannot change owner role (must transfer ownership)
    if (member.role === TeamRole.OWNER) {
      return null;
    }

    // Cannot promote to owner
    if (newRole === TeamRole.OWNER) {
      return null;
    }

    member.role = newRole;
    this.members.set(member.id, member);

    return member;
  }

  async isMember(teamId: string, userId: string): Promise<boolean> {
    const member = await this.getMemberByUserAndTeam(teamId, userId);
    return member !== null;
  }

  async hasRole(
    teamId: string,
    userId: string,
    role: TeamRole,
  ): Promise<boolean> {
    const member = await this.getMemberByUserAndTeam(teamId, userId);
    if (!member) return false;

    // Check if user's role is equal or higher
    const roleHierarchy = {
      [TeamRole.OWNER]: 4,
      [TeamRole.ADMIN]: 3,
      [TeamRole.MEMBER]: 2,
      [TeamRole.VIEWER]: 1,
    };

    return roleHierarchy[member.role] >= roleHierarchy[role];
  }

  async hasPermission(
    teamId: string,
    userId: string,
    permission: Permission,
  ): Promise<boolean> {
    const member = await this.getMemberByUserAndTeam(teamId, userId);
    if (!member) return false;

    const permissions = ROLE_PERMISSIONS[member.role];
    return permissions.includes(permission);
  }

  async getMemberPermissions(
    teamId: string,
    userId: string,
  ): Promise<Permission[]> {
    const member = await this.getMemberByUserAndTeam(teamId, userId);
    if (!member) return [];

    return ROLE_PERMISSIONS[member.role];
  }

  async countMembers(teamId: string): Promise<number> {
    const memberIds = this.teamMemberIndex.get(teamId);
    return memberIds?.size || 0;
  }

  async countMembersByRole(teamId: string): Promise<Record<TeamRole, number>> {
    const members = await this.getTeamMembers(teamId);

    const counts: Record<TeamRole, number> = {
      [TeamRole.OWNER]: 0,
      [TeamRole.ADMIN]: 0,
      [TeamRole.MEMBER]: 0,
      [TeamRole.VIEWER]: 0,
    };

    for (const member of members) {
      counts[member.role]++;
    }

    return counts;
  }

  async getTeamOwner(teamId: string): Promise<TeamMember | null> {
    const members = await this.getTeamMembers(teamId);
    return members.find((m) => m.role === TeamRole.OWNER) || null;
  }

  async getTeamAdmins(teamId: string): Promise<TeamMember[]> {
    const members = await this.getTeamMembers(teamId);
    return members.filter(
      (m) => m.role === TeamRole.OWNER || m.role === TeamRole.ADMIN,
    );
  }

  async transferOwnership(
    teamId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<boolean> {
    const currentOwner = await this.getMemberByUserAndTeam(
      teamId,
      currentOwnerId,
    );
    const newOwner = await this.getMemberByUserAndTeam(teamId, newOwnerId);

    if (!currentOwner || !newOwner) return false;
    if (currentOwner.role !== TeamRole.OWNER) return false;

    // Demote current owner to admin
    currentOwner.role = TeamRole.ADMIN;
    this.members.set(currentOwner.id, currentOwner);

    // Promote new owner
    newOwner.role = TeamRole.OWNER;
    this.members.set(newOwner.id, newOwner);

    return true;
  }

  async leaveTeam(teamId: string, userId: string): Promise<boolean> {
    const member = await this.getMemberByUserAndTeam(teamId, userId);
    if (!member) return false;

    // Owner cannot leave without transferring
    if (member.role === TeamRole.OWNER) {
      return false;
    }

    return this.removeMember(teamId, userId);
  }

  async bulkAddMembers(
    teamId: string,
    members: Array<{ userId: string; role: TeamRole }>,
    invitedBy: string,
  ): Promise<TeamMember[]> {
    const added: TeamMember[] = [];

    for (const { userId, role } of members) {
      // Skip owner role in bulk add
      if (role === TeamRole.OWNER) continue;

      const member = await this.addMember(teamId, userId, role, invitedBy);
      added.push(member);
    }

    return added;
  }

  async searchMembers(
    teamId: string,
    query: string,
    userResolver?: (userId: string) => Promise<{ name: string; email: string } | null>,
  ): Promise<TeamMember[]> {
    if (!userResolver) return [];

    const members = await this.getTeamMembers(teamId);
    const results: TeamMember[] = [];
    const lowerQuery = query.toLowerCase();

    for (const member of members) {
      const user = await userResolver(member.userId);
      if (user) {
        if (
          user.name.toLowerCase().includes(lowerQuery) ||
          user.email.toLowerCase().includes(lowerQuery)
        ) {
          results.push({
            ...member,
            user: {
              id: member.userId,
              name: user.name,
              email: user.email,
            },
          });
        }
      }
    }

    return results;
  }

  async clearTeamMembers(teamId: string): Promise<void> {
    const memberIds = this.teamMemberIndex.get(teamId);
    if (!memberIds) return;

    for (const memberId of memberIds) {
      const member = this.members.get(memberId);
      if (member) {
        this.userTeamIndex.get(member.userId)?.delete(memberId);
        this.members.delete(memberId);
      }
    }

    this.teamMemberIndex.delete(teamId);
  }
}
