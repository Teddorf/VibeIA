import { Injectable, Optional, BadRequestException } from '@nestjs/common';
import { PlansService } from '../plans/plans.service';
import { ProjectsService } from '../projects/projects.service';
import { GitService } from '../git/git.service';
import { LlmService } from '../llm/llm.service';
import { UsersService } from '../users/users.service';
import { QualityGatesService } from '../quality-gates/quality-gates.service';
import { ManualTasksService } from '../manual-tasks/manual-tasks.service';
import { EventsGateway } from '../events/events.gateway';
import { UserLLMConfig } from '../llm/interfaces/llm-provider.interface';

export interface ExecutionState {
  planId: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  currentPhaseIndex: number;
  currentTaskIndex: number;
  pauseReason?: string;
  manualTaskPending?: boolean;
}

@Injectable()
export class ExecutionService {
  private executionStates: Map<string, ExecutionState> = new Map();

  constructor(
    private plansService: PlansService,
    private projectsService: ProjectsService,
    private gitService: GitService,
    private llmService: LlmService,
    private usersService: UsersService,
    private qualityGatesService: QualityGatesService,
    private manualTasksService: ManualTasksService,
    @Optional() private eventsGateway?: EventsGateway,
  ) { }

  /**
   * Get user's LLM configuration for code generation
   */
  private async getUserLLMConfig(userId: string): Promise<UserLLMConfig> {
    const hasConfigured = await this.usersService.hasLLMConfigured(userId);
    if (!hasConfigured) {
      throw new BadRequestException(
        'No tienes ningún proveedor de IA configurado. Ve a Ajustes para configurar tu API key.',
      );
    }

    const apiKeys = await this.usersService.getActiveLLMApiKeys(userId);
    const preferences = await this.usersService.getLLMPreferences(userId);

    return { apiKeys, preferences };
  }

  async executePlan(planId: string, userId: string) {
    const plan = await this.plansService.findOne(planId, userId);
    if (!plan) throw new Error('Plan not found');

    const project = await this.projectsService.findOne(plan.projectId, plan.userId);
    if (!project) throw new Error('Project not found');

    console.log(`Starting execution for plan: ${planId} (Project: ${project.name})`);
    this.emitLog(planId, `Starting execution for project: ${project.name}`);

    // Get user's LLM configuration
    const userLLMConfig = await this.getUserLLMConfig(plan.userId);

    // Initialize execution state
    this.executionStates.set(planId, {
      planId,
      status: 'running',
      currentPhaseIndex: 0,
      currentTaskIndex: 0,
    });

    await this.plansService.updateStatus(planId, 'in_progress', userId);
    this.emitStatusUpdate(planId, 'running', 0);

    const totalTasks = plan.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
    let completedTasks = 0;
    let failedTasks = 0;

    // Iterate phases
    for (let i = 0; i < plan.phases.length; i++) {
      const state = this.executionStates.get(planId);
      if (state?.status === 'paused') {
        console.log(`Execution paused at phase ${i}`);
        this.emitLog(planId, `Execution paused at phase ${i + 1}`, 'warn');
        return;
      }

      const phase = plan.phases[i];
      console.log(`Executing Phase: ${phase.name}`);
      this.emitLog(planId, `Starting phase: ${phase.name}`);

      // Update state
      this.updateExecutionState(planId, { currentPhaseIndex: i, currentTaskIndex: 0 });

      // Iterate tasks
      for (let j = 0; j < phase.tasks.length; j++) {
        const currentState = this.executionStates.get(planId);
        if (currentState?.status === 'paused') {
          console.log(`Execution paused at task ${j}`);
          return;
        }

        const task = phase.tasks[j];
        this.updateExecutionState(planId, { currentTaskIndex: j });

        if (task.status === 'pending' || task.status === 'paused') {
          const result = await this.executeTask(planId, i, task, project, plan.wizardData, userLLMConfig, userId);
          if (!result.shouldContinue) {
            return; // Execution paused for manual task or error
          }
          if (result.completed) {
            completedTasks++;
          } else if (result.failed) {
            failedTasks++;
          }

          const progress = Math.round(((completedTasks + failedTasks) / totalTasks) * 100);
          this.emitStatusUpdate(planId, 'running', progress);
        }
      }

      // Emit phase completed
      this.eventsGateway?.emitPhaseCompleted(planId, i, phase.name);
    }

    await this.plansService.updateStatus(planId, 'completed', userId);
    this.updateExecutionState(planId, { status: 'completed' });

    // Emit execution completed
    this.eventsGateway?.emitExecutionCompleted(planId, {
      totalTasks,
      completedTasks,
      failedTasks,
    });

    console.log(`Plan execution completed: ${planId}`);
    this.emitLog(planId, `Execution completed! ${completedTasks}/${totalTasks} tasks successful`);
  }

