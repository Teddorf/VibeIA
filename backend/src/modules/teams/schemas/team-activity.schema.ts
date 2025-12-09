import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TeamActivityDocument = TeamActivity & Document;

export type TeamActivityAction =
  | 'team.created'
  | 'team.updated'
  | 'team.deleted'
  | 'member.joined'
  | 'member.left'
  | 'member.removed'
  | 'member.invited'
  | 'member.role_changed'
  | 'git.connected'
  | 'git.disconnected'
  | 'project.created'
  | 'project.archived';

@Schema({ timestamps: true })
export class TeamActivity {
  @Prop({ required: true })
  teamId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  targetType: string; // 'team', 'user', 'invitation', 'git_connection', 'project'

  @Prop({ required: true })
  targetId: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const TeamActivitySchema = SchemaFactory.createForClass(TeamActivity);

// Indexes
TeamActivitySchema.index({ teamId: 1, createdAt: -1 });
TeamActivitySchema.index({ userId: 1 });
TeamActivitySchema.index({ action: 1 });
