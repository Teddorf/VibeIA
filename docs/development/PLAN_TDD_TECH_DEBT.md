# Plan TDD: Technical Debt & Refactoring

> **Fecha**: 2025-12-17
> **Tech Debt Score Actual**: 68/100
> **Target**: 80/100

## 📊 Progreso de Implementación

| Fase | Estado | Tests | Archivos Modificados |
|------|--------|-------|---------------------|
| **1.1** Extract OAuth Token Helper | ✅ DONE | 30 pass | `users.service.ts`, `users.service.spec.ts` |
| **1.2** Extract Magic Numbers | ✅ DONE | 46 pass | `auth.constants.ts`, `auth.module.ts`, `auth.service.ts`, `encryption.service.ts` |
| **1.3** Remove Console.logs | ✅ DONE | 64 pass | `users.service.ts`, `encryption.service.ts`, `llm.service.ts`, `plans.service.ts` |
| **2.1** @RequireAuth decorator | ✅ DONE | 8 pass | `require-auth.decorator.ts`, `require-auth.decorator.spec.ts` |
| **2.2** @RequirePermission decorator | ✅ DONE | 15 pass | `require-permission.decorator.ts`, `require-permission.decorator.spec.ts` |
| **3.1** API Factory (Frontend) | ✅ DONE | 15 pass | `api-factory.ts`, `api-factory.test.ts` |
| **4.1** Install mongodb-memory-server | ✅ DONE | - | `package.json` |
| **4.2** Create integration utilities | ✅ DONE | 8 pass | `integration-test.utils.ts`, `integration-test.utils.spec.ts` |
| **4.3** Enable skipped tests | ✅ DONE | 20 pass | `credential-manager.service.integration.spec.ts` |
| **4.4** WorkspaceService integration | ✅ DONE | 32 pass | `workspace.service.integration.spec.ts` |
| **4.5** SetupOrchestrator integration | ✅ DONE | 14 pass | `setup-orchestrator.service.integration.spec.ts` |

### Resultado Final
- **Backend Tests**: 625 passed, 44 skipped (integration tests created as separate files)
- **Frontend Tests**: 83+ passed
- **New Files Created**: 9
- **Files Modified**: 12
- **Integration Tests Total**: 66 (CredentialManager: 20, Workspace: 32, SetupOrchestrator: 14)

## Resumen Ejecutivo

Este plan sigue el enfoque **RED → GREEN → REFACTOR** para resolver la deuda técnica identificada sin romper funcionalidad existente.

---

## Fase 1: Quick Wins (SAFE) - 6 horas

### 1.1 Extract OAuth Token Decryption Helper

**Archivo**: `backend/src/modules/users/users.service.ts`
**Impacto**: -40 líneas de código duplicado

#### Step 1: RED - Escribir tests primero