  private async executeTask(
    planId: string,
    phaseIndex: number,
    task: any,
    project: any,
    wizardData: any,
    userLLMConfig: UserLLMConfig,
    userId: string,
  ): Promise<{ shouldContinue: boolean; completed?: boolean; failed?: boolean }> {
    console.log(`  > Executing Task: ${task.name}`);

    // Check for manual task
    const manualTask = this.manualTasksService.detectManualTasks({
      name: task.name,
      description: task.description || '',
      type: task.type,
    });

    if (manualTask) {
      console.log(`  > Manual task detected: ${manualTask.title}`);
      this.emitLog(planId, `Manual task required: ${manualTask.title}`, 'warn');

      await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'paused', userId);
      this.updateExecutionState(planId, {
        status: 'paused',
        pauseReason: `Manual task required: ${manualTask.title}`,
        manualTaskPending: true,
      });
      this.emitStatusUpdate(planId, 'paused', 0);
      return { shouldContinue: false };
    }

    // Update status to in_progress
    await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'in_progress', userId);
    this.eventsGateway?.emitTaskStarted(planId, phaseIndex, task.id, task.name);
    this.emitLog(planId, `Starting task: ${task.name}`);

    try {
      // Generate Code
      const context = {
        projectName: project.name,
        technologies: wizardData.stage3?.technologies || [],
        architecture: wizardData.stage3?.selectedArchetypes || [],
      };

      const generated = await this.llmService.generateCode(task, context, userLLMConfig);

      if (!generated.files || generated.files.length === 0) {
        console.warn(`    No files generated for task: ${task.name}`);
        this.emitLog(planId, `No files generated for task: ${task.name}`, 'warn');
        await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'completed', userId);
        this.eventsGateway?.emitTaskCompleted(planId, phaseIndex, task.id, task.name, 0);
        return { shouldContinue: true, completed: true };
      }

      // Run Quality Gates
      console.log(`    Running quality gates on ${generated.files.length} files...`);
      this.emitLog(planId, `Running quality gates on ${generated.files.length} files...`);

      const qualityResult = await this.qualityGatesService.runAllChecks(generated.files, {
        skipTests: true,
      });

      console.log(this.qualityGatesService.generateReport(qualityResult));

      if (!qualityResult.passed) {
        console.error(`    Quality gate failed for task: ${task.name}`);
        console.log(`    Blockers: ${qualityResult.blockers.map(b => b.message).join(', ')}`);

        const errorMsg = `Quality gate failed: ${qualityResult.blockers.map(b => b.message).join(', ')}`;
        this.emitLog(planId, errorMsg, 'error');

        await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'failed', userId);
        this.eventsGateway?.emitTaskFailed(planId, phaseIndex, task.id, task.name, errorMsg);
        return { shouldContinue: true, failed: true };
      }

      // Commit to Git
      console.log(`    Committing ${generated.files.length} files...`);
      this.emitLog(planId, `Committing ${generated.files.length} files to git...`);

      try {
        await this.gitService.createCommit(
          project.ownerId,
          project.name,
          'main',
          generated.files,
          `feat: ${task.name}\n\nQuality Score: ${qualityResult.overallScore.toFixed(0)}/100`
        );
      } catch (gitError) {
        console.warn(`    Git commit failed (may be expected in dev):`, gitError);
        this.emitLog(planId, 'Git commit skipped (no repository configured)', 'warn');
      }

      // Update status to completed
      await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'completed', userId);
      this.eventsGateway?.emitTaskCompleted(planId, phaseIndex, task.id, task.name, generated.files.length);

      console.log(`    Task completed: ${task.name}`);
      this.emitLog(planId, `Task completed: ${task.name} (${generated.files.length} files, quality: ${qualityResult.overallScore.toFixed(0)}/100)`);

      return { shouldContinue: true, completed: true };

    } catch (error) {
      console.error(`    Task failed: ${task.name}`, error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      this.emitLog(planId, `Task failed: ${task.name} - ${errorMsg}`, 'error');
      this.eventsGateway?.emitTaskFailed(planId, phaseIndex, task.id, task.name, errorMsg);

      await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'failed', userId);
      return { shouldContinue: true, failed: true };
    }
  }

  async getExecutionStatus(planId: string, userId: string) {
    const plan = await this.plansService.findOne(planId, userId);
    if (!plan) throw new Error('Plan not found');

    const state = this.executionStates.get(planId);

    return {
      ...plan,
      executionState: state || {
        planId,
        status: plan.status,
        currentPhaseIndex: 0,
        currentTaskIndex: 0,
      },
    };
  }

  async pauseExecution(planId: string, userId: string) {
    // Validate access first
    await this.plansService.findOne(planId, userId);

    const state = this.executionStates.get(planId);
    if (state) {
      state.status = 'paused';
      state.pauseReason = 'User requested pause';
    }
    await this.plansService.updateStatus(planId, 'paused', userId);
    this.emitStatusUpdate(planId, 'paused', 0);
    this.emitLog(planId, 'Execution paused by user');
    return { message: 'Execution paused', planId };
  }

  async resumeExecution(planId: string, userId: string) {
    const state = this.executionStates.get(planId);
    if (!state) throw new Error('No execution state found');

    state.status = 'running';
    state.pauseReason = undefined;
    state.manualTaskPending = false;

    const plan = await this.plansService.findOne(planId, userId);
    if (!plan) throw new Error('Plan not found');

    const project = await this.projectsService.findOne(plan.projectId, plan.userId);
    if (!project) throw new Error('Project not found');

    // Get user's LLM configuration
    const userLLMConfig = await this.getUserLLMConfig(plan.userId);

    await this.plansService.updateStatus(planId, 'in_progress', userId);
    this.emitStatusUpdate(planId, 'running', 0);
    this.emitLog(planId, 'Execution resumed');

    // Resume from current position
    for (let i = state.currentPhaseIndex; i < plan.phases.length; i++) {
      const phase = plan.phases[i];
      const startTask = i === state.currentPhaseIndex ? state.currentTaskIndex : 0;

      for (let j = startTask; j < phase.tasks.length; j++) {
        const currentState = this.executionStates.get(planId);
        if (currentState?.status === 'paused') {
          return;
        }

        const task = phase.tasks[j];
        this.updateExecutionState(planId, { currentPhaseIndex: i, currentTaskIndex: j });

        if (task.status === 'pending' || task.status === 'paused') {
          const result = await this.executeTask(planId, i, task, project, plan.wizardData, userLLMConfig, userId);
          if (!result.shouldContinue) {
            return;
          }
        }
      }
    }

    await this.plansService.updateStatus(planId, 'completed', userId);
    this.updateExecutionState(planId, { status: 'completed' });
    this.emitLog(planId, 'Execution completed');
  }

  private updateExecutionState(planId: string, updates: Partial<ExecutionState>) {
    const state = this.executionStates.get(planId);
    if (state) {
      Object.assign(state, updates);
    }
  }

  private emitStatusUpdate(planId: string, status: string, progress: number) {
    this.eventsGateway?.emitStatusUpdate(planId, status, progress);
  }

  private emitLog(planId: string, message: string, level: 'info' | 'warn' | 'error' = 'info') {
    this.eventsGateway?.emitLog(planId, message, level);
  }
}
