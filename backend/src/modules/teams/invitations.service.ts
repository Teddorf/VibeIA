import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { TeamInvitation, TeamInvitationDocument } from './schemas/team-invitation.schema';
import {
  InvitationStatus,
  TeamRole,
  INVITATION_EXPIRY_DAYS,
} from './dto/teams.dto';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectModel(TeamInvitation.name) private invitationModel: Model<TeamInvitationDocument>,
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
      return this.invitationModel
        .findByIdAndUpdate(
          existing._id,
          {
            role,
            invitedBy,
            token: this.generateToken(),
            expiresAt: this.getExpiryDate(),
          },
          { new: true },
        )
        .exec() as Promise<TeamInvitationDocument>;
    }

    const invitation = new this.invitationModel({
      teamId,
      email: normalizedEmail,
      role,
      status: InvitationStatus.PENDING,
      invitedBy,
      token: this.generateToken(),
      expiresAt: this.getExpiryDate(),
    });

    return invitation.save();
  }

  async getInvitation(invitationId: string): Promise<TeamInvitationDocument | null> {
    try {
      return await this.invitationModel.findById(invitationId).exec();
    } catch {
      return null;
    }
  }

  async getInvitationByToken(token: string): Promise<TeamInvitationDocument | null> {
    const invitation = await this.invitationModel.findOne({ token }).exec();
    if (!invitation) return null;

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      await this.updateStatus(invitation._id.toString(), InvitationStatus.EXPIRED);
      return this.invitationModel.findById(invitation._id).exec();
    }

    return invitation;
  }

  async getPendingInvitation(
    teamId: string,
    email: string,
  ): Promise<TeamInvitationDocument | null> {
    return this.invitationModel
      .findOne({
        teamId,
        email: email.toLowerCase(),
        status: InvitationStatus.PENDING,
      })
      .exec();
  }

  async getTeamInvitations(
    teamId: string,
    status?: InvitationStatus,
  ): Promise<TeamInvitationDocument[]> {
    const query: Record<string, any> = { teamId };
    if (status) {
      query.status = status;
    }

    return this.invitationModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
  }

  async getInvitationsByEmail(email: string): Promise<TeamInvitationDocument[]> {
    return this.invitationModel
      .find({ email: email.toLowerCase() })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPendingInvitationsByEmail(email: string): Promise<TeamInvitationDocument[]> {
    return this.invitationModel
      .find({
        email: email.toLowerCase(),
        status: InvitationStatus.PENDING,
        expiresAt: { $gte: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async acceptInvitation(token: string): Promise<TeamInvitationDocument | null> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) return null;

    if (invitation.status !== InvitationStatus.PENDING) {
      return invitation;
    }

    if (invitation.expiresAt < new Date()) {
      await this.updateStatus(invitation._id.toString(), InvitationStatus.EXPIRED);
      return this.invitationModel.findById(invitation._id).exec();
    }

    return this.invitationModel
      .findByIdAndUpdate(
        invitation._id,
        {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async declineInvitation(token: string): Promise<TeamInvitationDocument | null> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) return null;

    if (invitation.status !== InvitationStatus.PENDING) {
      return invitation;
    }

    return this.invitationModel
      .findByIdAndUpdate(
        invitation._id,
        {
          status: InvitationStatus.DECLINED,
          declinedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async revokeInvitation(invitationId: string): Promise<boolean> {
    const invitation = await this.getInvitation(invitationId);
    if (!invitation) return false;

    if (invitation.status !== InvitationStatus.PENDING) {
      return false;
    }

    await this.invitationModel
      .findByIdAndUpdate(invitationId, { status: InvitationStatus.REVOKED })
      .exec();

    return true;
  }

  async resendInvitation(invitationId: string): Promise<TeamInvitationDocument | null> {
    const invitation = await this.getInvitation(invitationId);
    if (!invitation) return null;

    if (
      invitation.status !== InvitationStatus.PENDING &&
      invitation.status !== InvitationStatus.EXPIRED
    ) {
      return null;
    }

    return this.invitationModel
      .findByIdAndUpdate(
        invitationId,
        {
          token: this.generateToken(),
          expiresAt: this.getExpiryDate(),
          status: InvitationStatus.PENDING,
        },
        { new: true },
      )
      .exec();
  }

  async updateStatus(
    invitationId: string,
    status: InvitationStatus,
  ): Promise<boolean> {
    const result = await this.invitationModel
      .findByIdAndUpdate(invitationId, { status })
      .exec();
    return result !== null;
  }

  async deleteInvitation(invitationId: string): Promise<boolean> {
    const result = await this.invitationModel.findByIdAndDelete(invitationId).exec();
    return result !== null;
  }

  async cleanupExpiredInvitations(): Promise<number> {
    const result = await this.invitationModel
      .updateMany(
        {
          status: InvitationStatus.PENDING,
          expiresAt: { $lt: new Date() },
        },
        { status: InvitationStatus.EXPIRED },
      )
      .exec();

    return result.modifiedCount;
  }

  async countPendingInvitations(teamId: string): Promise<number> {
    return this.invitationModel
      .countDocuments({
        teamId,
        status: InvitationStatus.PENDING,
        expiresAt: { $gte: new Date() },
      })
      .exec();
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
    const pipeline = [
      { $match: { teamId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await this.invitationModel.aggregate(pipeline).exec();

    const stats = {
      pending: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
      revoked: 0,
    };

    for (const result of results) {
      const status = result._id as InvitationStatus;
      if (status in stats) {
        stats[status] = result.count;
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
    await this.invitationModel.deleteMany({ teamId }).exec();
  }
}
