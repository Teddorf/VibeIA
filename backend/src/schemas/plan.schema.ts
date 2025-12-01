import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlanDocument = Plan & Document;

export type Task = {
  id: string;
  name: string;
  description: string;
  estimatedTime: number;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
};

export type Phase = {
  name: string;
  tasks: Task[];
  estimatedTime: number;
  status: 'pending' | 'in_progress' | 'completed';
};

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ type: Object, required: true })
  wizardData: {
    stage1: { projectName: string; description: string };
    stage2: Record\u003cstring, string\u003e;
    stage3: { selectedArchetypes: string[]; plan: any };
  };

  @Prop({ type: Array, required: true })
  phases: Phase[];

  @Prop({ required: true })
  estimatedTime: number;

  @Prop({ default: 'pending' })
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  @Prop({ type: Object })
  metadata?: Record\u003cstring, any\u003e;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
