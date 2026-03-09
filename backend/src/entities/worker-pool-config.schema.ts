import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkerPoolConfigDocument = WorkerPoolConfig & Document;

@Schema({ timestamps: true, collection: 'worker_pool_configs' })
export class WorkerPoolConfig {
  @Prop({ required: true, unique: true })
  agentId: string;

  @Prop({ default: 2 })
  maxWorkers: number;

  @Prop({ default: false })
  paused: boolean;

  @Prop({ default: 0 })
  currentDepth: number;

  @Prop({ default: 0 })
  activeCount: number;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const WorkerPoolConfigSchema =
  SchemaFactory.createForClass(WorkerPoolConfig);