```typescript
// backend/src/modules/users/users.service.spec.ts

describe('UsersService - OAuth Token Decryption', () => {
  describe('getDecryptedOAuthToken (private helper)', () => {
    it('should return null when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await service.getGitHubAccessToken('non-existent-user');

      expect(result).toBeNull();
    });

    it('should return null when token field is empty', async () => {
      mockUserModel.findById.mockResolvedValue({ githubAccessToken: null });

      const result = await service.getGitHubAccessToken('user-1');

      expect(result).toBeNull();
    });

    it('should decrypt token successfully', async () => {
      const encryptedToken = 'encrypted:iv:authTag';
      mockUserModel.findById.mockResolvedValue({ githubAccessToken: encryptedToken });
      mockEncryptionService.decrypt.mockReturnValue('decrypted-token');

      const result = await service.getGitHubAccessToken('user-1');

      expect(result).toBe('decrypted-token');
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(encryptedToken);
    });

    it('should return raw token when decryption fails and format is legacy', async () => {
      const legacyToken = 'raw-legacy-token';
      mockUserModel.findById.mockResolvedValue({ githubAccessToken: legacyToken });
      mockEncryptionService.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = await service.getGitHubAccessToken('user-1');

      expect(result).toBe(legacyToken);
    });

    it('should return null when decryption fails and format is encrypted', async () => {
      const encryptedToken = 'part1:part2:part3'; // 3 parts = encrypted format
      mockUserModel.findById.mockResolvedValue({ githubAccessToken: encryptedToken });
      mockEncryptionService.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = await service.getGitHubAccessToken('user-1');

      expect(result).toBeNull();
    });
  });

  describe('OAuth providers use shared helper', () => {
    it('getGitHubAccessToken should use helper', async () => {
      mockUserModel.findById.mockResolvedValue({ githubAccessToken: 'token' });
      mockEncryptionService.decrypt.mockReturnValue('decrypted');

      const result = await service.getGitHubAccessToken('user-1');

      expect(result).toBe('decrypted');
    });

    it('getGoogleAccessToken should use helper', async () => {
      mockUserModel.findById.mockResolvedValue({ googleAccessToken: 'token' });
      mockEncryptionService.decrypt.mockReturnValue('decrypted');

      const result = await service.getGoogleAccessToken('user-1');

      expect(result).toBe('decrypted');
    });

    it('getGitLabAccessToken should use helper', async () => {
      mockUserModel.findById.mockResolvedValue({ gitlabAccessToken: 'token' });
      mockEncryptionService.decrypt.mockReturnValue('decrypted');

      const result = await service.getGitLabAccessToken('user-1');

      expect(result).toBe('decrypted');
    });
  });
});
```

#### Step 2: GREEN - Implementar helper

```typescript
// users.service.ts

private async getDecryptedOAuthToken(
  userId: string,
  tokenField: 'githubAccessToken' | 'googleAccessToken' | 'gitlabAccessToken',
  provider: string,
): Promise<string | null> {
  const user = await this.userModel.findById(userId);
  const token = user?.[tokenField];
  if (!token) return null;

  try {
    return this.encryptionService.decrypt(token);
  } catch (error) {
    // Legacy tokens may not be encrypted
    if (token.split(':').length === 3) {
      this.logger.error(`Failed to decrypt ${provider} token for user ${userId}`, error);
      return null;
    }
    return token;
  }
}

async getGitHubAccessToken(userId: string): Promise<string | null> {
  return this.getDecryptedOAuthToken(userId, 'githubAccessToken', 'GitHub');
}

async getGoogleAccessToken(userId: string): Promise<string | null> {
  return this.getDecryptedOAuthToken(userId, 'googleAccessToken', 'Google');
}

async getGitLabAccessToken(userId: string): Promise<string | null> {
  return this.getDecryptedOAuthToken(userId, 'gitlabAccessToken', 'GitLab');
}
```

#### Step 3: REFACTOR - Cleanup

- Eliminar código duplicado original (líneas 527-549, 621-635, 707-721)
- Verificar que tests pasen: `npm test -- --testPathPatterns="users.service"`

---

### 1.2 Extract Magic Numbers to Constants

**Archivos**: Múltiples
**Impacto**: Mejor mantenibilidad

#### Step 1: RED - Tests para constantes

