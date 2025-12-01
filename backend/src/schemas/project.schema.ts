import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  ownerId: string;

  @Prop()
  repositoryUrl?: string;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
