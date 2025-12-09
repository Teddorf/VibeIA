import { Injectable } from '@nestjs/common';
import { randomUUID, randomBytes } from 'crypto';
import {
  Invitation,
  InvitationStatus,
  TeamRole,
  INVITATION_EXPIRY_DAYS,
} from './dto/teams.dto';

@Injectable()
export class InvitationsService {
  private invitations: Map<string, Invitation> = new Map();
  private tokenIndex: Map<string, string> = new Map(); // token -> invitationId
  private emailIndex: Map<string, Set<string>> = new Map(); // email -> Set<invitationId>
  private teamIndex: Map<string, Set<string>> = new Map(); // teamId -> Set<invitationId>

  async createInvitation(
    teamId: string,
    email: string,
    role: TeamRole,
    invitedBy: string,
  ): Promise<Invitation> {
    // Check for existing pending invitation
    const existing = await this.getPendingInvitation(teamId, email);
    if (existing) {
      // Update and return existing invitation
      existing.role = role;
      existing.invitedBy = invitedBy;
      existing.token = this.generateToken();
      existing.expiresAt = this.getExpiryDate();
      this.tokenIndex.delete(existing.token);
      this.tokenIndex.set(existing.token, existing.id);
      this.invitations.set(existing.id, existing);
      return existing;
    }

    const id = randomUUID();
    const token = this.generateToken();

    const invitation: Invitation = {
      id,
      teamId,
      email: email.toLowerCase(),
      role,
      status: InvitationStatus.PENDING,
      invitedBy,
      token,
      expiresAt: this.getExpiryDate(),
      createdAt: new Date(),
    };

    this.invitations.set(id, invitation);
    this.tokenIndex.set(token, id);

    // Update email index
    if (!this.emailIndex.has(email.toLowerCase())) {
      this.emailIndex.set(email.toLowerCase(), new Set());
    }
    this.emailIndex.get(email.toLowerCase())!.add(id);

    // Update team index
    if (!this.teamIndex.has(teamId)) {
      this.teamIndex.set(teamId, new Set());
    }
    this.teamIndex.get(teamId)!.add(id);

    return invitation;
  }

  async getInvitation(invitationId: string): Promise<Invitation | null> {
    return this.invitations.get(invitationId) || null;
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const invitationId = this.tokenIndex.get(token);
    if (!invitationId) return null;

    const invitation = this.invitations.get(invitationId);
    if (!invitation) return null;

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      await this.updateStatus(invitationId, InvitationStatus.EXPIRED);
      return this.invitations.get(invitationId) || null;
    }

