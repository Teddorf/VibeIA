import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from '../../schemas/plan.schema';
import { LlmService } from '../llm/llm.service';
import { UsersService } from '../users/users.service';
import { ProjectsService } from '../projects/projects.service';
import { CreatePlanDto, PlanType } from './dto/create-plan.dto';
import { UserLLMConfig, ImportedProjectWizardData } from '../llm/interfaces/llm-provider.interface';

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    private llmService: LlmService,
    private usersService: UsersService,
    @Inject(forwardRef(() => ProjectsService))
    private projectsService: ProjectsService,
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

    // Check if this is for an imported project and enrich wizard data
    const enrichedWizardData = await this.enrichWizardDataForImportedProject(
      createPlanDto.projectId,
      createPlanDto.userId,
      createPlanDto.wizardData,
      createPlanDto.planType,
    );

    // Generate plan using LLM with user's API keys
    const llmResponse = await this.llmService.generatePlan(enrichedWizardData, userLLMConfig);

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
        planType: createPlanDto.planType || 'new',
        isImportedProject: !!enrichedWizardData.existingCodebase,
      },
    });

    return plan.save();
  }

  /**
   * Enrich wizard data with codebase analysis for imported projects
   */
  private async enrichWizardDataForImportedProject(
    projectId: string,
    userId: string,
    wizardData: CreatePlanDto['wizardData'],
    planType?: PlanType,
  ): Promise<ImportedProjectWizardData> {
    // Check if project exists and is imported
    const project = await this.projectsService.findOne(projectId, userId);

    if (!project || !project.metadata?.imported) {
      // Not an imported project, return original wizard data
      return {
        stage1: wizardData.stage1,
        stage2: wizardData.stage2,
        stage3: wizardData.stage3,
        planType: planType || 'new',
      };
    }

    // This is an imported project - enrich with codebase analysis
    console.log(`Enriching wizard data for imported project: ${project.name}`);

    return {
      stage1: wizardData.stage1,
      stage2: wizardData.stage2,
      stage3: wizardData.stage3,
      existingCodebase: project.metadata.analysis,
      importContext: wizardData.importContext,
      planType: planType || 'feature', // Default to 'feature' for imported projects
    };
  }

  async findAll(userId: string, projectId?: string): Promise<Plan[]> {
    const query: any = { userId };
    if (projectId) {
      query.projectId = projectId;
    }
    return this.planModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, userId?: string): Promise<Plan | null> {
    const plan = await this.planModel.findById(id).exec();
    if (plan && userId && plan.userId !== userId) {
      throw new BadRequestException('You do not have access to this plan'); // Or ForbiddenException if imported
    }
    return plan;
  }

  async updateStatus(id: string, status: string, userId?: string): Promise<Plan | null> {
    const plan = await this.findOne(id, userId);
    if (!plan) return null;

    return this.planModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }

  async updateTaskStatus(planId: string, phaseIndex: number, taskId: string, status: string, userId?: string): Promise<Plan | null> {
    // If userId provided, findOne will check ownership
    const plan = await this.findOne(planId, userId);
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
