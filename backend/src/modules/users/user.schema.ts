import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

// LLM Provider configuration
export interface LLMProviderConfig {
  apiKey: string; // Encrypted
  isActive: boolean;
  addedAt: Date;
}

export interface LLMPreferences {
  primaryProvider?: string;
  fallbackEnabled: boolean;
  fallbackOrder: string[];
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: 'user' })
  role: 'user' | 'admin';

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  refreshToken?: string;

  // Password reset fields
  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  // GitHub OAuth fields
  @Prop({ sparse: true })
  githubId?: string;

  @Prop()
  githubAccessToken?: string;

  @Prop()
  githubUsername?: string;

  @Prop()
  githubConnectedAt?: Date;

  // Google OAuth fields
  @Prop({ sparse: true })
  googleId?: string;

  @Prop()
  googleAccessToken?: string;

  @Prop()
  googleEmail?: string;

  @Prop()
  googleName?: string;

  @Prop()
  googleConnectedAt?: Date;

  // GitLab OAuth fields
  @Prop({ sparse: true })
  gitlabId?: string;

  @Prop()
  gitlabAccessToken?: string;

  @Prop()
  gitlabUsername?: string;

  @Prop()
  gitlabEmail?: string;

  @Prop()
  gitlabConnectedAt?: Date;

  // LLM API Keys - stored encrypted
  @Prop({ type: Object, default: {} })
  llmApiKeys: Record<string, LLMProviderConfig>;

  // LLM Preferences
  @Prop({
    type: Object,
    default: {
      primaryProvider: null,
      fallbackEnabled: true,
      fallbackOrder: ['anthropic', 'gemini', 'openai'],
    },
  })
  llmPreferences: LLMPreferences;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add index for email lookups
UserSchema.index({ email: 1 });
