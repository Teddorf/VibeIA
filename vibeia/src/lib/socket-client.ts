'use client';

import { io, Socket } from 'socket.io-client';
import { useOrchestratorStore } from '@/stores/orchestrator-store';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: INITIAL_RECONNECT_DELAY,
      reconnectionDelayMax: 30000,
      autoConnect: false,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected');
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      console.warn(`[Socket] Connection error: ${error.message}`);
    });
  }

  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function subscribeToPipeline(pipelineId: string): void {
  const s = getSocket();
  s.emit('subscribe_pipeline', { pipelineId });

  const store = useOrchestratorStore.getState();

  s.on('execution_event', (event: any) => {
    if (event.planId !== pipelineId) return;

    switch (event.type) {
      case 'node_completed':
        store.updateNodeStatus(event.data.nodeId, 'completed');
        break;
      case 'node_failed':
        store.updateNodeStatus(event.data.nodeId, 'failed');
        break;
      case 'agent_started':
        store.updateNodeStatus(event.data.nodeId, 'running');
        break;
      case 'pipeline_completed':
        store.fetchPlan(pipelineId);
        break;
      case 'pipeline_cancelled':
        store.fetchPlan(pipelineId);
        break;
      case 'worker_status_update':
        store.setAgentStatuses(event.data.statuses ?? []);
        break;
      default:
        break;
    }
  });
}

export function unsubscribeFromPipeline(pipelineId: string): void {
  const s = getSocket();
  s.emit('unsubscribe_pipeline', { pipelineId });
  s.off('execution_event');
}
