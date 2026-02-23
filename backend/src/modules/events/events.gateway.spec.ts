import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let jwtService: { verify: jest.Mock };
  let mockServer: { to: jest.Mock; emit: jest.Mock };

  const createMockSocket = (overrides: Record<string, any> = {}) => ({
    id: overrides.id ?? 'socket-1',
    handshake: {
      auth: overrides.auth ?? {},
      headers: overrides.headers ?? {},
    },
    join: jest.fn(),
    leave: jest.fn(),
  });

  beforeEach(async () => {
    jwtService = { verify: jest.fn() };

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [EventsGateway, { provide: JwtService, useValue: jwtService }],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    (gateway as any).server = mockServer;
  });

  // ─── Connection Handling ───────────────────────────────────────────

  describe('handleConnection', () => {
    it('should authenticate client when valid token is in handshake auth', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-123' });
      const socket = createMockSocket({ auth: { token: 'valid-token' } });

      await gateway.handleConnection(socket as any);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      const client = (gateway as any).connectedClients.get('socket-1');
      expect(client).toBeDefined();
      expect(client.userId).toBe('user-123');
    });

    it('should authenticate client when token is in authorization header', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-456' });
      const socket = createMockSocket({
        headers: { authorization: 'Bearer header-token' },
      });

      await gateway.handleConnection(socket as any);

      expect(jwtService.verify).toHaveBeenCalledWith('header-token');
      const client = (gateway as any).connectedClients.get('socket-1');
      expect(client.userId).toBe('user-456');
    });

    it('should connect anonymously when no token is provided', async () => {
      const socket = createMockSocket();

      await gateway.handleConnection(socket as any);

      expect(jwtService.verify).not.toHaveBeenCalled();
      const client = (gateway as any).connectedClients.get('socket-1');
      expect(client).toBeDefined();
      expect(client.userId).toBeUndefined();
    });

    it('should connect anonymously when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });
      const socket = createMockSocket({ auth: { token: 'bad-token' } });

      await gateway.handleConnection(socket as any);

      const client = (gateway as any).connectedClients.get('socket-1');
      expect(client).toBeDefined();
      expect(client.userId).toBeUndefined();
    });
  });

  // ─── Disconnect ────────────────────────────────────────────────────

  describe('handleDisconnect', () => {
    it('should remove client from connected clients map', async () => {
      const socket = createMockSocket();
      await gateway.handleConnection(socket as any);
      expect((gateway as any).connectedClients.has('socket-1')).toBe(true);

      gateway.handleDisconnect(socket as any);

      expect((gateway as any).connectedClients.has('socket-1')).toBe(false);
    });
  });

  // ─── subscribe_execution ──────────────────────────────────────────

  describe('handleSubscribeExecution', () => {
    it('should join the plan room and return subscribed acknowledgement', async () => {
      const socket = createMockSocket();
      await gateway.handleConnection(socket as any);

      const result = gateway.handleSubscribeExecution(socket as any, {
        planId: 'plan-abc',
      });

      expect(socket.join).toHaveBeenCalledWith('plan:plan-abc');
      expect(result).toEqual({
        event: 'subscribed',
        data: { planId: 'plan-abc' },
      });
    });

    it('should set planId on the client info', async () => {
      const socket = createMockSocket();
      await gateway.handleConnection(socket as any);

      gateway.handleSubscribeExecution(socket as any, { planId: 'plan-abc' });

      const client = (gateway as any).connectedClients.get('socket-1');
      expect(client.planId).toBe('plan-abc');
    });
  });

  // ─── unsubscribe_execution ────────────────────────────────────────

  describe('handleUnsubscribeExecution', () => {
    it('should leave the plan room and return unsubscribed acknowledgement', async () => {
      const socket = createMockSocket();
      await gateway.handleConnection(socket as any);
      gateway.handleSubscribeExecution(socket as any, { planId: 'plan-abc' });

      const result = gateway.handleUnsubscribeExecution(socket as any, {
        planId: 'plan-abc',
      });

      expect(socket.leave).toHaveBeenCalledWith('plan:plan-abc');
      expect(result).toEqual({
        event: 'unsubscribed',
        data: { planId: 'plan-abc' },
      });
    });

    it('should clear planId on the client info', async () => {
      const socket = createMockSocket();
      await gateway.handleConnection(socket as any);
      gateway.handleSubscribeExecution(socket as any, { planId: 'plan-abc' });

      gateway.handleUnsubscribeExecution(socket as any, { planId: 'plan-abc' });

      const client = (gateway as any).connectedClients.get('socket-1');
      expect(client.planId).toBeUndefined();
    });
  });

  // ─── subscribe_pipeline ───────────────────────────────────────────

  describe('handleSubscribePipeline', () => {
    it('should join the pipeline room and return acknowledgement', () => {
      const socket = createMockSocket();

      const result = gateway.handleSubscribePipeline(socket as any, {
        pipelineId: 'pipe-1',
      });

      expect(socket.join).toHaveBeenCalledWith('pipeline:pipe-1');
      expect(result).toEqual({
        event: 'subscribed',
        data: { pipelineId: 'pipe-1' },
      });
    });
  });

  // ─── unsubscribe_pipeline ─────────────────────────────────────────

  describe('handleUnsubscribePipeline', () => {
    it('should leave the pipeline room and return acknowledgement', () => {
      const socket = createMockSocket();

      const result = gateway.handleUnsubscribePipeline(socket as any, {
        pipelineId: 'pipe-1',
      });

      expect(socket.leave).toHaveBeenCalledWith('pipeline:pipe-1');
      expect(result).toEqual({
        event: 'unsubscribed',
        data: { pipelineId: 'pipe-1' },
      });
    });
  });

  // ─── emitExecutionEvent ───────────────────────────────────────────

  describe('emitExecutionEvent', () => {
    it('should emit to the correct plan room', () => {
      const event = {
        type: 'status_update' as const,
        planId: 'plan-abc',
        timestamp: new Date(),
        data: { status: 'running', progress: 50 },
      };

      gateway.emitExecutionEvent('plan-abc', event);

      expect(mockServer.to).toHaveBeenCalledWith('plan:plan-abc');
      expect(mockServer.emit).toHaveBeenCalledWith('execution_event', event);
    });
  });

  // ─── emitWorkerStatusUpdate ───────────────────────────────────────

  describe('emitWorkerStatusUpdate', () => {
    it('should emit to the pipeline room, not broadcast', () => {
      gateway.emitWorkerStatusUpdate('pipe-1', 'agent-A', {
        state: 'busy',
        currentTask: 'task-1',
      });

      expect(mockServer.to).toHaveBeenCalledWith('pipeline:pipe-1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'worker_status_update',
        expect.objectContaining({
          type: 'worker_status_update',
          timestamp: expect.any(Date),
          data: {
            agentId: 'agent-A',
            state: 'busy',
            currentTask: 'task-1',
          },
        }),
      );
    });
  });

  // ─── emitStatusUpdate ─────────────────────────────────────────────

  describe('emitStatusUpdate', () => {
    it('should emit a status_update execution event', () => {
      gateway.emitStatusUpdate('plan-1', 'running', 75);

      expect(mockServer.to).toHaveBeenCalledWith('plan:plan-1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'execution_event',
        expect.objectContaining({
          type: 'status_update',
          planId: 'plan-1',
          data: { status: 'running', progress: 75 },
        }),
      );
    });
  });

  // ─── emitLog ──────────────────────────────────────────────────────

  describe('emitLog', () => {
    it('should emit a log execution event with default info level', () => {
      gateway.emitLog('plan-1', 'Something happened');

      expect(mockServer.to).toHaveBeenCalledWith('plan:plan-1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'execution_event',
        expect.objectContaining({
          type: 'log',
          planId: 'plan-1',
          data: { message: 'Something happened', level: 'info' },
        }),
      );
    });

    it('should emit a log with a custom level', () => {
      gateway.emitLog('plan-1', 'Oops', 'error');

      expect(mockServer.emit).toHaveBeenCalledWith(
        'execution_event',
        expect.objectContaining({
          data: { message: 'Oops', level: 'error' },
        }),
      );
    });
  });

  // ─── getSubscriberCount ───────────────────────────────────────────

  describe('getSubscriberCount', () => {
    it('should return 0 when no clients are subscribed', () => {
      expect(gateway.getSubscriberCount('plan-abc')).toBe(0);
    });

    it('should return the correct count of subscribed clients', async () => {
      const socket1 = createMockSocket({ id: 's1' });
      const socket2 = createMockSocket({ id: 's2' });
      const socket3 = createMockSocket({ id: 's3' });

      await gateway.handleConnection(socket1 as any);
      await gateway.handleConnection(socket2 as any);
      await gateway.handleConnection(socket3 as any);

      gateway.handleSubscribeExecution(socket1 as any, { planId: 'plan-x' });
      gateway.handleSubscribeExecution(socket2 as any, { planId: 'plan-x' });
      gateway.handleSubscribeExecution(socket3 as any, { planId: 'plan-y' });

      expect(gateway.getSubscriberCount('plan-x')).toBe(2);
      expect(gateway.getSubscriberCount('plan-y')).toBe(1);
      expect(gateway.getSubscriberCount('plan-z')).toBe(0);
    });

    it('should decrement count when a client unsubscribes', async () => {
      const socket1 = createMockSocket({ id: 's1' });
      await gateway.handleConnection(socket1 as any);
      gateway.handleSubscribeExecution(socket1 as any, { planId: 'plan-x' });

      expect(gateway.getSubscriberCount('plan-x')).toBe(1);

      gateway.handleUnsubscribeExecution(socket1 as any, { planId: 'plan-x' });

      expect(gateway.getSubscriberCount('plan-x')).toBe(0);
    });
  });
});
