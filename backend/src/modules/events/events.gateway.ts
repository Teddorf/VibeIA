import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface ExecutionEvent {
  type:
    | 'status_update'
    | 'task_started'
    | 'task_completed'
    | 'task_failed'
    | 'phase_completed'
    | 'execution_completed'
    | 'error'
    | 'log'
    | 'worker_status_update'
    | 'agent_started'
    | 'agent_completed'
    | 'agent_failed'
    | 'pipeline_progress'
    | string;
  planId: string;
  timestamp: Date;
  data: Record<string, any>;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/execution',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients: Map<
    string,
    { socket: Socket; userId?: string; planId?: string }
  > = new Map();

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Try to authenticate via token in handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      let userId: string | undefined;
      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          userId = payload.sub;
        } catch {
          this.logger.warn(`Invalid token from client ${client.id}`);
        }
      }

      this.connectedClients.set(client.id, { socket: client, userId });
      this.logger.log(
        `Client connected: ${client.id} (user: ${userId || 'anonymous'})`,
      );
    } catch (error) {
      this.logger.error(`Error during connection: ${error.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_execution')
  handleSubscribeExecution(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { planId: string },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.planId = data.planId;
      client.join(`plan:${data.planId}`);
      this.logger.log(`Client ${client.id} subscribed to plan: ${data.planId}`);
    }
    return { event: 'subscribed', data: { planId: data.planId } };
  }

  @SubscribeMessage('unsubscribe_execution')
  handleUnsubscribeExecution(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { planId: string },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      clientInfo.planId = undefined;
      client.leave(`plan:${data.planId}`);
      this.logger.log(
        `Client ${client.id} unsubscribed from plan: ${data.planId}`,
      );
    }
    return { event: 'unsubscribed', data: { planId: data.planId } };
  }

  // Methods to emit events to clients

  emitExecutionEvent(planId: string, event: ExecutionEvent) {
    this.server.to(`plan:${planId}`).emit('execution_event', event);
    this.logger.debug(`Emitted ${event.type} for plan: ${planId}`);
  }

  emitStatusUpdate(planId: string, status: string, progress: number) {
    this.emitExecutionEvent(planId, {
      type: 'status_update',
      planId,
      timestamp: new Date(),
      data: { status, progress },
    });
  }

  emitTaskStarted(
    planId: string,
    phaseIndex: number,
    taskId: string,
    taskName: string,
  ) {
    this.emitExecutionEvent(planId, {
      type: 'task_started',
      planId,
      timestamp: new Date(),
      data: { phaseIndex, taskId, taskName },
    });
  }

  emitTaskCompleted(
    planId: string,
    phaseIndex: number,
    taskId: string,
    taskName: string,
    filesGenerated?: number,
  ) {
    this.emitExecutionEvent(planId, {
      type: 'task_completed',
      planId,
      timestamp: new Date(),
      data: { phaseIndex, taskId, taskName, filesGenerated },
    });
  }

  emitTaskFailed(
    planId: string,
    phaseIndex: number,
    taskId: string,
    taskName: string,
    error: string,
  ) {
    this.emitExecutionEvent(planId, {
      type: 'task_failed',
      planId,
      timestamp: new Date(),
      data: { phaseIndex, taskId, taskName, error },
    });
  }

  emitPhaseCompleted(planId: string, phaseIndex: number, phaseName: string) {
    this.emitExecutionEvent(planId, {
      type: 'phase_completed',
      planId,
      timestamp: new Date(),
      data: { phaseIndex, phaseName },
    });
  }

  emitExecutionCompleted(
    planId: string,
    summary: {
      totalTasks: number;
      completedTasks: number;
      failedTasks: number;
    },
  ) {
    this.emitExecutionEvent(planId, {
      type: 'execution_completed',
      planId,
      timestamp: new Date(),
      data: summary,
    });
  }

  emitError(planId: string, error: string, details?: any) {
    this.emitExecutionEvent(planId, {
      type: 'error',
      planId,
      timestamp: new Date(),
      data: { error, details },
    });
  }

  emitLog(
    planId: string,
    message: string,
    level: 'info' | 'warn' | 'error' = 'info',
  ) {
    this.emitExecutionEvent(planId, {
      type: 'log',
      planId,
      timestamp: new Date(),
      data: { message, level },
    });
  }

  // ─── Pipeline / Worker Events ──────────────────────────────────────────────

  @SubscribeMessage('subscribe_pipeline')
  handleSubscribePipeline(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { pipelineId: string },
  ) {
    client.join(`pipeline:${data.pipelineId}`);
    this.logger.log(
      `Client ${client.id} subscribed to pipeline: ${data.pipelineId}`,
    );
    return { event: 'subscribed', data: { pipelineId: data.pipelineId } };
  }

  emitWorkerStatusUpdate(agentId: string, status: Record<string, any>) {
    this.server.emit('worker_status_update', {
      type: 'worker_status_update',
      timestamp: new Date(),
      data: { agentId, ...status },
    });
  }

  emitAgentStarted(planId: string, agentId: string, taskId: string) {
    this.emitExecutionEvent(planId, {
      type: 'agent_started',
      planId,
      timestamp: new Date(),
      data: { agentId, taskId },
    });
  }

  emitAgentCompleted(
    planId: string,
    agentId: string,
    taskId: string,
    metrics: Record<string, any>,
  ) {
    this.emitExecutionEvent(planId, {
      type: 'agent_completed',
      planId,
      timestamp: new Date(),
      data: { agentId, taskId, metrics },
    });
  }

  emitAgentFailed(
    planId: string,
    agentId: string,
    taskId: string,
    error: string,
  ) {
    this.emitExecutionEvent(planId, {
      type: 'agent_failed',
      planId,
      timestamp: new Date(),
      data: { agentId, taskId, error },
    });
  }

  emitPipelineProgress(planId: string, progress: Record<string, any>) {
    this.emitExecutionEvent(planId, {
      type: 'pipeline_progress',
      planId,
      timestamp: new Date(),
      data: progress,
    });
  }

  // Get connected client count for a plan
  getSubscriberCount(planId: string): number {
    let count = 0;
    this.connectedClients.forEach((client) => {
      if (client.planId === planId) count++;
    });
    return count;
  }
}
