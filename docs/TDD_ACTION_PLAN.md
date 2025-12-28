# 🔴🟢🔵 PLAN DE ACCION TDD - VibeIA

## CONTEXTO DEL PROYECTO
- **Backend**: NestJS 11 / TypeScript 5.7 / Jest 30
- **Frontend**: Next.js 15 / React 19 / TypeScript 5 / Jest 29
- **Ruta de tests backend**: `backend/src/modules/**/*.spec.ts`
- **Ruta de tests frontend**: `vibeia/src/**/__tests__/*.test.{ts,tsx}`
- **Convenciones de naming**: camelCase, tests descriptivos en ingles

---

## RESUMEN EJECUTIVO

Este plan aborda **47 mejoras criticas** identificadas en el analisis del repositorio, organizadas en **6 sprints** siguiendo metodologia TDD estricta (Red-Green-Refactor).

### Prioridades
| Sprint | Foco | Tests | Duracion Est. |
|--------|------|-------|---------------|
| 1 | Seguridad Critica | 18 tests | 1 semana |
| 2 | Estabilidad Operacional | 12 tests | 1 semana |
| 3 | Escalabilidad DB | 14 tests | 1 semana |
| 4 | Calidad de Codigo | 16 tests | 1 semana |
| 5 | Frontend Security & Performance | 15 tests | 1 semana |
| 6 | Observabilidad & CI/CD | 10 tests | 1 semana |

---

# SPRINT 1: SEGURIDAD CRITICA

## 1.1 IDOR en Refresh Token

### FUNCIONALIDAD A IMPLEMENTAR
El endpoint `/api/auth/refresh` actualmente acepta cualquier `userId` en el body, permitiendo que un usuario refresque tokens de otro usuario. Debe validar que el refresh token pertenece al usuario autenticado.

### LISTADO DE TESTS

#### Test 1.1.1: `should_reject_refresh_when_userId_does_not_match_token_owner`
```typescript
// Archivo: backend/src/modules/auth/auth.service.spec.ts

describe('refreshTokens - IDOR Prevention', () => {
  it('should reject refresh when userId does not match token owner', async () => {
    // Arrange
    const attackerUserId = 'attacker-123';
    const victimUserId = 'victim-456';
    const victimRefreshToken = 'valid-victim-refresh-token';

    // El token pertenece a victim, pero attacker intenta usarlo
    usersService.findRefreshTokenOwner.mockResolvedValue(victimUserId);

    // Act & Assert
    await expect(
      service.refreshTokens(attackerUserId, victimRefreshToken)
    ).rejects.toThrow(UnauthorizedException);

    expect(usersService.findRefreshTokenOwner).toHaveBeenCalledWith(victimRefreshToken);
  });
});
```

#### Test 1.1.2: `should_accept_refresh_when_userId_matches_token_owner`
```typescript
it('should accept refresh when userId matches token owner', async () => {
  // Arrange
  const userId = 'user-123';
  const refreshToken = 'valid-refresh-token';

  usersService.findRefreshTokenOwner.mockResolvedValue(userId);
  usersService.validateRefreshToken.mockResolvedValue(true);
  usersService.findById.mockResolvedValue(mockActiveUser);
  jwtService.sign.mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh');

  // Act
  const result = await service.refreshTokens(userId, refreshToken);

  // Assert
  expect(result.accessToken).toBe('new-access');
  expect(usersService.findRefreshTokenOwner).toHaveBeenCalledWith(refreshToken);
});
```

#### Test 1.1.3: `should_reject_refresh_with_nonexistent_token`
```typescript
it('should reject refresh with nonexistent token', async () => {
  usersService.findRefreshTokenOwner.mockResolvedValue(null);

  await expect(
    service.refreshTokens('any-user', 'fake-token')
  ).rejects.toThrow(UnauthorizedException);
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/modules/auth/auth.service.ts

async refreshTokens(userId: string, refreshToken: string): Promise<TokenResponse> {
  // 1. Verificar que el token existe y obtener su propietario
  const tokenOwner = await this.usersService.findRefreshTokenOwner(refreshToken);

  if (!tokenOwner) {
    throw new UnauthorizedException('Invalid refresh token');
  }

  // 2. IDOR Prevention: Verificar que el userId coincide con el propietario
  if (tokenOwner !== userId) {
    throw new UnauthorizedException('Token does not belong to this user');
  }

  // 3. Continuar con validacion normal...
  const isValid = await this.usersService.validateRefreshToken(userId, refreshToken);
  if (!isValid) {
    throw new UnauthorizedException('Invalid refresh token');
  }

  // ... resto de la implementacion
}
```

---

## 1.2 Eliminar Secrets Hardcodeados

### FUNCIONALIDAD A IMPLEMENTAR
Eliminar todos los valores por defecto de secrets y hacer que las variables de entorno sean obligatorias. La aplicacion debe fallar al iniciar si faltan.

### LISTADO DE TESTS

#### Test 1.2.1: `should_throw_on_startup_when_JWT_SECRET_missing`
```typescript
// Archivo: backend/src/config/config.validation.spec.ts (NUEVO)

import { validateConfig } from './config.validation';

describe('Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw on startup when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    process.env.MONGO_URI = 'mongodb://localhost/test';
    process.env.JWT_REFRESH_SECRET = 'some-refresh-secret';

    expect(() => validateConfig()).toThrow('JWT_SECRET is required');
  });
});
```

#### Test 1.2.2: `should_throw_on_startup_when_MONGO_URI_missing`
```typescript
it('should throw on startup when MONGO_URI is missing', () => {
  delete process.env.MONGO_URI;
  process.env.JWT_SECRET = 'some-secret';
  process.env.JWT_REFRESH_SECRET = 'some-refresh-secret';

  expect(() => validateConfig()).toThrow('MONGO_URI is required');
});
```

#### Test 1.2.3: `should_throw_when_ENCRYPTION_KEY_missing`
```typescript
it('should throw when ENCRYPTION_KEY is missing and encryption is used', () => {
  delete process.env.ENCRYPTION_KEY;
  delete process.env.ENCRYPTION_SALT;
  process.env.JWT_SECRET = 'secret';
  process.env.MONGO_URI = 'mongodb://localhost/test';

  expect(() => validateConfig()).toThrow('ENCRYPTION_KEY is required');
});
```

