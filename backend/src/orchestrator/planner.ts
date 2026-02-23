import { Injectable, Inject, Logger } from '@nestjs/common';
import { LLM_PROVIDER } from '../providers/tokens';
import { EXECUTION_PLAN_REPOSITORY } from '../providers/repository-tokens';
import { ILLMProvider } from '../providers/interfaces/llm-provider.interface';
import { IRepository } from '../providers/interfaces/database-provider.interface';
import { ExecutionPlan } from '../entities/execution-plan.schema';
import { AgentRegistry } from '../agents/registry/agent-registry';
import { ModelRouter } from './model-router';
import {
  TaskDefinition,
  DAGNode,
  ParsedIntent,
  PlanStatus,
  TaskType,
} from '../agents/protocol';

export interface CreatePlanOptions {
  apiKey: string;
  preferredProvider?: string;
}

@Injectable()
export class Planner {
  private readonly logger = new Logger(Planner.name);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmAdapters: ILLMProvider[],
    private readonly modelRouter: ModelRouter,
    private readonly agentRegistry: AgentRegistry,
    @Inject(EXECUTION_PLAN_REPOSITORY)
    private readonly planRepo: IRepository<ExecutionPlan>,
  ) {}

  async createPlan(
    intent: string,
    projectId: string,
    options: CreatePlanOptions,
  ): Promise<ExecutionPlan> {
    this.logger.log(
      `Creating plan for intent: "${intent}" (project: ${projectId})`,
    );

    const parsedIntent = await this.parseIntent(intent, options);
    const tasks = await this.decomposeTasks(intent, parsedIntent, options);
    const dag = this.buildDAG(tasks);

    let estimatedCost = 0;
    for (const node of dag) {
      const agents = this.agentRegistry.canHandle(node.taskDefinition);
      if (agents.length > 0) {
        const estimate = agents[0].estimateCost(node.taskDefinition, {
          entries: [],
          tokenBudget: 4096,
          tokenCount: 0,
          compiledAt: new Date(),
          cacheKey: '',
          scope: 'global',
        });
        estimatedCost += estimate.estimatedCostUSD;
      }
    }

    const plan = await this.planRepo.create({
      projectId,
      intent,
      parsedIntent: {
        intent: parsedIntent.intent,
        taskType: parsedIntent.taskType,
        complexity: parsedIntent.complexity,
        requiredAgents: parsedIntent.requiredAgents,
      },
      dag: dag.map((node) => ({
        nodeId: node.nodeId,
        agentId: node.agentId,
        taskDefinition: node.taskDefinition,
        dependencies: node.dependencies,
        status: 'pending',
      })),
      estimatedCost,
      estimatedDuration: dag.length * 30000,
      status: 'pending_approval' as PlanStatus,
    });

    this.logger.log(
      `Plan created with ${dag.length} nodes, est. cost: $${estimatedCost.toFixed(4)}`,
    );
    return plan;
  }

  private async parseIntent(
    intent: string,
    options: CreatePlanOptions,
  ): Promise<ParsedIntent> {
    const adapter = this.selectAdapter(options.preferredProvider);
    if (!adapter) {
      return this.deterministicParseIntent(intent);
    }

    try {
      const prompt = `Analyze this software development intent and return JSON:
Intent: "${intent}"
Return: { "intent": string, "taskType": one of [code-generation, code-review, testing, documentation, deployment, architecture, analysis, bug-fix, refactor], "complexity": one of [simple, moderate, complex], "requiredAgents": array of [analyst, architect, coder, reviewer, tester, doc, devops, fixer] }`;

      const result = await adapter.generateJSON<ParsedIntent>(prompt, {
        apiKey: options.apiKey,
      });
      return result.data;
    } catch (error) {
      this.logger.warn(
        `LLM intent parsing failed, using deterministic fallback: ${error}`,
      );
      return this.deterministicParseIntent(intent);
    }
  }

  private deterministicParseIntent(intent: string): ParsedIntent {
    const lower = intent.toLowerCase();
    let taskType: TaskType = 'code-generation';
    let complexity: ParsedIntent['complexity'] = 'moderate';
    const requiredAgents: string[] = ['analyst', 'coder', 'reviewer'];

    if (lower.includes('fix') || lower.includes('bug')) {
      taskType = 'bug-fix';
      requiredAgents.push('fixer');
    } else if (lower.includes('test')) {
      taskType = 'testing';
      requiredAgents.push('tester');
    } else if (lower.includes('deploy')) {
      taskType = 'deployment';
      requiredAgents.push('devops');
    } else if (lower.includes('document') || lower.includes('doc')) {
      taskType = 'documentation';
      requiredAgents.push('doc');
    } else if (lower.includes('architect') || lower.includes('design')) {
      taskType = 'architecture';
      requiredAgents.push('architect');
    } else if (lower.includes('review')) {
      taskType = 'code-review';
    } else if (lower.includes('refactor')) {
      taskType = 'refactor';
    }

    if (
      lower.includes('full') ||
      lower.includes('complete') ||
      lower.includes('entire')
    ) {
      complexity = 'complex';
      requiredAgents.push('architect', 'tester', 'doc', 'devops');
    }

    return {
      intent,
      taskType,
      complexity,
      requiredAgents: [...new Set(requiredAgents)],
    };
  }

  private async decomposeTasks(
    intent: string,
    parsedIntent: ParsedIntent,
    options: CreatePlanOptions,
  ): Promise<TaskDefinition[]> {
    const adapter = this.selectAdapter(options.preferredProvider);
    if (!adapter) {
      return this.deterministicDecompose(parsedIntent);
    }

    try {
      const prompt = `Decompose this intent into concrete tasks. Return JSON array.
Intent: "${intent}"
Type: ${parsedIntent.taskType}
Complexity: ${parsedIntent.complexity}
Available agents: ${parsedIntent.requiredAgents.join(', ')}

Return: { "tasks": [{ "id": string, "type": TaskType, "description": string, "tags": string[], "dependencies": string[], "priority": number, "timeoutMs": number }] }`;

      const result = await adapter.generateJSON<{ tasks: TaskDefinition[] }>(
        prompt,
        {
          apiKey: options.apiKey,
        },
      );
      return result.data.tasks;
    } catch (error) {
      this.logger.warn(
        `LLM decomposition failed, using deterministic fallback: ${error}`,
      );
      return this.deterministicDecompose(parsedIntent);
    }
  }

  private deterministicDecompose(parsedIntent: ParsedIntent): TaskDefinition[] {
    const tasks: TaskDefinition[] = [];
    let priority = 1;

    if (parsedIntent.requiredAgents.includes('analyst')) {
      tasks.push({
        id: 'task-analysis',
        type: 'analysis',
        description: `Analyze requirements for: ${parsedIntent.intent}`,
        tags: ['analysis', 'requirements'],
        dependencies: [],
        priority: priority++,
        timeoutMs: 30000,
      });
    }

    if (parsedIntent.requiredAgents.includes('architect')) {
      tasks.push({
        id: 'task-architecture',
        type: 'architecture',
        description: `Design architecture for: ${parsedIntent.intent}`,
        tags: ['architecture', 'design'],
        dependencies: tasks.length > 0 ? ['task-analysis'] : [],
        priority: priority++,
        timeoutMs: 60000,
      });
    }

    const codeDep = tasks.length > 0 ? [tasks[tasks.length - 1].id] : [];
    if (parsedIntent.requiredAgents.includes('coder')) {
      tasks.push({
        id: 'task-code',
        type: 'code-generation',
        description: `Implement: ${parsedIntent.intent}`,
        tags: ['code-generation', 'implementation'],
        dependencies: codeDep,
        priority: priority++,
        timeoutMs: 120000,
      });
    }

    if (parsedIntent.requiredAgents.includes('reviewer')) {
      tasks.push({
        id: 'task-review',
        type: 'code-review',
        description: `Review code for: ${parsedIntent.intent}`,
        tags: ['code-review', 'quality'],
        dependencies: ['task-code'],
        priority: priority++,
        timeoutMs: 60000,
      });
    }

    if (parsedIntent.requiredAgents.includes('tester')) {
      tasks.push({
        id: 'task-test',
        type: 'testing',
        description: `Generate tests for: ${parsedIntent.intent}`,
        tags: ['testing', 'test-generation'],
        dependencies: ['task-code'],
        priority: priority++,
        timeoutMs: 90000,
      });
    }

    if (parsedIntent.requiredAgents.includes('doc')) {
      tasks.push({
        id: 'task-doc',
        type: 'documentation',
        description: `Document: ${parsedIntent.intent}`,
        tags: ['documentation'],
        dependencies: ['task-code'],
        priority: priority++,
        timeoutMs: 60000,
      });
    }

    if (parsedIntent.requiredAgents.includes('devops')) {
      tasks.push({
        id: 'task-deploy',
        type: 'deployment',
        description: `Deploy: ${parsedIntent.intent}`,
        tags: ['deployment', 'infrastructure', 'vcs'],
        dependencies: ['task-review'],
        priority: priority++,
        timeoutMs: 90000,
      });
    }

    return tasks;
  }

  private buildDAG(tasks: TaskDefinition[]): DAGNode[] {
    return tasks.map((task) => {
      const agents = this.agentRegistry.canHandle(task);
      const agentId = agents.length > 0 ? agents[0].profile.id : 'unassigned';

      return {
        nodeId: task.id,
        agentId,
        taskDefinition: task,
        dependencies: task.dependencies,
        status: 'pending' as const,
      };
    });
  }

  private selectAdapter(preferredProvider?: string): ILLMProvider | null {
    if (preferredProvider) {
      const found = this.llmAdapters.find((a) => a.name === preferredProvider);
      if (found) return found;
    }
    return this.llmAdapters.length > 0 ? this.llmAdapters[0] : null;
  }
}
