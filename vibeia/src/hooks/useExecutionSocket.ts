'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, connectSocket } from '@/lib/socket-client';

export interface ExecutionLogEntry {
  timestamp: Date;
  type: string;
  message: string;
  level?: 'info' | 'warn' | 'error';
  data?: Record<string, unknown>;
}

interface ExecutionEvent {
  type: string;
  planId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

interface UseExecutionSocketReturn {
  logs: ExecutionLogEntry[];
  isConnected: boolean;
  connectionError: string | null;
  lastEvent: ExecutionEvent | null;
}

export function useExecutionSocket(planId: string | null): UseExecutionSocketReturn {
  const [logs, setLogs] = useState<ExecutionLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<ExecutionEvent | null>(null);
  const subscribedRef = useRef(false);

  const addLog = useCallback((entry: ExecutionLogEntry) => {
    setLogs((prev) => [...prev, entry]);
  }, []);

  useEffect(() => {
    if (!planId) return;

    const socket = getSocket();

    const onConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
      if (!subscribedRef.current) {
        socket.emit('subscribe_execution', { planId });
        subscribedRef.current = true;
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
      subscribedRef.current = false;
    };

    const onConnectError = (err: Error) => {
      setConnectionError(err.message);
      setIsConnected(false);
    };

    const onExecutionEvent = (event: ExecutionEvent) => {
      if (event.planId !== planId) return;
      setLastEvent(event);

      const entry: ExecutionLogEntry = {
        timestamp: new Date(event.timestamp),
        type: event.type,
        message: '',
        data: event.data,
      };

      switch (event.type) {
        case 'status_update':
          entry.message = `Status: ${event.data.status} (${event.data.progress}%)`;
          entry.level = 'info';
          break;
        case 'task_started':
          entry.message = `Task started: ${event.data.taskName}`;
          entry.level = 'info';
          break;
        case 'task_completed':
          entry.message = `Task completed: ${event.data.taskName}`;
          entry.level = 'info';
          break;
        case 'task_failed':
          entry.message = `Task failed: ${event.data.taskName} - ${event.data.error}`;
          entry.level = 'error';
          break;
        case 'phase_completed':
          entry.message = `Phase completed: ${event.data.phaseName}`;
          entry.level = 'info';
          break;
        case 'execution_completed':
          entry.message = `Execution completed: ${event.data.completedTasks}/${event.data.totalTasks} tasks`;
          entry.level = 'info';
          break;
        case 'log':
          entry.message = String(event.data.message);
          entry.level = (event.data.level as 'info' | 'warn' | 'error') || 'info';
          break;
        case 'error':
          entry.message = `Error: ${event.data.error}`;
          entry.level = 'error';
          break;
        default:
          entry.message = `Event: ${event.type}`;
          entry.level = 'info';
      }

      addLog(entry);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('execution_event', onExecutionEvent);

    connectSocket();

    // If already connected, subscribe immediately
    if (socket.connected) {
      setIsConnected(true);
      socket.emit('subscribe_execution', { planId });
      subscribedRef.current = true;
    }

    return () => {
      if (subscribedRef.current) {
        socket.emit('unsubscribe_execution', { planId });
        subscribedRef.current = false;
      }
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('execution_event', onExecutionEvent);
    };
  }, [planId, addLog]);

  return { logs, isConnected, connectionError, lastEvent };
}