```typescript
// backend/src/config/security.constants.spec.ts

import { SECURITY_CONFIG, LLM_CONFIG, SETUP_CONFIG } from './constants';

describe('Security Constants', () => {
  it('should have valid bcrypt salt rounds', () => {
    expect(SECURITY_CONFIG.BCRYPT_SALT_ROUNDS).toBeGreaterThanOrEqual(10);
    expect(SECURITY_CONFIG.BCRYPT_SALT_ROUNDS).toBeLessThanOrEqual(14);
  });

  it('should have valid password reset expiry', () => {
    expect(SECURITY_CONFIG.PASSWORD_RESET_EXPIRY_MS).toBe(3600000); // 1 hour
  });

  it('should have valid API key minimum length', () => {
    expect(SECURITY_CONFIG.MIN_API_KEY_LENGTH).toBeGreaterThanOrEqual(10);
  });
});

describe('LLM Constants', () => {
  it('should have valid providers list', () => {
    expect(LLM_CONFIG.VALID_PROVIDERS).toContain('anthropic');
    expect(LLM_CONFIG.VALID_PROVIDERS).toContain('openai');
    expect(LLM_CONFIG.VALID_PROVIDERS).toContain('gemini');
  });
});

describe('Setup Constants', () => {
  it('should have valid setup durations', () => {
    expect(SETUP_CONFIG.NEON_SETUP_DURATION_SEC).toBeGreaterThan(0);
    expect(SETUP_CONFIG.VERCEL_SETUP_DURATION_SEC).toBeGreaterThan(0);
  });
});
```

#### Step 2: GREEN - Crear archivo de constantes

```typescript
// backend/src/config/constants.ts

export const SECURITY_CONFIG = {
  BCRYPT_SALT_ROUNDS: 10,
  PASSWORD_RESET_EXPIRY_MS: 3600000, // 1 hour
  MIN_API_KEY_LENGTH: 10,
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '7d',
} as const;

export const LLM_CONFIG = {
  VALID_PROVIDERS: ['anthropic', 'openai', 'gemini'] as const,
  DEFAULT_FALLBACK_ORDER: ['anthropic', 'gemini', 'openai'] as const,
  DEFAULT_MAX_TOKENS: 4096,
} as const;

export const SETUP_CONFIG = {
  NEON_SETUP_DURATION_SEC: 120,
  VERCEL_SETUP_DURATION_SEC: 60,
  RAILWAY_SETUP_DURATION_SEC: 90,
} as const;

export const API_CONFIG = {
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE_MS: 1000,
} as const;
```

#### Step 3: REFACTOR - Reemplazar magic numbers

```typescript
// users.service.ts - ANTES
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// users.service.ts - DESPUÉS
import { SECURITY_CONFIG } from '../../config/constants';
const hashedPassword = await bcrypt.hash(password, SECURITY_CONFIG.BCRYPT_SALT_ROUNDS);
```

---

### 1.3 Remove Console.log Statements

**Archivos**: 7 archivos con 22 ocurrencias
**Impacto**: Código más limpio

#### Step 1: RED - Tests para logging

```typescript
// Verificar que Logger de NestJS se usa correctamente
describe('Service Logging', () => {
  it('should use NestJS Logger instead of console.log', () => {
    // Mock logger
    const loggerSpy = jest.spyOn(service['logger'], 'log');

    await service.someMethod();

    expect(loggerSpy).toHaveBeenCalled();
  });
});
```

#### Step 2: GREEN - Reemplazar console.log

```bash
# Buscar y reemplazar
grep -rn "console.log" backend/src --include="*.ts" | grep -v "spec.ts" | grep -v "node_modules"
```

```typescript
// ANTES
console.log(`Starting execution for plan ${planId}`);

// DESPUÉS
this.logger.log(`Starting execution for plan ${planId}`);
```

#### Step 3: REFACTOR - Verificar

```bash
npm test -- --no-coverage
```

---

## Fase 2: Decoradores de Auth (LOW RISK) - 5 horas

### 2.1 Create @RequireAuth() Decorator

**Archivo**: `backend/src/common/decorators/require-auth.decorator.ts`

#### Step 1: RED - Tests para decorator

