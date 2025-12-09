import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CredentialDocument = Credential & Document;

export enum CredentialProvider {
  NEON = 'neon',
  VERCEL = 'vercel',
  RAILWAY = 'railway',
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
  AWS = 'aws',
  GCP = 'gcp',
  AZURE = 'azure',
  STRIPE = 'stripe',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

export enum CredentialStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  INVALID = 'invalid',
}

@Schema({ timestamps: true })
export class Credential {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: CredentialProvider })
  provider: CredentialProvider;

  @Prop({ required: true })
  name: string; // User-friendly name

  @Prop({ required: true })
  encryptedToken: string; // Encrypted token/API key

  @Prop()
  encryptedRefreshToken?: string;

  @Prop()
  tokenExpiresAt?: Date;

  @Prop({ required: true, enum: CredentialStatus, default: CredentialStatus.ACTIVE })
  status: CredentialStatus;

  @Prop({ type: [String], default: [] })
  scopes: string[];

  @Prop()
  accountId?: string;

  @Prop()
  accountName?: string;

  @Prop()
  lastUsedAt?: Date;

  @Prop()
  lastValidatedAt?: Date;

  @Prop({ default: 90 })
  rotationDays: number; // Days before suggesting rotation

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const CredentialSchema = SchemaFactory.createForClass(Credential);

// Indexes
CredentialSchema.index({ userId: 1 });
CredentialSchema.index({ userId: 1, provider: 1 });
CredentialSchema.index({ status: 1 });
CredentialSchema.index({ tokenExpiresAt: 1 });
