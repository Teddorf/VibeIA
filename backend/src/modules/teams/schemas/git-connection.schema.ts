import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GitConnectionDocument = GitConnection & Document;

export enum GitProvider {
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
}

export enum ConnectionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  ERROR = 'error',
}

@Schema({ timestamps: true })
export class GitConnection {
  @Prop({ required: true })
  teamId: string;

  @Prop({ required: true, enum: GitProvider })
  provider: GitProvider;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  accessToken: string; // Encrypted with AES-256-GCM

  @Prop()
  refreshToken?: string; // Encrypted with AES-256-GCM

  @Prop()
  expiresAt?: Date;

  @Prop()
  organizationId?: string;

  @Prop()
  organizationName?: string;

  @Prop()
  webhookSecret?: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ type: [String], default: [] })
  scopes: string[];

  @Prop()
  connectedBy?: string;

  @Prop()
  lastUsedAt?: Date;

  @Prop()
  lastValidatedAt?: Date;

  @Prop({ enum: ConnectionStatus, default: ConnectionStatus.ACTIVE })
  status?: ConnectionStatus;

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const GitConnectionSchema = SchemaFactory.createForClass(GitConnection);

// Indexes
GitConnectionSchema.index({ teamId: 1 });
GitConnectionSchema.index({ teamId: 1, provider: 1 });
GitConnectionSchema.index({ teamId: 1, isDefault: 1 });
GitConnectionSchema.index({ status: 1 });