```typescript
// backend/src/common/decorators/require-auth.decorator.spec.ts

import { RequireAuth } from './require-auth.decorator';
import { UnauthorizedException } from '@nestjs/common';

describe('RequireAuth Decorator', () => {
  let mockExecutionContext: any;
  let mockGuard: any;

  beforeEach(() => {
    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: null }),
      }),
    };
  });

  it('should throw UnauthorizedException when userId is null', async () => {
    const guard = new RequireAuthGuard();

    await expect(guard.canActivate(mockExecutionContext))
      .rejects.toThrow(UnauthorizedException);
  });

  it('should allow access when userId is present', async () => {
    mockExecutionContext.switchToHttp = () => ({
      getRequest: () => ({ user: { userId: 'user-123' } }),
    });

    const guard = new RequireAuthGuard();
    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it('should set user on request when valid', async () => {
    const request = { user: { userId: 'user-123' } };
    mockExecutionContext.switchToHttp = () => ({
      getRequest: () => request,
    });

    const guard = new RequireAuthGuard();
    await guard.canActivate(mockExecutionContext);

    expect(request.user.userId).toBe('user-123');
  });
});
```

#### Step 2: GREEN - Implementar decorator

```typescript
// backend/src/common/decorators/require-auth.decorator.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  applyDecorators,
  UseGuards,
} from '@nestjs/common';

@Injectable()
export class RequireAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    return true;
  }
}

export function RequireAuth() {
  return applyDecorators(UseGuards(RequireAuthGuard));
}
```

#### Step 3: REFACTOR - Aplicar en TeamsController

```typescript
// teams.controller.ts - ANTES
@Post()
async createTeam(
  @CurrentUser('userId') userId: string,
  @Body() dto: CreateTeamDto,
) {
  if (!userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return this.teamsService.createTeam(userId, dto);
}

// teams.controller.ts - DESPUÉS
@Post()
@RequireAuth()
async createTeam(
  @CurrentUser('userId') userId: string,
  @Body() dto: CreateTeamDto,
) {
  return this.teamsService.createTeam(userId, dto);
}
```

---

### 2.2 Create @RequirePermission() Decorator

**Archivo**: `backend/src/common/decorators/require-permission.decorator.ts`

#### Step 1: RED - Tests

```typescript
// backend/src/common/decorators/require-permission.decorator.spec.ts

describe('RequirePermission Decorator', () => {
  let membersService: MembersService;
  let guard: RequirePermissionGuard;

  beforeEach(() => {
    membersService = {
      hasPermission: jest.fn(),
    } as any;

    guard = new RequirePermissionGuard(membersService, Reflector);
  });

  it('should deny access when user lacks permission', async () => {
    membersService.hasPermission.mockResolvedValue(false);

    await expect(guard.canActivate(mockContext))
      .rejects.toThrow(ForbiddenException);
  });

  it('should allow access when user has permission', async () => {
    membersService.hasPermission.mockResolvedValue(true);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
  });

  it('should extract teamId from route params', async () => {
    membersService.hasPermission.mockResolvedValue(true);

    await guard.canActivate(mockContext);

    expect(membersService.hasPermission).toHaveBeenCalledWith(
      'team-123',  // from params
      'user-456',  // from user
      Permission.TEAM_INVITE,
    );
  });
});
```

#### Step 2: GREEN - Implementar

```typescript
// backend/src/common/decorators/require-permission.decorator.ts

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  applyDecorators,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembersService } from '../../modules/teams/members.service';
import { Permission } from '../../modules/teams/dto/teams.dto';

export const PERMISSION_KEY = 'required_permission';
export const TEAM_PARAM_KEY = 'team_param_key';

@Injectable()
export class RequirePermissionGuard implements CanActivate {
  constructor(
    private readonly membersService: MembersService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<Permission>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    const teamParamKey = this.reflector.get<string>(
      TEAM_PARAM_KEY,
      context.getHandler(),
    ) || 'teamId';

    if (!permission) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const teamId = request.params[teamParamKey];

    if (!userId || !teamId) {
      throw new ForbiddenException('Missing required parameters');
    }

    const hasPermission = await this.membersService.hasPermission(
      teamId,
      userId,
      permission,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }
}

export function RequirePermission(permission: Permission, teamParam = 'teamId') {
  return applyDecorators(
    SetMetadata(PERMISSION_KEY, permission),
    SetMetadata(TEAM_PARAM_KEY, teamParam),
    UseGuards(RequirePermissionGuard),
  );
}
```

