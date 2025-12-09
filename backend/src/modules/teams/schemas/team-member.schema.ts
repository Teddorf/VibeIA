import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TeamMemberDocument = TeamMember & Document;

export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

@Schema({ timestamps: true })
export class TeamMember {
  @Prop({ required: true })
  teamId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: TeamRole, default: TeamRole.MEMBER })
  role: TeamRole;

  @Prop()
  invitedBy?: string;

  @Prop({ default: Date.now })
  joinedAt: Date;

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const TeamMemberSchema = SchemaFactory.createForClass(TeamMember);

// Indexes
TeamMemberSchema.index({ teamId: 1 });
TeamMemberSchema.index({ userId: 1 });
TeamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });
