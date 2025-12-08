import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from '../../schemas/plan.schema';
import { LlmService } from '../llm/llm.service';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    private llmService: LlmService,
  ) { }

  async generatePlan(createPlanDto: CreatePlanDto): Promise<Plan> {
    console.log('Generating plan with LLM...');

    // Generate plan using LLM
    const llmResponse = await this.llmService.generatePlan(createPlanDto.wizardData);

    // Create plan document
    const plan = new this.planModel({
      projectId: createPlanDto.projectId,
      userId: createPlanDto.userId,
      wizardData: createPlanDto.wizardData,
      phases: llmResponse.plan.phases,
      estimatedTime: llmResponse.plan.estimatedTime,
      status: 'pending',
      metadata: {
        llmProvider: llmResponse.provider,
        tokensUsed: llmResponse.tokensUsed,
        cost: llmResponse.cost,
        generatedAt: new Date(),
      },
    });

    return plan.save();
  }

  async findAll(userId: string, projectId?: string): Promise<Plan[]> {
    const query: any = { userId };
    if (projectId) {
      query.projectId = projectId;
    }
    return this.planModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Plan | null> {
    return this.planModel.findById(id).exec();
  }

  async updateStatus(id: string, status: string): Promise<Plan | null> {
    return this.planModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }

  async updateTaskStatus(planId: string, phaseIndex: number, taskId: string, status: string): Promise<Plan | null> {
    const plan = await this.planModel.findById(planId);
    if (!plan) return null;

    const phase = plan.phases[phaseIndex];
    const taskIndex = phase.tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) return null;

    phase.tasks[taskIndex].status = status as any;

    // Check if phase is complete
    const allTasksComplete = phase.tasks.every((t) => t.status === 'completed');
    if (allTasksComplete) {
      phase.status = 'completed';
    } else if (phase.tasks.some((t) => t.status === 'in_progress' || t.status === 'completed')) {
      phase.status = 'in_progress';
    }

    // Update plan with modified phases
    return this.planModel
      .findByIdAndUpdate(planId, { phases: plan.phases }, { new: true })
      .exec();
  }
}