#### Step 3: REFACTOR - Aplicar en TeamsController

```typescript
// teams.controller.ts - ANTES
@Post(':teamId/members')
async addMember(
  @Param('teamId') teamId: string,
  @CurrentUser('userId') userId: string,
  @Body() body: AddMemberDto,
) {
  if (!userId) {
    throw new UnauthorizedException('Authentication required');
  }
  const hasPermission = await this.membersService.hasPermission(
    teamId,
    userId,
    Permission.TEAM_INVITE,
  );
  if (!hasPermission) {
    return { error: 'Permission denied' };
  }
  return this.teamsService.addMember(teamId, body);
}

// teams.controller.ts - DESPUÉS
@Post(':teamId/members')
@RequireAuth()
@RequirePermission(Permission.TEAM_INVITE)
async addMember(
  @Param('teamId') teamId: string,
  @CurrentUser('userId') userId: string,
  @Body() body: AddMemberDto,
) {
  return this.teamsService.addMember(teamId, body);
}
```

---

## Fase 3: API Client Factory (MEDIUM RISK) - 4 horas

### 3.1 Create API Factory Function

**Archivo**: `vibeia/src/lib/api-client.ts`

#### Step 1: RED - Tests para factory

```typescript
// vibeia/src/lib/__tests__/api-factory.test.ts

import { createApiModule } from '../api-factory';
import { apiClient } from '../api-client';

jest.mock('../api-client');

describe('createApiModule', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create module with get method', async () => {
    mockApiClient.get.mockResolvedValue({ data: { id: 1 } });

    const plansApi = createApiModule('/api/plans');
    const result = await plansApi.get('/123');

    expect(mockApiClient.get).toHaveBeenCalledWith('/api/plans/123');
    expect(result).toEqual({ id: 1 });
  });

  it('should create module with post method', async () => {
    mockApiClient.post.mockResolvedValue({ data: { created: true } });

    const plansApi = createApiModule('/api/plans');
    const result = await plansApi.post('/generate', { wizardData: {} });

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/plans/generate', { wizardData: {} });
    expect(result).toEqual({ created: true });
  });

  it('should create module with patch method', async () => {
    mockApiClient.patch.mockResolvedValue({ data: { updated: true } });

    const plansApi = createApiModule('/api/plans');
    const result = await plansApi.patch('/123', { status: 'completed' });

    expect(mockApiClient.patch).toHaveBeenCalledWith('/api/plans/123', { status: 'completed' });
  });

  it('should create module with delete method', async () => {
    mockApiClient.delete.mockResolvedValue({ data: null });

    const plansApi = createApiModule('/api/plans');
    await plansApi.delete('/123');

    expect(mockApiClient.delete).toHaveBeenCalledWith('/api/plans/123');
  });

  it('should handle base path without trailing slash', async () => {
    mockApiClient.get.mockResolvedValue({ data: [] });

    const api = createApiModule('/api/plans');
    await api.get('');

    expect(mockApiClient.get).toHaveBeenCalledWith('/api/plans');
  });
});
```

#### Step 2: GREEN - Implementar factory

```typescript
// vibeia/src/lib/api-factory.ts

import { apiClient } from './api-client';

export interface ApiModule {
  get: <T = any>(path?: string) => Promise<T>;
  post: <T = any>(path: string, data?: any) => Promise<T>;
  patch: <T = any>(path: string, data: any) => Promise<T>;
  delete: (path: string) => Promise<void>;
}

export function createApiModule(basePath: string): ApiModule {
  const buildUrl = (path: string) => `${basePath}${path}`;

  return {
    get: async <T = any>(path = '') => {
      const response = await apiClient.get(buildUrl(path));
      return response.data as T;
    },
    post: async <T = any>(path: string, data?: any) => {
      const response = await apiClient.post(buildUrl(path), data);
      return response.data as T;
    },
    patch: async <T = any>(path: string, data: any) => {
      const response = await apiClient.patch(buildUrl(path), data);
      return response.data as T;
    },
    delete: async (path: string) => {
      await apiClient.delete(buildUrl(path));
    },
  };
}
```

