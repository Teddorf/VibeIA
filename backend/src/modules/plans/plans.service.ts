import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from '../../schemas/plan.schema';
import { LlmService } from '../llm/llm.service';
import { UsersService } from '../users/users.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UserLLMConfig } from '../llm/interfaces/llm-provider.interface';

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    private llmService: LlmService,
    private usersService: UsersService,
  ) { }

  /**
   * Get user's LLM configuration (API keys and preferences)
   */
  private async getUserLLMConfig(userId: string): Promise<UserLLMConfig> {
    // Check if user has LLM configured
    const hasConfigured = await this.usersService.hasLLMConfigured(userId);
    if (!hasConfigured) {
      throw new BadRequestException(
        'No tienes ningún proveedor de IA configurado. Ve a Ajustes para configurar tu API key.',
      );
    }

    // Get user's API keys and preferences
    const apiKeys = await this.usersService.getActiveLLMApiKeys(userId);
    const preferences = await this.usersService.getLLMPreferences(userId);

    return {
      apiKeys,
      preferences,
    };
  }

  async generatePlan(createPlanDto: CreatePlanDto): Promise<Plan> {
    console.log('Generating plan with LLM...');

    // Get user's LLM configuration
    const userLLMConfig = await this.getUserLLMConfig(createPlanDto.userId);

    // Generate plan using LLM with user's API keys
    const llmResponse = await this.llmService.generatePlan(createPlanDto.wizardData, userLLMConfig);

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
