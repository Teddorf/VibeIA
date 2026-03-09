import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PlanStatus, NodeStatus, TaskType } from '../agents/protocol';

// ─── Embedded Sub-documents ─────────────────────────────────────────────────

@Schema({ _id: false })
export class TaskDefinitionEmbed {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  dependencies: string[];

  @Prop({ default: 1 })
  priority: number;

  @Prop({ default: 60000 })
  timeoutMs: number;
}

@Schema({ _id: false })
export class DAGNodeEmbed {
  @Prop({ required: true })
  nodeId: string;

  @Prop({ required: true })
  agentId: string;

  @Prop({ type: TaskDefinitionEmbed, required: true })
  taskDefinition: TaskDefinitionEmbed;

  @Prop({ type: [String], default: [] })
  dependencies: string[];

  @Prop({ default: 'pending' })
  status: string;

  @Prop({ type: Object })
  output?: Record<string, unknown>;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;
}

@Schema({ _id: false })
export class ParsedIntentEmbed {
  @Prop({ required: true })
  intent: string;

  @Prop({ required: true })
  taskType: string;

  @Prop({ required: true })
  complexity: string;

  @Prop({ type: [String], default: [] })
  requiredAgents: string[];
}

// ─── Main Schema ────────────────────────────────────────────────────────────

export type ExecutionPlanDocument = ExecutionPlan & Document;

@Schema({ timestamps: true, collection: 'execution_plans' })
export class ExecutionPlan {
  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true })
  intent: string;

  @Prop({ type: ParsedIntentEmbed })
  parsedIntent?: ParsedIntentEmbed;

  @Prop({ type: [DAGNodeEmbed], default: [] })
  dag: DAGNodeEmbed[];

  @Prop({ default: 0 })
  estimatedCost: number;

  @Prop({ default: 0 })
  estimatedDuration: number;

  @Prop({ default: 'draft' })
  status: string;

  @Prop()
  approvedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ type: [String], default: [] })
  errorLog: string[];

  @Prop()
  userId?: string;

  @Prop()
  traceId?: string;
}

export const ExecutionPlanSchema = SchemaFactory.createForClass(ExecutionPlan);
