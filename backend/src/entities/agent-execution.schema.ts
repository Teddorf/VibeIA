import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class ExecutionMetricsEmbed {
  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ default: 0 })
  durationMs: number;

  @Prop({ default: 0 })
  tokensUsed: number;

  @Prop({ default: 0 })
  costUSD: number;

  @Prop({ default: 0 })
  llmCalls: number;

  @Prop({ default: 0 })
  retries: number;
}

export type AgentExecutionDocument = AgentExecution & Document;

@Schema({ timestamps: true, collection: 'agent_executions' })
export class AgentExecution {
  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true })
  pipelineId: string;

  @Prop({ required: true })
  taskId: string;

  @Prop({ required: true })
  agentId: string;

  @Prop()
  workerId?: string;

  @Prop({ default: 'pending' })
  status: string;

  @Prop({ type: Object })
  input?: Record<string, unknown>;

  @Prop({ type: Object })
  output?: Record<string, unknown>;

  @Prop({ type: ExecutionMetricsEmbed })
  metrics?: ExecutionMetricsEmbed;

  @Prop({ type: Object })
  errorDetails?: Record<string, unknown>;

  @Prop({ required: true })
  traceId: string;
}

export const AgentExecutionSchema =
  SchemaFactory.createForClass(AgentExecution);
