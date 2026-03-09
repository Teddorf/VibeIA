import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContextEntryDocument = ContextEntryEntity & Document;

@Schema({ timestamps: true, collection: 'context_entries' })
export class ContextEntryEntity {
  @Prop({ required: true })
  projectId: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true, default: 'global' })
  scope: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, required: true })
  content: unknown;

  @Prop({ default: 0 })
  tokenCount: number;

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  supersededBy?: string;

  @Prop()
  pipelineId?: string;
}

export const ContextEntrySchema =
  SchemaFactory.createForClass(ContextEntryEntity);
