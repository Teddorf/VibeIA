import { Injectable, Inject } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  TeamInvitation,
  TeamInvitationDocument,
} from './schemas/team-invitation.schema';
import {
  InvitationStatus,
  TeamRole,
  INVITATION_EXPIRY_DAYS,
} from './dto/teams.dto';
import { IRepository } from '../../providers/interfaces/database-provider.interface';
import { TEAM_INVITATION_REPOSITORY } from '../../providers/repository-tokens';

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(TEAM_INVITATION_REPOSITORY)
    private readonly invitationRepo: IRepository<TeamInvitationDocument>,
  ) {}

  async createInvitation(
    teamId: string,
    email: string,
    role: TeamRole,
    invitedBy: string,
  ): Promise<TeamInvitationDocument> {
    const normalizedEmail = email.toLowerCase();

    // Check for existing pending invitation
    const existing = await this.getPendingInvitation(teamId, normalizedEmail);
    if (existing) {
      // Update and return existing invitation
      return this.invitationRepo.update((existing as any)._id.toString(), {
        role,
        invitedBy,
        token: this.generateToken(),
        expiresAt: this.getExpiryDate(),
      }) as Promise<TeamInvitationDocument>;
    }

    return this.invitationRepo.create({
      teamId,
      email: normalizedEmail,
      role,
      status: InvitationStatus.PENDING,
      invitedBy,
      token: this.generateToken(),
      expiresAt: this.getExpiryDate(),
    } as any);
  }

  async getInvitation(
    invitationId: string,
  ): Promise<TeamInvitationDocument | null> {
    try {
      return await this.invitationRepo.findById(invitationId);
    } catch {
      return null;
    }
  }

  async getInvitationByToken(
    token: string,
  ): Promise<TeamInvitationDocument | null> {
    const invitation = await this.invitationRepo.findOne({ token });
    if (!invitation) return null;

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      await this.updateStatus(
        (invitation as any)._id.toString(),
        InvitationStatus.EXPIRED,
      );
      return this.invitationRepo.findById((invitation as any)._id.toString());
    }

    return invitation;
  }

  async getPendingInvitation(
    teamId: string,
    email: string,
  ): Promise<TeamInvitationDocument | null> {
    return this.invitationRepo.findOne({
      teamId,
      email: email.toLowerCase(),
      status: InvitationStatus.PENDING,
    });
  }

  async getTeamInvitations(
    teamId: string,
    status?: InvitationStatus,
  ): Promise<TeamInvitationDocument[]> {
    const query: Record<string, any> = { teamId };
    if (status) {
      query.status = status;
    }

    return this.invitationRepo.find(query, { sort: { createdAt: -1 } });
  }

  async getInvitationsByEmail(
    email: string,
  ): Promise<TeamInvitationDocument[]> {
    return this.invitationRepo.find(
      { email: email.toLowerCase() },
      { sort: { createdAt: -1 } },
    );
  }

  async getPendingInvitationsByEmail(
    email: string,
  ): Promise<TeamInvitationDocument[]> {
    return this.invitationRepo.find(
      {
        email: email.toLowerCase(),
        status: InvitationStatus.PENDING,
        expiresAt: { $gte: new Date() },
      },
      { sort: { createdAt: -1 } },
    );
  }

  async acceptInvitation(
    token: string,
  ): Promise<TeamInvitationDocument | null> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) return null;

    if (invitation.status !== InvitationStatus.PENDING) {
      return invitation;
    }

    if (invitation.expiresAt < new Date()) {
      await this.updateStatus(
        (invitation as any)._id.toString(),
        InvitationStatus.EXPIRED,
      );
      return this.invitationRepo.findById((invitation as any)._id.toString());
    }

    return this.invitationRepo.update((invitation as any)._id.toString(), {
      status: InvitationStatus.ACCEPTED,
      acceptedAt: new Date(),
    });
  }

  async declineInvitation(
    token: string,
  ): Promise<TeamInvitationDocument | null> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) return null;

    if (invitation.status !== InvitationStatus.PENDING) {
      return invitation;
    }

    return this.invitationRepo.update((invitation as any)._id.toString(), {
      status: InvitationStatus.DECLINED,
      declinedAt: new Date(),
    });
  }

  async revokeInvitation(invitationId: string): Promise<boolean> {
    const invitation = await this.getInvitation(invitationId);
    if (!invitation) return false;

    if (invitation.status !== InvitationStatus.PENDING) {
      return false;
    }

    const result = await this.invitationRepo.update(invitationId, {
      status: InvitationStatus.REVOKED,
    });
    return result !== null;
  }

  async resendInvitation(
    invitationId: string,
  ): Promise<TeamInvitationDocument | null> {
    const invitation = await this.getInvitation(invitationId);
    if (!invitation) return null;

    if (
      invitation.status !== InvitationStatus.PENDING &&
      invitation.status !== InvitationStatus.EXPIRED
    ) {
      return null;
    }

    return this.invitationRepo.update(invitationId, {
      token: this.generateToken(),
      expiresAt: this.getExpiryDate(),
      status: InvitationStatus.PENDING,
    });
  }

  async updateStatus(
    invitationId: string,
    status: InvitationStatus,
  ): Promise<boolean> {
    const result = await this.invitationRepo.update(invitationId, { status });
    return result !== null;
  }

  async deleteInvitation(invitationId: string): Promise<boolean> {
    return this.invitationRepo.delete(invitationId);
  }

  async cleanupExpiredInvitations(): Promise<number> {
    const result = await this.invitationRepo.updateMany(
      {
        status: InvitationStatus.PENDING,
        expiresAt: { $lt: new Date() },
      },
      { status: InvitationStatus.EXPIRED },
    );

    return result.modifiedCount;
  }

  async countPendingInvitations(teamId: string): Promise<number> {
    return this.invitationRepo.count({
      teamId,
      status: InvitationStatus.PENDING,
      expiresAt: { $gte: new Date() },
    });
  }

  async hasBeenInvited(teamId: string, email: string): Promise<boolean> {
    const invitation = await this.getPendingInvitation(teamId, email);
    return invitation !== null;
  }

  async bulkInvite(
    teamId: string,
    emails: string[],
    role: TeamRole,
    invitedBy: string,
  ): Promise<TeamInvitationDocument[]> {
    const invitations: TeamInvitationDocument[] = [];

    for (const email of emails) {
      const invitation = await this.createInvitation(
        teamId,
        email,
        role,
        invitedBy,
      );
      invitations.push(invitation);
    }

    return invitations;
  }

  async getInvitationStats(teamId: string): Promise<{
    pending: number;
    accepted: number;
    declined: number;
    expired: number;
    revoked: number;
  }> {
    // Since IRepository doesn't have aggregate, we count each status individually
    const [pending, accepted, declined, expired, revoked] = await Promise.all([
      this.invitationRepo.count({ teamId, status: InvitationStatus.PENDING }),
      this.invitationRepo.count({ teamId, status: InvitationStatus.ACCEPTED }),
      this.invitationRepo.count({ teamId, status: InvitationStatus.DECLINED }),
      this.invitationRepo.count({ teamId, status: InvitationStatus.EXPIRED }),
      this.invitationRepo.count({ teamId, status: InvitationStatus.REVOKED }),
    ]);

    return {
      pending,
      accepted,
      declined,
      expired,
      revoked,
    };
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private getExpiryDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + INVITATION_EXPIRY_DAYS);
    return date;
  }

  async clearTeamInvitations(teamId: string): Promise<void> {
    await this.invitationRepo.deleteMany({ teamId });
  }
}
