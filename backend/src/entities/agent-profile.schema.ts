import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AgentProfileDocument = AgentProfileEntity & Document;

@Schema({ timestamps: true, collection: 'agent_profiles' })
export class AgentProfileEntity {
  @Prop({ required: true, unique: true })
  agentId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  role: string;

  @Prop({ type: [String], default: [] })
  capabilities: string[];

  @Prop({ default: 'balanced' })
  defaultModelTier: string;

  @Prop({ default: 2 })
  maxConcurrentTasks: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ type: Object })
  configOverrides?: Record<string, unknown>;
}

export const AgentProfileSchema =
  SchemaFactory.createForClass(AgentProfileEntity);
