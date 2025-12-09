import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TeamDocument = Team & Document;

@Schema({ timestamps: true })
export class TeamSettings {
  @Prop({ default: true })
  allowMemberInvites: boolean;

  @Prop({ default: true })
  requireApprovalForJoin: boolean;

  @Prop({ default: 'member' })
  defaultRole: string;

  @Prop({ default: 10 })
  maxMembers: number;

  @Prop({ default: true })
  allowGitConnections: boolean;
}

@Schema({ timestamps: true })
export class Team {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  ownerId: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ type: TeamSettings, default: () => ({}) })
  settings: TeamSettings;

  @Prop({ type: [String], default: [] })
  gitConnections: string[];

  @Prop({ default: 1 })
  memberCount: number;

  @Prop({ default: 0 })
  projectCount: number;

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const TeamSchema = SchemaFactory.createForClass(Team);

// Indexes
TeamSchema.index({ ownerId: 1 });
TeamSchema.index({ slug: 1 }, { unique: true });
TeamSchema.index({ createdAt: -1 });