#### Step 3: REFACTOR - Migrar APIs existentes

```typescript
// vibeia/src/lib/api-client.ts

import { createApiModule } from './api-factory';

// Migración gradual - empezar con APIs simples
export const projectsApi = {
  ...createApiModule('/api/projects'),
  // Métodos custom que no siguen el patrón
  archive: async (id: string) =>
    (await apiClient.post(`/api/projects/${id}/archive`)).data,
};

export const teamsApi = createApiModule('/api/teams');

// Mantener APIs complejas sin cambios inicialmente
export const plansApi = {
  generate: async (wizardData: any, projectId?: string) => {
    const response = await apiClient.post('/api/plans/generate', {
      projectId: projectId || 'temp-' + Date.now(),
      wizardData,
    });
    return response.data;
  },
  // ... mantener métodos existentes
};
```

---

## Fase 4: Integration Tests Setup (MEDIUM RISK) - 8 horas

### 4.1 Configurar mongodb-memory-server

**Objetivo**: Habilitar los 44 tests skipped

#### Step 1: Instalar dependencias

```bash
cd backend
npm install --save-dev mongodb-memory-server @shelf/jest-mongodb
```

#### Step 2: Configurar Jest

```typescript
// backend/jest-mongodb-config.js
module.exports = {
  mongodbMemoryServerOptions: {
    binary: {
      version: '6.0.4',
      skipMD5: true,
    },
    autoStart: false,
    instance: {},
  },
};
```

#### Step 3: Crear test utilities

```typescript
// backend/src/test/integration-test.utils.ts

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

export const setupTestDatabase = async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
};

export const teardownTestDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};

export const clearTestDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};
```

#### Step 4: Migrar tests skipped

```typescript
// backend/src/modules/setup/setup.service.integration.spec.ts

import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../../test/integration-test.utils';

describe('SetupOrchestratorService (Integration)', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  // Mover tests de setup.service.spec.ts que estaban skipped
  it('should execute setup with all providers', async () => {
    // Test real con MongoDB en memoria
  });
});
```

---

## Checklist de Verificación

### Antes de cada cambio:
- [ ] Tests existentes pasan (`npm test`)
- [ ] Branch limpio (`git status`)

### Después de cada cambio:
- [ ] Nuevos tests pasan
- [ ] Tests existentes siguen pasando
- [ ] Coverage no disminuye
- [ ] Lint pasa (`npm run lint`)

### Comandos útiles:

```bash
# Ejecutar tests específicos
npm test -- --testPathPatterns="users.service"

# Ejecutar con coverage
npm run test:cov

# Watch mode durante desarrollo
npm test -- --watch

# Verificar lint
npm run lint
```

---

## Cronograma Sugerido

| Semana | Fase | Tareas | Horas |
|--------|------|--------|-------|
| 1 | Quick Wins | 1.1, 1.2, 1.3 | 6h |
| 2 | Decoradores | 2.1, 2.2 | 5h |
| 3 | API Factory | 3.1 | 4h |
| 4 | Integration | 4.1 | 8h |
| **Total** | | | **23h** |

---

## Métricas de Éxito

| Métrica | Antes | Target | Verificación |
|---------|-------|--------|--------------|
| Tech Debt Score | 68 | 80+ | `/tech_debt` |
| Tests Skipped | 44 | <10 | `npm test` |
| `any` usages | 228 | <150 | `grep -r "any" --include="*.ts"` |
| Duplicación | ~1100 líneas | ~300 líneas | Manual review |
| Coverage | Variable | >70% controllers | `npm run test:cov` |
