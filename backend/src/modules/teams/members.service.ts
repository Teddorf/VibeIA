import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TeamMember, TeamMemberDocument, TeamRole as SchemaTeamRole } from './schemas/team-member.schema';
import {
  TeamRole,
  Permission,
  ROLE_PERMISSIONS,
} from './dto/teams.dto';

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(TeamMember.name) private memberModel: Model<TeamMemberDocument>,
  ) {}

  async addMember(
    teamId: string,
    userId: string,
    role: TeamRole,
    invitedBy?: string,
  ): Promise<TeamMemberDocument> {
    // Check if already a member
    const existing = await this.getMemberByUserAndTeam(teamId, userId);
    if (existing) {
      return existing;
    }

    const member = new this.memberModel({
      teamId,
      userId,
      role,
      invitedBy,
      joinedAt: new Date(),
    });

    return member.save();
  }

  async removeMember(teamId: string, userId: string): Promise<boolean> {
    const member = await this.getMemberByUserAndTeam(teamId, userId);
    if (!member) return false;

    // Cannot remove owner
    if (member.role === TeamRole.OWNER) {
      return false;
    }

    await this.memberModel.findByIdAndDelete(member._id).exec();
    return true;
  }

  async getMember(memberId: string): Promise<TeamMemberDocument | null> {
    try {
      return await this.memberModel.findById(memberId).exec();
    } catch {
      return null;
    }
  }

  async getMemberByUserAndTeam(
    teamId: string,
    userId: string,
  ): Promise<TeamMemberDocument | null> {
    return this.memberModel.findOne({ teamId, userId }).exec();
  }

  async getTeamMembers(teamId: string): Promise<TeamMemberDocument[]> {
    const roleOrder = {
      [TeamRole.OWNER]: 0,
      [TeamRole.ADMIN]: 1,
      [TeamRole.MEMBER]: 2,
      [TeamRole.VIEWER]: 3,
    };

    const members = await this.memberModel.find({ teamId }).exec();

    // Sort by role
    return members.sort((a, b) => {
      const orderA = roleOrder[a.role as TeamRole] ?? 4;
      const orderB = roleOrder[b.role as TeamRole] ?? 4;
      return orderA - orderB;
    });
  }

  async getUserTeams(userId: string): Promise<TeamMemberDocument[]> {
    return this.memberModel.find({ userId }).exec();
  }

  async updateRole(
    teamId: string,
    userId: string,
    newRole: TeamRole,
  ): Promise<TeamMemberDocument | null> {
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

    return this.memberModel
      .findByIdAndUpdate(member._id, { role: newRole }, { new: true })
      .exec();
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

    return roleHierarchy[member.role as TeamRole] >= roleHierarchy[role];
  }

  async hasPermission(
    teamId: string,
    userId: string,
    permission: Permission,
  ): Promise<boolean> {
    const member = await this.getMemberByUserAndTeam(teamId, userId);
    if (!member) return false;

    const permissions = ROLE_PERMISSIONS[member.role as TeamRole];
    return permissions?.includes(permission) ?? false;
  }

  async getMemberPermissions(
    teamId: string,
    userId: string,
  ): Promise<Permission[]> {
    const member = await this.getMemberByUserAndTeam(teamId, userId);
    if (!member) return [];

    return ROLE_PERMISSIONS[member.role as TeamRole] ?? [];
  }

  async countMembers(teamId: string): Promise<number> {
    return this.memberModel.countDocuments({ teamId }).exec();
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
      const role = member.role as TeamRole;
      if (counts[role] !== undefined) {
        counts[role]++;
      }
    }

    return counts;
  }

  async getTeamOwner(teamId: string): Promise<TeamMemberDocument | null> {
    return this.memberModel.findOne({ teamId, role: TeamRole.OWNER }).exec();
  }

  async getTeamAdmins(teamId: string): Promise<TeamMemberDocument[]> {
    return this.memberModel
      .find({ teamId, role: { $in: [TeamRole.OWNER, TeamRole.ADMIN] } })
      .exec();
  }

  async transferOwnership(
    teamId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<boolean> {
    const currentOwner = await this.getMemberByUserAndTeam(teamId, currentOwnerId);
    const newOwner = await this.getMemberByUserAndTeam(teamId, newOwnerId);

    if (!currentOwner || !newOwner) return false;
    if (currentOwner.role !== TeamRole.OWNER) return false;

    // Demote current owner to admin
    await this.memberModel
      .findByIdAndUpdate(currentOwner._id, { role: TeamRole.ADMIN })
      .exec();

    // Promote new owner
    await this.memberModel
      .findByIdAndUpdate(newOwner._id, { role: TeamRole.OWNER })
      .exec();

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
  ): Promise<TeamMemberDocument[]> {
    const added: TeamMemberDocument[] = [];

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
  ): Promise<any[]> {
    if (!userResolver) return [];

    const members = await this.getTeamMembers(teamId);
    const results: any[] = [];
    const lowerQuery = query.toLowerCase();

    for (const member of members) {
      const user = await userResolver(member.userId);
      if (user) {
        if (
          user.name.toLowerCase().includes(lowerQuery) ||
          user.email.toLowerCase().includes(lowerQuery)
        ) {
          results.push({
            ...member.toObject(),
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
    await this.memberModel.deleteMany({ teamId }).exec();
  }
}