#### Test 1.2.4: `should_accept_valid_configuration`
```typescript
it('should accept valid configuration with all required vars', () => {
  process.env.JWT_SECRET = 'super-secret-key-min-32-chars-long!!';
  process.env.JWT_REFRESH_SECRET = 'refresh-secret-key-min-32-chars!!';
  process.env.MONGO_URI = 'mongodb://localhost:27017/vibeia';
  process.env.ENCRYPTION_KEY = 'encryption-key-32-characters-xx';
  process.env.ENCRYPTION_SALT = 'salt-value-here';

  expect(() => validateConfig()).not.toThrow();
});
```

#### Test 1.2.5: `should_reject_JWT_SECRET_shorter_than_32_chars`
```typescript
it('should reject JWT_SECRET shorter than 32 characters', () => {
  process.env.JWT_SECRET = 'short';
  process.env.MONGO_URI = 'mongodb://localhost/test';

  expect(() => validateConfig()).toThrow('JWT_SECRET must be at least 32 characters');
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/config/config.validation.ts (NUEVO)

import { z } from 'zod';

const configSchema = z.object({
  JWT_SECRET: z.string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .describe('Secret for signing JWT access tokens'),

  JWT_REFRESH_SECRET: z.string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters')
    .describe('Secret for signing JWT refresh tokens'),

  MONGO_URI: z.string()
    .url('MONGO_URI must be a valid MongoDB connection string')
    .startsWith('mongodb', 'MONGO_URI must start with mongodb://'),

  ENCRYPTION_KEY: z.string()
    .min(32, 'ENCRYPTION_KEY must be at least 32 characters'),

  ENCRYPTION_SALT: z.string()
    .min(16, 'ENCRYPTION_SALT must be at least 16 characters'),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
});

export type AppConfig = z.infer<typeof configSchema>;

export function validateConfig(): AppConfig {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Configuration validation failed:\n${errors}`);
  }

  return result.data;
}
```

```typescript
// backend/src/main.ts - Agregar al inicio

import { validateConfig } from './config/config.validation';

async function bootstrap() {
  // Validar configuracion ANTES de crear la app
  const config = validateConfig();

  const app = await NestFactory.create(AppModule);
  // ... resto
}
```

---

## 1.3 OAuth State Validation

### FUNCIONALIDAD A IMPLEMENTAR
El parametro `state` de OAuth debe validarse contra un nonce almacenado en sesion, no confiar en el valor enviado por el cliente.

### LISTADO DE TESTS

#### Test 1.3.1: `should_reject_oauth_callback_with_invalid_state`
```typescript
// Archivo: backend/src/modules/auth/github-auth.controller.spec.ts (NUEVO)

