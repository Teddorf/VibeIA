import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SetupStateDocument = SetupState & Document;

export enum SetupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  ROLLED_BACK = 'rolled_back',
}

@Schema({ timestamps: true })
export class SetupState {
  @Prop({ required: true, unique: true })
  setupId: string;

  @Prop()
  userId?: string;

  @Prop()
  projectId?: string;

  @Prop()
  projectName?: string;

  @Prop({ required: true, enum: SetupStatus, default: SetupStatus.PENDING })
  status: SetupStatus;

  @Prop({ default: 0 })
  progress: number; // 0-100

  @Prop({ type: Array, default: [] })
  tasks: {
    id: string;
    name: string;
    provider: string;
    status: TaskStatus;
    estimatedDuration?: number;
    steps: string[];
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
    result?: Record<string, any>;
  }[];

  @Prop({ default: 0 })
  currentTaskIndex: number;

  @Prop(raw({
    frontend: { type: String },
    backend: { type: String },
    database: { type: String },
    dashboards: {
      type: Object,
      default: {}
    }
  }))
  urls: {
    frontend?: string;
    backend?: string;
    database?: string;
    dashboards: {
      neon?: string;
      vercel?: string;
      railway?: string;
    };
  };

  @Prop({ type: Object, default: {} })
  credentials: {
    databaseUrl?: string;
    redisUrl?: string;
    [key: string]: string | undefined;
  };

  @Prop({ type: Object })
  config?: Record<string, any>;

  @Prop()
  generatedEnvFile?: string;

  @Prop({ type: [String], default: [] })
  nextSteps: string[];

  @Prop()
  errorMessage?: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  // Timestamps added by @Schema({ timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const SetupStateSchema = SchemaFactory.createForClass(SetupState);

// Indexes
SetupStateSchema.index({ setupId: 1 }, { unique: true });
SetupStateSchema.index({ userId: 1 });
SetupStateSchema.index({ projectId: 1 });
SetupStateSchema.index({ status: 1 });
SetupStateSchema.index({ createdAt: -1 });