    return invitation;
  }

  async getPendingInvitation(
    teamId: string,
    email: string,
  ): Promise<Invitation | null> {
    const invitationIds = this.emailIndex.get(email.toLowerCase());
    if (!invitationIds) return null;

    for (const id of invitationIds) {
      const invitation = this.invitations.get(id);
      if (
        invitation &&
        invitation.teamId === teamId &&
        invitation.status === InvitationStatus.PENDING
      ) {
        return invitation;
      }
    }

    return null;
  }

  async getTeamInvitations(
    teamId: string,
    status?: InvitationStatus,
  ): Promise<Invitation[]> {
    const invitationIds = this.teamIndex.get(teamId);
    if (!invitationIds) return [];

    const invitations: Invitation[] = [];
    for (const id of invitationIds) {
      const invitation = this.invitations.get(id);
      if (invitation) {
        if (!status || invitation.status === status) {
          invitations.push(invitation);
        }
      }
    }

    // Sort by creation date (newest first)
    return invitations.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async getInvitationsByEmail(email: string): Promise<Invitation[]> {
    const invitationIds = this.emailIndex.get(email.toLowerCase());
    if (!invitationIds) return [];

    const invitations: Invitation[] = [];
    for (const id of invitationIds) {
      const invitation = this.invitations.get(id);
      if (invitation) {
        invitations.push(invitation);
      }
    }

    return invitations.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async getPendingInvitationsByEmail(email: string): Promise<Invitation[]> {
    const invitations = await this.getInvitationsByEmail(email);
    return invitations.filter(
      (inv) =>
        inv.status === InvitationStatus.PENDING && inv.expiresAt >= new Date(),
    );
  }

  async acceptInvitation(token: string): Promise<Invitation | null> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) return null;

    if (invitation.status !== InvitationStatus.PENDING) {
      return invitation;
    }

    if (invitation.expiresAt < new Date()) {
      await this.updateStatus(invitation.id, InvitationStatus.EXPIRED);
      return this.invitations.get(invitation.id) || null;
    }

    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    this.invitations.set(invitation.id, invitation);

    return invitation;
  }

  async declineInvitation(token: string): Promise<Invitation | null> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) return null;

    if (invitation.status !== InvitationStatus.PENDING) {
      return invitation;
    }

    invitation.status = InvitationStatus.DECLINED;
    invitation.declinedAt = new Date();
    this.invitations.set(invitation.id, invitation);

    return invitation;
  }

  async revokeInvitation(invitationId: string): Promise<boolean> {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) return false;

    if (invitation.status !== InvitationStatus.PENDING) {
      return false;
    }

    invitation.status = InvitationStatus.REVOKED;
    this.invitations.set(invitationId, invitation);

    return true;
  }

  async resendInvitation(invitationId: string): Promise<Invitation | null> {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) return null;

    if (
      invitation.status !== InvitationStatus.PENDING &&
      invitation.status !== InvitationStatus.EXPIRED
    ) {
      return null;
    }

    // Generate new token and extend expiry
    const oldToken = invitation.token;
    invitation.token = this.generateToken();
    invitation.expiresAt = this.getExpiryDate();
    invitation.status = InvitationStatus.PENDING;

    // Update token index
    this.tokenIndex.delete(oldToken);
    this.tokenIndex.set(invitation.token, invitation.id);

    this.invitations.set(invitationId, invitation);

    return invitation;
  }

  async updateStatus(
    invitationId: string,
    status: InvitationStatus,
  ): Promise<boolean> {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) return false;

    invitation.status = status;
    this.invitations.set(invitationId, invitation);

    return true;
  }

  async deleteInvitation(invitationId: string): Promise<boolean> {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) return false;

    // Remove from indexes
    this.tokenIndex.delete(invitation.token);
    this.emailIndex.get(invitation.email)?.delete(invitationId);
    this.teamIndex.get(invitation.teamId)?.delete(invitationId);

    // Remove invitation
    this.invitations.delete(invitationId);

    return true;
  }

  async cleanupExpiredInvitations(): Promise<number> {
    let cleaned = 0;
    const now = new Date();

    for (const [id, invitation] of this.invitations) {
      if (
        invitation.status === InvitationStatus.PENDING &&
        invitation.expiresAt < now
      ) {
        invitation.status = InvitationStatus.EXPIRED;
        this.invitations.set(id, invitation);
        cleaned++;
      }
    }

    return cleaned;
  }

  async countPendingInvitations(teamId: string): Promise<number> {
    const invitations = await this.getTeamInvitations(
      teamId,
      InvitationStatus.PENDING,
    );
    return invitations.filter((inv) => inv.expiresAt >= new Date()).length;
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
  ): Promise<Invitation[]> {
    const invitations: Invitation[] = [];

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
    const invitationIds = this.teamIndex.get(teamId);
    if (!invitationIds) {
      return { pending: 0, accepted: 0, declined: 0, expired: 0, revoked: 0 };
    }

    const stats = {
      pending: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
      revoked: 0,
    };

    for (const id of invitationIds) {
      const invitation = this.invitations.get(id);
      if (invitation) {
        stats[invitation.status]++;
      }
    }

    return stats;
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
    const invitationIds = this.teamIndex.get(teamId);
    if (!invitationIds) return;

    for (const id of invitationIds) {
      await this.deleteInvitation(id);
    }
  }
}