describe('GitHub OAuth Callback - State Validation', () => {
  it('should reject oauth callback with invalid state', async () => {
    const invalidState = Buffer.from(JSON.stringify({
      userId: 'victim-id',
      type: 'connect',
      nonce: 'fake-nonce'
    })).toString('base64');

    // El nonce no existe en cache/session
    stateService.validateNonce.mockResolvedValue(false);

    await expect(
      controller.handleCallback('valid-code', invalidState, mockResponse)
    ).rejects.toThrow(UnauthorizedException);
  });
});
```

#### Test 1.3.2: `should_accept_oauth_callback_with_valid_state`
```typescript
it('should accept oauth callback with valid state', async () => {
  const validNonce = 'generated-secure-nonce-123';
  const validState = Buffer.from(JSON.stringify({
    type: 'login',
    nonce: validNonce
  })).toString('base64');

  stateService.validateNonce.mockResolvedValue(true);
  stateService.consumeNonce.mockResolvedValue(true);
  githubService.exchangeCode.mockResolvedValue({ accessToken: 'gh-token' });
  githubService.getUser.mockResolvedValue({ id: 123, login: 'user' });
  authService.loginWithOAuth.mockResolvedValue(mockTokenResponse);

  const result = await controller.handleCallback('valid-code', validState, mockResponse);

  expect(stateService.validateNonce).toHaveBeenCalledWith(validNonce);
  expect(stateService.consumeNonce).toHaveBeenCalledWith(validNonce);
  expect(result).toBeDefined();
});
```

#### Test 1.3.3: `should_prevent_nonce_reuse`
```typescript
it('should prevent nonce reuse (replay attack)', async () => {
  const nonce = 'valid-nonce';
  const state = Buffer.from(JSON.stringify({ type: 'login', nonce })).toString('base64');

  // Primera llamada: nonce valido
  stateService.validateNonce.mockResolvedValueOnce(true);
  stateService.consumeNonce.mockResolvedValueOnce(true);

  await controller.handleCallback('code1', state, mockResponse);

  // Segunda llamada: nonce ya consumido
  stateService.validateNonce.mockResolvedValueOnce(false);

  await expect(
    controller.handleCallback('code2', state, mockResponse)
  ).rejects.toThrow(UnauthorizedException);
});
```

#### Test 1.3.4: `should_reject_connect_flow_without_authenticated_user`
```typescript
it('should reject connect flow without authenticated user session', async () => {
  const state = Buffer.from(JSON.stringify({
    type: 'connect',
    userId: 'some-user-id',
    nonce: 'valid-nonce'
  })).toString('base64');

  stateService.validateNonce.mockResolvedValue(true);
  // No hay sesion activa para validar el userId
  sessionService.validateUserSession.mockResolvedValue(false);

  await expect(
    controller.handleCallback('code', state, mockResponse)
  ).rejects.toThrow(UnauthorizedException);
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/modules/auth/services/oauth-state.service.ts (NUEVO)

import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class OAuthStateService {
  // En produccion usar Redis
  private nonceStore = new Map<string, { createdAt: number; userId?: string }>();
  private readonly NONCE_TTL = 10 * 60 * 1000; // 10 minutos

  generateNonce(userId?: string): string {
    const nonce = randomBytes(32).toString('hex');
    this.nonceStore.set(nonce, {
      createdAt: Date.now(),
      userId
    });
    return nonce;
  }

  async validateNonce(nonce: string): Promise<boolean> {
    const data = this.nonceStore.get(nonce);
    if (!data) return false;

    const isExpired = Date.now() - data.createdAt > this.NONCE_TTL;
    return !isExpired;
  }

  async consumeNonce(nonce: string): Promise<{ userId?: string } | null> {
    const data = this.nonceStore.get(nonce);
    if (!data) return null;

    this.nonceStore.delete(nonce); // Prevenir reuso
    return data;
  }

  generateState(type: 'login' | 'register' | 'connect', userId?: string): string {
    const nonce = this.generateNonce(userId);
    return Buffer.from(JSON.stringify({ type, nonce, userId })).toString('base64');
  }
}
```

---

## 1.4 Autenticacion en Billing/Security Endpoints

### FUNCIONALIDAD A IMPLEMENTAR
Agregar guards de autenticacion y validacion de ownership a todos los endpoints de billing y security.

### LISTADO DE TESTS

#### Test 1.4.1: `billing_getSubscription_should_require_authentication`
```typescript
// Archivo: backend/src/modules/billing/billing.controller.spec.ts

describe('BillingController - Authentication', () => {
  it('should reject unauthenticated request to getSubscription', async () => {
    // Sin token de autenticacion
    const response = await request(app.getHttpServer())
      .get('/api/billing/subscriptions/sub-123')
      .expect(401);

    expect(response.body.message).toContain('Unauthorized');
  });
});
```

#### Test 1.4.2: `billing_getSubscription_should_reject_accessing_other_user_subscription`
```typescript
it('should reject accessing other user subscription', async () => {
  // User A intenta acceder a subscription de User B
  const userAToken = generateToken({ sub: 'user-a' });

  subscriptionService.getSubscription.mockResolvedValue({
    id: 'sub-123',
    userId: 'user-b', // Pertenece a otro usuario
  });

  const response = await request(app.getHttpServer())
    .get('/api/billing/subscriptions/sub-123')
    .set('Authorization', `Bearer ${userAToken}`)
    .expect(403);

  expect(response.body.message).toContain('Access denied');
});
```

#### Test 1.4.3: `security_executeInWorkspace_should_require_authentication`
```typescript
// Archivo: backend/src/modules/security/security.controller.spec.ts

it('should require authentication for executeInWorkspace', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/security/workspaces/ws-123/exec')
    .send({ command: 'ls' })
    .expect(401);
});
```

#### Test 1.4.4: `security_executeInWorkspace_should_validate_workspace_ownership`
```typescript
it('should validate workspace ownership before execution', async () => {
  const userToken = generateToken({ sub: 'user-123' });

  workspaceService.getWorkspace.mockResolvedValue({
    id: 'ws-123',
    userId: 'other-user', // No pertenece al usuario autenticado
  });

  const response = await request(app.getHttpServer())
    .post('/api/security/workspaces/ws-123/exec')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ command: 'ls' })
    .expect(403);
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/common/guards/ownership.guard.ts (NUEVO)

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const OWNERSHIP_KEY = 'ownership';
export const CheckOwnership = (resourceType: string) =>
  SetMetadata(OWNERSHIP_KEY, resourceType);

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
    private workspaceService: WorkspaceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resourceType = this.reflector.get<string>(OWNERSHIP_KEY, context.getHandler());
    if (!resourceType) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    const resourceId = request.params.id;

    let ownerId: string | null = null;

    switch (resourceType) {
      case 'subscription':
        const sub = await this.subscriptionService.getSubscription(resourceId);
        ownerId = sub?.userId;
        break;
      case 'workspace':
        const ws = await this.workspaceService.getWorkspace(resourceId);
        ownerId = ws?.userId;
        break;
    }

    if (ownerId !== userId) {
      throw new ForbiddenException('Access denied: resource belongs to another user');
    }

    return true;
  }
}
```

```typescript
// backend/src/modules/billing/billing.controller.ts - Actualizar

@Controller('billing')
@UseGuards(JwtAuthGuard) // Agregar guard global al controller
export class BillingController {

  @Get('subscriptions/:id')
  @UseGuards(OwnershipGuard)
  @CheckOwnership('subscription')
  async getSubscription(@Param('id') id: string) {
    return this.subscriptionService.getSubscription(id);
  }

  // ... resto de endpoints
}
```

---

## 1.5 Tokens en HttpOnly Cookies (OAuth)

### FUNCIONALIDAD A IMPLEMENTAR
Cambiar el flujo OAuth para enviar tokens via cookies HttpOnly en lugar de query params.

### LISTADO DE TESTS

#### Test 1.5.1: `oauth_callback_should_set_httponly_cookies`
```typescript
// Archivo: backend/src/modules/auth/github-auth.controller.spec.ts

it('should set httponly cookies instead of query params', async () => {
  // Setup mocks para OAuth exitoso
  stateService.validateNonce.mockResolvedValue(true);
  authService.loginWithOAuth.mockResolvedValue({
    accessToken: 'access-123',
    refreshToken: 'refresh-456',
    user: mockUser
  });

  const mockResponse = {
    cookie: jest.fn(),
    redirect: jest.fn(),
  };

  await controller.handleCallback('code', validState, mockResponse);

  // Verificar que se setean cookies HttpOnly
  expect(mockResponse.cookie).toHaveBeenCalledWith(
    'access_token',
    'access-123',
    expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: expect.any(Number)
    })
  );

  expect(mockResponse.cookie).toHaveBeenCalledWith(
    'refresh_token',
    'refresh-456',
    expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/auth/refresh'
    })
  );

  // Verificar que NO hay tokens en la URL
  const redirectCall = mockResponse.redirect.mock.calls[0][0];
  expect(redirectCall).not.toContain('access_token');
  expect(redirectCall).not.toContain('refresh_token');
});
```

#### Test 1.5.2: `oauth_callback_should_redirect_with_success_indicator_only`
```typescript
it('should redirect with success indicator only, no tokens', async () => {
  stateService.validateNonce.mockResolvedValue(true);
  authService.loginWithOAuth.mockResolvedValue(mockTokenResponse);

  const mockResponse = {
    cookie: jest.fn(),
    redirect: jest.fn(),
  };

  await controller.handleCallback('code', validState, mockResponse);

  expect(mockResponse.redirect).toHaveBeenCalledWith(
    expect.stringMatching(/\/oauth\/success\?provider=github$/)
  );
});
```

---

# SPRINT 2: ESTABILIDAD OPERACIONAL

## 2.1 Graceful Shutdown

### FUNCIONALIDAD A IMPLEMENTAR
Implementar manejo de senales SIGTERM/SIGINT para cerrar conexiones limpiamente.

### LISTADO DE TESTS

#### Test 2.1.1: `should_close_http_server_on_SIGTERM`
```typescript
// Archivo: backend/src/shutdown.spec.ts (NUEVO)

