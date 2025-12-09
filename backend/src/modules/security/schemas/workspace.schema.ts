import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkspaceDocument = Workspace & Document;

export enum WorkspaceStatus {
  CREATING = 'creating',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  EXPIRED = 'expired',
  ERROR = 'error',
}

export enum WorkspaceSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

@Schema()
export class WorkspaceResources {
  @Prop({ default: 1 })
  cpu: number; // vCPUs

  @Prop({ default: 2048 })
  memory: number; // MB

  @Prop({ default: 10 })
  disk: number; // GB
}

@Schema({ timestamps: true })
export class Workspace {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true, enum: WorkspaceStatus, default: WorkspaceStatus.CREATING })
  status: WorkspaceStatus;

  @Prop({ required: true, enum: WorkspaceSize, default: WorkspaceSize.SMALL })
  size: WorkspaceSize;

  @Prop({ type: WorkspaceResources, default: () => ({}) })
  resources: WorkspaceResources;

  @Prop()
  containerId?: string;

  @Prop()
  containerImage?: string;

  @Prop()
  accessUrl?: string;

  @Prop()
  sshKey?: string;

  @Prop({ type: Object })
  envVars?: Record<string, string>;

  @Prop({ type: [Number], default: [] })
  exposedPorts: number[];

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  lastActivityAt?: Date;

  @Prop()
  startedAt?: Date;

  @Prop()
  stoppedAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);

// Indexes
WorkspaceSchema.index({ userId: 1 });
WorkspaceSchema.index({ projectId: 1 });
WorkspaceSchema.index({ status: 1 });
WorkspaceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup
