import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { QUEUE_PROVIDER } from '../providers/tokens';
import { AGENT_EXECUTION_REPOSITORY } from '../providers/repository-tokens';
import {
  IQueueProvider,
  IJob,
} from '../providers/interfaces/queue-provider.interface';
import { IAgentExecutionRepository } from '../providers/interfaces/agent-execution-repository.interface';
import { AgentRegistry } from '../agents/registry/agent-registry';
import { ContextCompiler } from '../agents/context/context-compiler';
import { AgentJobData, AgentInput, AgentOutput } from '../agents/protocol';
import { OrchestratorService } from './orchestrator.service';
import { WorkerPoolManager } from './worker-pool-manager';

@Injectable()
export class AgentJobRunner implements OnModuleInit {
  private readonly logger = new Logger(AgentJobRunner.name);

  constructor(
    @Inject(QUEUE_PROVIDER)
    private readonly queueProvider: IQueueProvider,
    private readonly agentRegistry: AgentRegistry,
    private readonly contextCompiler: ContextCompiler,
    @Inject(forwardRef(() => OrchestratorService))
    private readonly orchestratorService: OrchestratorService,
    @Inject(AGENT_EXECUTION_REPOSITORY)
    private readonly executionRepo: IAgentExecutionRepository,
    private readonly workerPoolManager: WorkerPoolManager,
  ) {}

  async onModuleInit(): Promise<void> {
    const agentIds = this.agentRegistry.getRegisteredIds();
    this.logger.log(
      `Registering job handlers for ${agentIds.length} agents: [${agentIds.join(', ')}]`,
    );

    for (const agentId of agentIds) {
      await this.workerPoolManager.setupAgentQueue(agentId);
      const queue = this.queueProvider.getQueue<AgentJobData>(
        `agent:${agentId}`,
      );
      queue.process(async (job) => this.processJob(job));
    }
  }

  private async processJob(job: IJob<AgentJobData>): Promise<void> {
    const {
      agentId,
      taskDefinition,
      pipelineId,
      projectId,
      traceId,
      configOverrides,
    } = job.data;

    this.logger.log(
      `[${traceId}] Processing job for agent:${agentId}, task:${taskDefinition.id}, pipeline:${pipelineId}`,
    );

    // 1. Get agent from registry
    const agent = this.agentRegistry.get(agentId);

    // 2. Compile context
    const context = await this.contextCompiler.compile(
      agentId,
      taskDefinition,
      pipelineId,
    );

    // 3. Fetch previous outputs
    const previousOutputs = await this.fetchPreviousOutputs(
      job.data.previousOutputIds,
      pipelineId,
    );

    // 4. Build AgentInput
    const input: AgentInput = {
      taskDefinition,
      context,
      previousOutputs,
      config: configOverrides ?? {},
      traceId,
    };

    // 5. Persist execution start
    const exec = await this.executionRepo.create({
      projectId,
      pipelineId,
      taskId: taskDefinition.id,
      agentId,
      traceId,
      status: 'running',
      metrics: {
        startedAt: new Date(),
        durationMs: 0,
        tokensUsed: 0,
        costUSD: 0,
        llmCalls: 0,
        retries: 0,
      },
    } as any);

    const execId = (exec as any)._id?.toString() ?? (exec as any).id;
    const startTime = Date.now();

    try {
      // 6. Execute agent
      const output = await agent.execute(input);

      // 7. Persist result
      const durationMs = Date.now() - startTime;
      await this.executionRepo.update(execId, {
        status: output.status === 'success' ? 'completed' : output.status,
        output: output as any,
        metrics: {
          ...(output.metrics as any),
          durationMs,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `[${traceId}] Agent ${agentId} completed task ${taskDefinition.id} (${durationMs}ms)`,
      );

      // 8. Close the loop — triggers next DAG nodes
      await this.orchestratorService.handleAgentComplete(
        pipelineId,
        taskDefinition.id,
        output,
      );
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.executionRepo.update(execId, {
        status: 'failed',
        errorDetails: { message: errorMessage, stack: (error as Error).stack },
        metrics: {
          startedAt: (exec as any).metrics?.startedAt ?? new Date(),
          durationMs,
          completedAt: new Date(),
          tokensUsed: 0,
          costUSD: 0,
          llmCalls: 0,
          retries: 0,
        },
      });

      this.logger.error(
        `[${traceId}] Agent ${agentId} failed task ${taskDefinition.id}: ${errorMessage}`,
      );

      await this.orchestratorService.handleAgentFail(
        pipelineId,
        taskDefinition.id,
        errorMessage,
      );
    }
  }

  private async fetchPreviousOutputs(
    outputIds: string[],
    pipelineId: string,
  ): Promise<AgentOutput[]> {
    if (!outputIds?.length) return [];

    const executions = await this.executionRepo.find({
      pipelineId,
      taskId: { $in: outputIds },
      status: 'completed',
    });

    return executions
      .filter((e) => e.output)
      .map((e) => e.output as unknown as AgentOutput);
  }
}