describe('Graceful Shutdown', () => {
  it('should close http server on SIGTERM', async () => {
    const app = await createTestApp();
    const shutdownHandler = new GracefulShutdownHandler(app);

    const serverCloseSpy = jest.spyOn(app.getHttpServer(), 'close');

    await shutdownHandler.onApplicationShutdown('SIGTERM');

    expect(serverCloseSpy).toHaveBeenCalled();
  });
});
```

#### Test 2.1.2: `should_close_database_connections_on_shutdown`
```typescript
it('should close database connections on shutdown', async () => {
  const app = await createTestApp();
  const connection = app.get(getConnectionToken());
  const closeSpy = jest.spyOn(connection, 'close');

  await app.close();

  expect(closeSpy).toHaveBeenCalled();
});
```

#### Test 2.1.3: `should_wait_for_inflight_requests_before_shutdown`
```typescript
it('should wait for in-flight requests before shutdown', async () => {
  const app = await createTestApp();

  // Iniciar request lento
  const slowRequestPromise = request(app.getHttpServer())
    .get('/api/slow-endpoint')
    .timeout(5000);

  // Iniciar shutdown mientras request esta en progreso
  const shutdownPromise = app.close();

  // El request deberia completarse
  const response = await slowRequestPromise;
  expect(response.status).toBe(200);

  await shutdownPromise;
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/shutdown.handler.ts (NUEVO)

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class GracefulShutdownHandler implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownHandler.name);
  private isShuttingDown = false;

  constructor(
    @InjectConnection() private connection: Connection,
    private eventsGateway: EventsGateway,
  ) {}

  async onApplicationShutdown(signal?: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.logger.log(`Received ${signal}, starting graceful shutdown...`);

    // 1. Stop accepting new connections
    this.logger.log('Stopping new connections...');

    // 2. Close WebSocket connections
    this.logger.log('Closing WebSocket connections...');
    await this.eventsGateway.closeAllConnections();

    // 3. Wait for in-flight requests (max 30s)
    this.logger.log('Waiting for in-flight requests...');
    await this.waitForInflightRequests(30000);

    // 4. Close database connection
    this.logger.log('Closing database connection...');
    await this.connection.close();

    this.logger.log('Graceful shutdown complete');
  }

  private async waitForInflightRequests(timeout: number): Promise<void> {
    // Implementar tracking de requests activos
    return new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

```typescript
// backend/src/main.ts - Actualizar

async function bootstrap() {
  const config = validateConfig();
  const app = await NestFactory.create(AppModule);

  // Habilitar shutdown hooks
  app.enableShutdownHooks();

  // ... resto de configuracion

  await app.listen(config.PORT);

  // Log startup
  console.log(`Application running on port ${config.PORT}`);
}
```

---

## 2.2 Health Checks

### FUNCIONALIDAD A IMPLEMENTAR
Implementar endpoints `/health/live` y `/health/ready` con verificacion de dependencias.

### LISTADO DE TESTS

#### Test 2.2.1: `liveness_should_return_200_when_process_alive`
```typescript
// Archivo: backend/src/health/health.controller.spec.ts (NUEVO)

describe('HealthController', () => {
  it('liveness should return 200 when process is alive', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});
```

#### Test 2.2.2: `readiness_should_return_200_when_db_connected`
```typescript
it('readiness should return 200 when database is connected', async () => {
  mongooseConnection.readyState = 1; // Connected

  const response = await request(app.getHttpServer())
    .get('/health/ready')
    .expect(200);

  expect(response.body).toEqual({
    status: 'ready',
    checks: {
      database: { status: 'up', responseTime: expect.any(Number) }
    }
  });
});
```

#### Test 2.2.3: `readiness_should_return_503_when_db_disconnected`
```typescript
it('readiness should return 503 when database is disconnected', async () => {
  mongooseConnection.readyState = 0; // Disconnected

  const response = await request(app.getHttpServer())
    .get('/health/ready')
    .expect(503);

  expect(response.body).toEqual({
    status: 'not_ready',
    checks: {
      database: { status: 'down', error: expect.any(String) }
    }
  });
});
```

#### Test 2.2.4: `readiness_should_timeout_slow_db_check`
```typescript
it('readiness should timeout slow database check', async () => {
  // Simular DB lenta
  jest.spyOn(mongooseConnection, 'db', 'get').mockImplementation(() => {
    return new Promise(resolve => setTimeout(resolve, 10000));
  });

  const response = await request(app.getHttpServer())
    .get('/health/ready')
    .expect(503);

  expect(response.body.checks.database.error).toContain('timeout');
}, 6000);
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/health/health.controller.ts (NUEVO)

import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../modules/auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get('live')
  @Public()
  @HttpCode(HttpStatus.OK)
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  async readiness() {
    const checks: Record<string, any> = {};
    let allHealthy = true;

    // Database check with timeout
    try {
      const start = Date.now();
      await Promise.race([
        this.connection.db.admin().ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database check timeout')), 5000)
        )
      ]);
      checks.database = {
        status: 'up',
        responseTime: Date.now() - start
      };
    } catch (error) {
      checks.database = {
        status: 'down',
        error: error.message
      };
      allHealthy = false;
    }

    if (!allHealthy) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks
      });
    }

    return { status: 'ready', checks };
  }
}
```

---

## 2.3 Habilitar CI/CD Pipeline

### FUNCIONALIDAD A IMPLEMENTAR
Reactivar el pipeline de CI/CD con tests bloqueantes y security scanning.

### LISTADO DE TESTS

#### Test 2.3.1: `ci_should_fail_on_test_failure`
```yaml
# .github/workflows/ci.yml - Test case documentado

# Este workflow debe:
# 1. Ejecutar en push a cualquier rama
# 2. Ejecutar en pull requests
# 3. Fallar si algun test falla
# 4. Fallar si hay vulnerabilidades criticas
```

### ARCHIVO DE CONFIGURACION

```yaml
# .github/workflows/ci.yml (ACTUALIZADO)

name: CI Pipeline

on:
  push:
    branches: ['*']
  pull_request:
    branches: [master, Develop]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './backend/package-lock.json'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint
        # SIN || true - debe fallar si hay errores

      - name: Run tests
        run: npm run test -- --coverage --passWithNoTests=false

      - name: Build
        run: npm run build

      - name: Security audit
        run: npm audit --audit-level=high
        # Solo falla en vulnerabilidades high/critical

  frontend-tests:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./vibeia

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './vibeia/package-lock.json'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test -- --coverage

      - name: Build
        run: npm run build

  security-scan:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

---

# SPRINT 3: ESCALABILIDAD DE BASE DE DATOS

## 3.1 Paginacion Obligatoria

### FUNCIONALIDAD A IMPLEMENTAR
Agregar paginacion con limites maximos a todos los endpoints que retornan listas.

### LISTADO DE TESTS

#### Test 3.1.1: `findAll_should_paginate_results`
```typescript
// Archivo: backend/src/modules/users/users.service.spec.ts

describe('UsersService - Pagination', () => {
  it('should paginate results with default limit', async () => {
    const mockUsers = Array(100).fill(null).map((_, i) => ({
      _id: `user-${i}`,
      email: `user${i}@test.com`
    }));

    userModel.find.mockReturnValue({
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockUsers.slice(0, 20))
    });
    userModel.countDocuments.mockResolvedValue(100);

    const result = await service.findAll({});

    expect(result.data).toHaveLength(20);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5
    });
  });
});
```

#### Test 3.1.2: `findAll_should_enforce_max_limit`
```typescript
it('should enforce maximum limit of 100', async () => {
  const result = await service.findAll({ limit: 500 });

  expect(userModel.find().limit).toHaveBeenCalledWith(100);
});
```

#### Test 3.1.3: `findAll_should_return_empty_for_out_of_range_page`
```typescript
it('should return empty array for out of range page', async () => {
  userModel.countDocuments.mockResolvedValue(10);

  const result = await service.findAll({ page: 100, limit: 20 });

  expect(result.data).toHaveLength(0);
  expect(result.pagination.page).toBe(100);
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/common/dto/pagination.dto.ts (NUEVO)

import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

```typescript
// backend/src/modules/users/users.service.ts - Actualizar

async findAll(query: PaginationDto): Promise<PaginatedResult<User>> {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100); // Max 100
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.userModel
      .find()
      .skip(skip)
      .limit(limit)
      .select('-password -refreshToken')
      .lean()
      .exec(),
    this.userModel.countDocuments().exec()
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
```

---

## 3.2 Indices de MongoDB

### FUNCIONALIDAD A IMPLEMENTAR
Agregar indices compuestos para queries frecuentes.

### LISTADO DE TESTS

#### Test 3.2.1: `projects_index_should_exist_on_ownerId_createdAt`
```typescript
// Archivo: backend/src/schemas/project.schema.spec.ts (NUEVO)

describe('Project Schema Indexes', () => {
  it('should have compound index on ownerId and createdAt', async () => {
    const indexes = await projectModel.collection.indexes();

    const ownerIdIndex = indexes.find(idx =>
      idx.key.ownerId === 1 && idx.key.createdAt === -1
    );

    expect(ownerIdIndex).toBeDefined();
  });
});
```

#### Test 3.2.2: `plans_index_should_exist_on_projectId_status`
```typescript
it('should have compound index on projectId and status', async () => {
  const indexes = await planModel.collection.indexes();

  const projectStatusIndex = indexes.find(idx =>
    idx.key.projectId === 1 && idx.key.status === 1
  );

  expect(projectStatusIndex).toBeDefined();
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/schemas/project.schema.ts - Agregar indices

@Schema({ timestamps: true })
export class Project {
  // ... campos existentes
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Indices compuestos
ProjectSchema.index({ ownerId: 1, createdAt: -1 });
ProjectSchema.index({ status: 1, createdAt: -1 });
ProjectSchema.index({ teamId: 1, status: 1 });
```

```typescript
// backend/src/schemas/plan.schema.ts - Agregar indices

PlanSchema.index({ projectId: 1, status: 1 });
PlanSchema.index({ userId: 1, createdAt: -1 });
PlanSchema.index({ status: 1, createdAt: -1 });
```

---

## 3.3 Corregir N+1 Queries

### FUNCIONALIDAD A IMPLEMENTAR
Reemplazar loops con queries individuales por aggregation pipelines con $lookup.

### LISTADO DE TESTS

#### Test 3.3.1: `searchMembers_should_use_single_aggregation`
```typescript
// Archivo: backend/src/modules/teams/members.service.spec.ts

describe('MembersService - N+1 Prevention', () => {
  it('should fetch members with users in single aggregation', async () => {
    const teamId = 'team-123';

    // Spy en el modelo
    const aggregateSpy = jest.spyOn(memberModel, 'aggregate');

    await service.searchMembers(teamId, 'john');

    // Debe usar aggregation, no loops
    expect(aggregateSpy).toHaveBeenCalledTimes(1);
    expect(aggregateSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ $match: { teamId } }),
        expect.objectContaining({ $lookup: expect.any(Object) })
      ])
    );
  });
});
```

#### Test 3.3.2: `searchMembers_should_not_make_N_queries`
```typescript
it('should not make N separate queries for N members', async () => {
  const teamId = 'team-123';
  const userFindByIdSpy = jest.spyOn(userModel, 'findById');

  // Team con 50 miembros
  await service.searchMembers(teamId, '');

  // No debe llamar findById para cada miembro
  expect(userFindByIdSpy).not.toHaveBeenCalled();
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/modules/teams/members.service.ts - Refactorizar

async searchMembers(teamId: string, query: string): Promise<MemberWithUser[]> {
  const pipeline = [
    { $match: { teamId } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $match: query ? {
        $or: [
          { 'user.name': { $regex: query, $options: 'i' } },
          { 'user.email': { $regex: query, $options: 'i' } }
        ]
      } : {}
    },
    {
      $project: {
        _id: 1,
        role: 1,
        joinedAt: 1,
        user: {
          id: '$user._id',
          name: '$user.name',
          email: '$user.email',
          avatarUrl: '$user.avatarUrl'
        }
      }
    }
  ];

  return this.memberModel.aggregate(pipeline).exec();
}
```

---

# SPRINT 4: CALIDAD DE CODIGO

## 4.1 Eliminar `any` Types

### FUNCIONALIDAD A IMPLEMENTAR
Reemplazar todos los usos de `any` con tipos especificos.

### LISTADO DE TESTS

#### Test 4.1.1: `generatePlan_should_accept_typed_wizardData`
```typescript
// Archivo: backend/src/modules/plans/plans.service.spec.ts

describe('PlansService - Type Safety', () => {
  it('should accept properly typed wizardData', async () => {
    const wizardData: WizardData = {
      stage1: {
        projectName: 'Test Project',
        description: 'A test project'
      },
      stage2: {
        targetUsers: 'developers',
        mainFeatures: 'authentication, dashboard'
      },
      stage3: {
        selectedArchetypes: ['web-app'],
        technicalRequirements: 'Node.js, React'
      }
    };

    llmService.generatePlan.mockResolvedValue(mockPlanResponse);

    // No debe dar error de tipos
    const result = await service.generatePlan(wizardData, userConfig);

    expect(result).toBeDefined();
  });
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/modules/plans/types/wizard-data.types.ts (NUEVO)

export interface Stage1Data {
  projectName: string;
  description: string;
}

export interface Stage2Data {
  [questionId: string]: string;
}

export interface Stage3Data {
  selectedArchetypes: string[];
  technicalRequirements?: string;
  infrastructurePreferences?: {
    database?: string;
    hosting?: string;
  };
}

export interface WizardData {
  stage1: Stage1Data;
  stage2: Stage2Data;
  stage3: Stage3Data;
}

export interface GeneratePlanRequest {
  wizardData: WizardData;
  projectId?: string;
  userConfig: UserLLMConfig;
}
```

---

## 4.2 Try/Catch en JSON.parse

### FUNCIONALIDAD A IMPLEMENTAR
Envolver todos los JSON.parse con manejo de errores apropiado.

### LISTADO DE TESTS

#### Test 4.2.1: `generatePlan_should_handle_invalid_LLM_json_response`
```typescript
// Archivo: backend/src/modules/llm/providers/anthropic.provider.spec.ts

describe('AnthropicProvider - Error Handling', () => {
  it('should handle invalid JSON response from LLM', async () => {
    anthropicClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'This is not valid JSON {{{' }]
    });

    await expect(
      provider.generatePlan(wizardData, { apiKey: 'test' })
    ).rejects.toThrow(LLMResponseParseError);
  });
});
```

#### Test 4.2.2: `generatePlan_should_include_raw_response_in_error`
```typescript
it('should include raw response in parse error for debugging', async () => {
  const invalidResponse = 'Not JSON at all';
  anthropicClient.messages.create.mockResolvedValue({
    content: [{ type: 'text', text: invalidResponse }]
  });

  try {
    await provider.generatePlan(wizardData, { apiKey: 'test' });
    fail('Should have thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(LLMResponseParseError);
    expect(error.rawResponse).toBe(invalidResponse);
    expect(error.message).toContain('Failed to parse LLM response');
  }
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/modules/llm/errors/llm-errors.ts (NUEVO)

export class LLMResponseParseError extends Error {
  constructor(
    message: string,
    public readonly rawResponse: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'LLMResponseParseError';
  }
}

export function safeParseJSON<T>(json: string, context: string): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new LLMResponseParseError(
      `Failed to parse LLM response as JSON in ${context}`,
      json.substring(0, 500), // Truncar para logs
      error instanceof Error ? error : undefined
    );
  }
}
```

```typescript
// backend/src/modules/llm/providers/anthropic.provider.ts - Actualizar

async generatePlan(wizardData: WizardData, options: LLMOptions): Promise<PlanResponse> {
  const response = await this.client.messages.create({...});

  const content = response.content[0];
  const planText = content.type === 'text' ? content.text : '';

  // Usar safe parser
  const plan = safeParseJSON<PlanResponse>(planText, 'Anthropic.generatePlan');

  return plan;
}
```

---

## 4.3 Structured Logging

### FUNCIONALIDAD A IMPLEMENTAR
Reemplazar console.log con Winston/Pino structured logging.

### LISTADO DE TESTS

#### Test 4.3.1: `logger_should_output_json_in_production`
```typescript
// Archivo: backend/src/common/logger/logger.service.spec.ts (NUEVO)

describe('LoggerService', () => {
  it('should output JSON format in production', () => {
    process.env.NODE_ENV = 'production';
    const logger = new AppLogger('TestContext');

    const logSpy = jest.spyOn(process.stdout, 'write');

    logger.log('Test message', { userId: '123' });

    const output = logSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed).toMatchObject({
      level: 'info',
      message: 'Test message',
      context: 'TestContext',
      metadata: { userId: '123' },
      timestamp: expect.any(String)
    });
  });
});
```

#### Test 4.3.2: `logger_should_include_correlation_id`
```typescript
it('should include correlation ID when available', () => {
  const logger = new AppLogger('TestContext');
  const correlationId = 'req-123-456';

  AsyncLocalStorage.getStore.mockReturnValue({ correlationId });

  const logSpy = jest.spyOn(process.stdout, 'write');
  logger.log('Test message');

  const output = JSON.parse(logSpy.mock.calls[0][0]);
  expect(output.correlationId).toBe(correlationId);
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/common/logger/app-logger.ts (NUEVO)

import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class AppLogger implements LoggerService {
  private logger: winston.Logger;

  constructor(private context?: string) {
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: isProduction
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
      defaultMeta: { context: this.context },
      transports: [
        new winston.transports.Console()
      ]
    });
  }

  log(message: string, metadata?: Record<string, any>) {
    this.logger.info(message, {
      ...metadata,
      correlationId: this.getCorrelationId()
    });
  }

  error(message: string, trace?: string, metadata?: Record<string, any>) {
    this.logger.error(message, {
      ...metadata,
      trace,
      correlationId: this.getCorrelationId()
    });
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.logger.warn(message, {
      ...metadata,
      correlationId: this.getCorrelationId()
    });
  }

  private getCorrelationId(): string | undefined {
    // Obtener de AsyncLocalStorage
    return undefined; // TODO: Implementar
  }
}
```

---

# SPRINT 5: FRONTEND SECURITY & PERFORMANCE

## 5.1 Mover Tokens a HttpOnly Cookies

### FUNCIONALIDAD A IMPLEMENTAR
Reemplazar localStorage con cookies HttpOnly para tokens.

### LISTADO DE TESTS

#### Test 5.1.1: `AuthContext_should_not_store_tokens_in_localStorage`
```typescript
// Archivo: vibeia/src/contexts/__tests__/AuthContext.security.test.tsx (NUEVO)

describe('AuthContext - Security', () => {
  it('should not store tokens in localStorage', async () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Simular login exitoso
    await act(async () => {
      // El login deberia setear cookies, no localStorage
    });

    // Verificar que no se guardo ningun token en localStorage
    const tokenCalls = localStorageSpy.mock.calls.filter(
      call => call[0].includes('token')
    );

    expect(tokenCalls).toHaveLength(0);
  });
});
```

#### Test 5.1.2: `api_client_should_send_credentials_with_requests`
```typescript
// Archivo: vibeia/src/lib/__tests__/api-client.security.test.ts (NUEVO)

describe('API Client - Credentials', () => {
  it('should include credentials in all requests', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    await apiClient.get('/api/test');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        credentials: 'include'
      })
    );
  });
});
```

---

## 5.2 Memoizacion de Componentes

### FUNCIONALIDAD A IMPLEMENTAR
Agregar React.memo y useCallback a componentes costosos.

### LISTADO DE TESTS

#### Test 5.2.1: `ProjectCard_should_not_rerender_when_sibling_changes`
```typescript
// Archivo: vibeia/src/components/dashboard/__tests__/ProjectCard.performance.test.tsx (NUEVO)

describe('ProjectCard - Performance', () => {
  it('should not re-render when sibling project changes', () => {
    const renderCount = { card1: 0, card2: 0 };

    const TrackedCard1 = () => {
      renderCount.card1++;
      return <ProjectCard project={project1} />;
    };

    const TrackedCard2 = () => {
      renderCount.card2++;
      return <ProjectCard project={project2} />;
    };

    const { rerender } = render(
      <ProjectList>
        <TrackedCard1 />
        <TrackedCard2 />
      </ProjectList>
    );

    // Cambiar solo project1
    const updatedProject1 = { ...project1, name: 'Updated' };
    rerender(
      <ProjectList>
        <TrackedCard1 project={updatedProject1} />
        <TrackedCard2 />
      </ProjectList>
    );

    expect(renderCount.card1).toBe(2); // Re-rendered
    expect(renderCount.card2).toBe(1); // No re-render
  });
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// vibeia/src/components/dashboard/ProjectCard.tsx - Actualizar

import { memo, useCallback } from 'react';

interface ProjectCardProps {
  project: Project;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const ProjectCard = memo(function ProjectCard({
  project,
  onEdit,
  onDelete
}: ProjectCardProps) {
  const handleEdit = useCallback(() => {
    onEdit?.(project.id);
  }, [project.id, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete?.(project.id);
  }, [project.id, onDelete]);

  // ... resto del componente
});

// Agregar comparador personalizado si es necesario
ProjectCard.displayName = 'ProjectCard';
```

---

## 5.3 Implementar React Query

### FUNCIONALIDAD A IMPLEMENTAR
Reemplazar fetching manual con React Query para cache y revalidacion.

### LISTADO DE TESTS

#### Test 5.3.1: `useProjects_should_cache_results`
```typescript
// Archivo: vibeia/src/hooks/__tests__/useProjects.test.tsx (NUEVO)

describe('useProjects - Caching', () => {
  it('should return cached data on subsequent calls', async () => {
    const fetchSpy = jest.spyOn(projectsApi, 'getAll');

    const { result: result1 } = renderHook(() => useProjects(), {
      wrapper: QueryClientProvider
    });

    await waitFor(() => expect(result1.current.isSuccess).toBe(true));

    // Segunda llamada
    const { result: result2 } = renderHook(() => useProjects(), {
      wrapper: QueryClientProvider
    });

    // Debe retornar datos cacheados inmediatamente
    expect(result2.current.data).toEqual(result1.current.data);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Solo una llamada
  });
});
```

#### Test 5.3.2: `useProjects_should_refetch_on_mutation`
```typescript
it('should refetch after mutation', async () => {
  const { result } = renderHook(
    () => ({
      projects: useProjects(),
      createProject: useCreateProject()
    }),
    { wrapper: QueryClientProvider }
  );

  await waitFor(() => expect(result.current.projects.isSuccess).toBe(true));
  const initialLength = result.current.projects.data.length;

  // Crear nuevo proyecto
  await act(async () => {
    await result.current.createProject.mutateAsync({ name: 'New Project' });
  });

  // Lista debe actualizarse
  await waitFor(() => {
    expect(result.current.projects.data.length).toBe(initialLength + 1);
  });
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// vibeia/src/hooks/useProjects.ts (NUEVO)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api-client';

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => projectsApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}
```

---

# SPRINT 6: OBSERVABILIDAD & CI/CD

## 6.1 Metricas con Prometheus

### FUNCIONALIDAD A IMPLEMENTAR
Agregar metricas de aplicacion expuestas en `/metrics`.

### LISTADO DE TESTS

#### Test 6.1.1: `metrics_endpoint_should_expose_http_request_duration`
```typescript
// Archivo: backend/src/metrics/metrics.controller.spec.ts (NUEVO)

describe('Metrics', () => {
  it('should expose http_request_duration_seconds metric', async () => {
    // Hacer algunas requests
    await request(app.getHttpServer()).get('/api/health/live');
    await request(app.getHttpServer()).get('/api/health/live');

    const response = await request(app.getHttpServer())
      .get('/metrics')
      .expect(200);

    expect(response.text).toContain('http_request_duration_seconds');
    expect(response.text).toContain('method="GET"');
    expect(response.text).toContain('path="/api/health/live"');
  });
});
```

#### Test 6.1.2: `metrics_should_track_active_connections`
```typescript
it('should track active websocket connections', async () => {
  // Conectar cliente WebSocket
  const client = io('http://localhost:3001/execution');
  await waitForConnect(client);

  const response = await request(app.getHttpServer()).get('/metrics');

  expect(response.text).toContain('websocket_connections_active 1');

  client.disconnect();
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/metrics/metrics.module.ts (NUEVO)

import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultLabels: {
        app: 'vibeia',
        env: process.env.NODE_ENV || 'development'
      }
    })
  ],
  controllers: [MetricsController],
  providers: [HttpMetricsInterceptor],
  exports: [HttpMetricsInterceptor]
})
export class MetricsModule {}
```

```typescript
// backend/src/metrics/http-metrics.interceptor.ts (NUEVO)

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram, Counter } from 'prom-client';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly httpDuration: Histogram<string>,
    @InjectMetric('http_requests_total')
    private readonly httpTotal: Counter<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, path } = req;
    const end = this.httpDuration.startTimer({ method, path });

    return next.handle().pipe(
      tap({
        next: () => {
          end({ status: 'success' });
          this.httpTotal.inc({ method, path, status: 'success' });
        },
        error: () => {
          end({ status: 'error' });
          this.httpTotal.inc({ method, path, status: 'error' });
        }
      })
    );
  }
}
```

---

## 6.2 Correlation IDs

### FUNCIONALIDAD A IMPLEMENTAR
Agregar correlation IDs a todas las requests para trazabilidad.

### LISTADO DE TESTS

#### Test 6.2.1: `should_generate_correlation_id_for_requests`
```typescript
// Archivo: backend/src/common/middleware/correlation-id.middleware.spec.ts (NUEVO)

describe('CorrelationIdMiddleware', () => {
  it('should generate correlation ID for requests without one', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health/live')
      .expect(200);

    expect(response.headers['x-correlation-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
```

#### Test 6.2.2: `should_preserve_incoming_correlation_id`
```typescript
it('should preserve incoming correlation ID', async () => {
  const incomingId = 'client-generated-id-123';

  const response = await request(app.getHttpServer())
    .get('/api/health/live')
    .set('X-Correlation-ID', incomingId)
    .expect(200);

  expect(response.headers['x-correlation-id']).toBe(incomingId);
});
```

### IMPLEMENTACION REQUERIDA

```typescript
// backend/src/common/middleware/correlation-id.middleware.ts (NUEVO)

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export const correlationStorage = new AsyncLocalStorage<{ correlationId: string }>();

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

    res.setHeader('X-Correlation-ID', correlationId);

    correlationStorage.run({ correlationId }, () => {
      next();
    });
  }
}
```

---

# CRITERIOS DE FINALIZACION

## Por Sprint

### Sprint 1: Seguridad Critica
- [ ] 18 tests implementados y pasando
- [ ] IDOR en refresh token corregido
- [ ] Secrets hardcodeados eliminados
- [ ] OAuth state validado con nonces
- [ ] Billing/Security endpoints protegidos
- [ ] Tokens en HttpOnly cookies

### Sprint 2: Estabilidad Operacional
- [ ] 12 tests implementados y pasando
- [ ] Graceful shutdown implementado
- [ ] Health checks funcionando
- [ ] CI/CD pipeline activo

### Sprint 3: Escalabilidad DB
- [ ] 14 tests implementados y pasando
- [ ] Paginacion en todos los endpoints de lista
- [ ] Indices MongoDB creados
- [ ] N+1 queries corregidos

### Sprint 4: Calidad de Codigo
- [ ] 16 tests implementados y pasando
- [ ] `any` types eliminados
- [ ] JSON.parse con try/catch
- [ ] Structured logging implementado

### Sprint 5: Frontend Security & Performance
- [ ] 15 tests implementados y pasando
- [ ] Tokens en cookies, no localStorage
- [ ] Componentes memoizados
- [ ] React Query implementado

### Sprint 6: Observabilidad
- [ ] 10 tests implementados y pasando
- [ ] Metricas Prometheus expuestas
- [ ] Correlation IDs en requests
- [ ] Dashboard de metricas basico

---

## Comandos de Ejecucion

```bash
# Backend tests
cd backend && npm test -- --watch --coverage

# Frontend tests
cd vibeia && npm test -- --watch --coverage

# Run specific test file
npm test -- --testPathPattern="auth.service.spec.ts"

# Run tests matching pattern
npm test -- --testNamePattern="IDOR"
```

---

## Notas Finales

1. **Cada test debe ejecutarse en aislamiento** - usar `beforeEach` para setup
2. **Mocks deben resetearse** - usar `jest.clearAllMocks()` en `afterEach`
3. **Commits atomicos** - un commit por cada ciclo Red-Green-Refactor completado
4. **Code review** - cada PR debe pasar CI antes de merge

---

*Documento generado el 2024 - Plan de Accion TDD para VibeIA*
*Total estimado: 85+ tests, 6 semanas*
