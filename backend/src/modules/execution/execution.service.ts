import { Injectable } from '@nestjs/common';
import { PlansService } from '../plans/plans.service';
import { ProjectsService } from '../projects/projects.service';
import { GitService } from '../git/git.service';
import { LlmService } from '../llm/llm.service';
import { QualityGatesService } from '../quality-gates/quality-gates.service';
import { ManualTasksService } from '../manual-tasks/manual-tasks.service';

interface ExecutionState {
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
    private qualityGatesService: QualityGatesService,
    private manualTasksService: ManualTasksService,
  ) {}

  async executePlan(planId: string) {
    const plan = await this.plansService.findOne(planId);
    if (!plan) throw new Error('Plan not found');

    const project = await this.projectsService.findOne(plan.projectId);
    if (!project) throw new Error('Project not found');

    console.log(`Starting execution for plan: ${planId} (Project: ${project.name})`);

    // Initialize execution state
    this.executionStates.set(planId, {
      planId,
      status: 'running',
      currentPhaseIndex: 0,
      currentTaskIndex: 0,
    });

    await this.plansService.updateStatus(planId, 'in_progress');

    // Iterate phases
    for (let i = 0; i < plan.phases.length; i++) {
      const state = this.executionStates.get(planId);
      if (state?.status === 'paused') {
        console.log(`Execution paused at phase ${i}`);
        return;
      }

      const phase = plan.phases[i];
      console.log(`Executing Phase: ${phase.name}`);

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
          const shouldContinue = await this.executeTask(planId, i, task, project, plan.wizardData);
          if (!shouldContinue) {
            return; // Execution paused for manual task or error
          }
        }
      }
    }

    await this.plansService.updateStatus(planId, 'completed');
    this.updateExecutionState(planId, { status: 'completed' });
    console.log(`Plan execution completed: ${planId}`);
  }

  private async executeTask(
    planId: string,
    phaseIndex: number,
    task: any,
    project: any,
    wizardData: any
  ): Promise<boolean> {
    console.log(`  > Executing Task: ${task.name}`);

    // Check for manual task
    const manualTask = this.manualTasksService.detectManualTasks({
      name: task.name,
      description: task.description || '',
      type: task.type,
    });

    if (manualTask) {
      console.log(`  > Manual task detected: ${manualTask.title}`);
      await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'paused');
      this.updateExecutionState(planId, {
        status: 'paused',
        pauseReason: `Manual task required: ${manualTask.title}`,
        manualTaskPending: true,
      });
      return false; // Stop execution for manual task
    }

    // Update status to in_progress
    await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'in_progress');

    try {
      // Generate Code
      const context = {
        projectName: project.name,
        technologies: wizardData.stage3?.technologies || [],
        architecture: wizardData.stage3?.selectedArchetypes || [],
      };

      const generated = await this.llmService.generateCode(task, context);

      if (!generated.files || generated.files.length === 0) {
        console.warn(`    No files generated for task: ${task.name}`);
        await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'completed');
        return true;
      }

      // Run Quality Gates
      console.log(`    Running quality gates on ${generated.files.length} files...`);
      const qualityResult = await this.qualityGatesService.runAllChecks(generated.files, {
        skipTests: true, // Skip test checks for now since we don't have the test files yet
      });

      console.log(this.qualityGatesService.generateReport(qualityResult));

      if (!qualityResult.passed) {
        console.error(`    Quality gate failed for task: ${task.name}`);
        console.log(`    Blockers: ${qualityResult.blockers.map(b => b.message).join(', ')}`);

        // Try to fix issues with LLM (optional enhancement)
        // For now, mark as failed and continue
        await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'failed');
        return true; // Continue with next task
      }

      // Commit to Git
      console.log(`    Committing ${generated.files.length} files...`);
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
        // Don't fail the task if git commit fails - might not have repo set up
      }

      // Update status to completed
      await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'completed');
      console.log(`    Task completed: ${task.name}`);
      return true;

    } catch (error) {
      console.error(`    Task failed: ${task.name}`, error);
      await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'failed');
      return true; // Continue with next task instead of stopping
    }
  }

  async getExecutionStatus(planId: string) {
    const plan = await this.plansService.findOne(planId);
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

  async pauseExecution(planId: string) {
    const state = this.executionStates.get(planId);
    if (state) {
      state.status = 'paused';
      state.pauseReason = 'User requested pause';
    }
    await this.plansService.updateStatus(planId, 'paused');
    return { message: 'Execution paused', planId };
  }

  async resumeExecution(planId: string) {
    const state = this.executionStates.get(planId);
    if (!state) throw new Error('No execution state found');

    state.status = 'running';
    state.pauseReason = undefined;
    state.manualTaskPending = false;

    const plan = await this.plansService.findOne(planId);
    if (!plan) throw new Error('Plan not found');

    const project = await this.projectsService.findOne(plan.projectId);
    if (!project) throw new Error('Project not found');

    await this.plansService.updateStatus(planId, 'in_progress');

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
          const shouldContinue = await this.executeTask(planId, i, task, project, plan.wizardData);
          if (!shouldContinue) {
            return;
          }
        }
      }
    }

    await this.plansService.updateStatus(planId, 'completed');
    this.updateExecutionState(planId, { status: 'completed' });
  }

  private updateExecutionState(planId: string, updates: Partial<ExecutionState>) {
    const state = this.executionStates.get(planId);
    if (state) {
      Object.assign(state, updates);
    }
  }
}