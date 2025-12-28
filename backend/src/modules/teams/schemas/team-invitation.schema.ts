import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TeamRole } from './team-member.schema';

export type TeamInvitationDocument = TeamInvitation & Document;

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Schema({ timestamps: true })
export class TeamInvitation {
  @Prop({ required: true })
  teamId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, type: String, enum: TeamRole, default: TeamRole.MEMBER })
  role: TeamRole;

  @Prop({ required: true })
  invitedBy: string;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true, enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  acceptedAt?: Date;

  @Prop()
  declinedAt?: Date;

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const TeamInvitationSchema = SchemaFactory.createForClass(TeamInvitation);

// Indexes
TeamInvitationSchema.index({ teamId: 1 });
TeamInvitationSchema.index({ email: 1 });
TeamInvitationSchema.index({ token: 1 }, { unique: true });
TeamInvitationSchema.index({ status: 1 });
TeamInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
