import { Injectable } from '@nestjs/common';
import { PlansService } from '../plans/plans.service';
import { ProjectsService } from '../projects/projects.service';
import { GitService } from '../git/git.service';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class ExecutionService {
  constructor(
    private plansService: PlansService,
    private projectsService: ProjectsService,
    private gitService: GitService,
    private llmService: LlmService,
  ) {}

  async executePlan(planId: string) {
    const plan = await this.plansService.findOne(planId);
    if (!plan) throw new Error('Plan not found');

    const project = await this.projectsService.findOne(plan.projectId);
    if (!project) throw new Error('Project not found');

    console.log(`Starting execution for plan: ${planId} (Project: ${project.name})`);

    // Iterate phases
    for (let i = 0; i < plan.phases.length; i++) {
      const phase = plan.phases[i];
      console.log(`Executing Phase: ${phase.name}`);

      // Iterate tasks
      for (const task of phase.tasks) {
        if (task.status === 'pending') {
          await this.executeTask(planId, i, task, project, plan.wizardData);
        }
      }
    }

    await this.plansService.updateStatus(planId, 'completed');
    console.log(`Plan execution completed: ${planId}`);
  }

  private async executeTask(planId: string, phaseIndex: number, task: any, project: any, wizardData: any) {
    console.log(`  > Executing Task: ${task.name}`);
    
    // 1. Update status to in_progress
    await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'in_progress');

    try {
      // 2. Generate Code
      const context = {
        projectName: project.name,
        technologies: [], // TODO: Extract from wizardData
        architecture: wizardData.stage3.selectedArchetypes,
      };
      
      const generated = await this.llmService.generateCode(task, context);
      
      if (!generated.files || generated.files.length === 0) {
        console.warn(`    No files generated for task: ${task.name}`);
      } else {
        // 3. Commit to Git
        console.log(`    Committing ${generated.files.length} files...`);
        await this.gitService.createCommit(
          project.ownerId, // Assuming ownerId is the GitHub username for now (needs refinement)
          project.name,
          'main', // Direct to main for MVP
          generated.files,
          `feat: ${task.name}`
        );
      }

      // 4. Update status to completed
      await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'completed');
      console.log(`    Task completed: ${task.name}`);

    } catch (error) {
      console.error(`    Task failed: ${task.name}`, error);
      await this.plansService.updateTaskStatus(planId, phaseIndex, task.id, 'failed');
      throw error; // Stop execution on failure? Or continue? For now, stop.
    }
  }
}