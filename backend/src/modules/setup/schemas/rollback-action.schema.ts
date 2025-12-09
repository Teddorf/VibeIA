import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RollbackActionDocument = RollbackAction & Document;

export enum RollbackStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Schema({ timestamps: true })
export class RollbackAction {
  @Prop({ required: true })
  setupId: string;

  @Prop({ required: true })
  taskId: string;

  @Prop({ required: true })
  provider: string; // 'neon', 'vercel', 'railway'

  @Prop({ required: true })
  action: string; // 'delete_project', 'delete_database', 'delete_deployment', etc.

  @Prop({ required: true })
  resourceId: string;

  @Prop()
  resourceName?: string;

  @Prop({ type: Object })
  params?: Record<string, any>;

  @Prop({ required: true, enum: RollbackStatus, default: RollbackStatus.PENDING })
  status: RollbackStatus;

  @Prop()
  error?: string;

  @Prop()
  executedAt?: Date;

  @Prop({ default: 0 })
  order: number; // Execution order (rollback in reverse)

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const RollbackActionSchema = SchemaFactory.createForClass(RollbackAction);

// Indexes
RollbackActionSchema.index({ setupId: 1 });
RollbackActionSchema.index({ setupId: 1, order: -1 }); // For reverse execution
RollbackActionSchema.index({ status: 1 });
