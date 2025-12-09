# Reporte de Gaps y Problemas: Especificación vs Implementación

> **Fecha**: 2024-12-09
> **Versión**: 1.0
> **Estado**: Análisis completo

---

## Resumen Ejecutivo

| Categoría | Cantidad | Severidad |
|-----------|----------|-----------|
| Errores de compilación | 1 | CRÍTICA |
| Problemas de seguridad | 3 | CRÍTICA |
| Falta persistencia MongoDB | 5+ módulos | CRÍTICA |
| Inyección de dependencias | 1 | ALTA |
| Inconsistencias Frontend-Backend | 4 | ALTA |
| Funcionalidades incompletas | 6 | MEDIA |

---

## 1. ERRORES CRÍTICOS (Bloquean funcionamiento)

### 1.1 Error de Compilación TypeScript

**Archivo**: `backend/src/modules/git/git.service.ts`
**Líneas**: 305-307
**Error**: TS18047 - 'repo.owner' is possibly 'null'

```typescript
// PROBLEMA: El build puede fallar
305→  login: repo.owner.login,      // Error: 'repo.owner' is possibly 'null'
306→  avatar_url: repo.owner.avatar_url,
```

**Impacto**: El backend no compila correctamente
**Solución**: Agregar null check o non-null assertion

```typescript
// Solución
login: repo.owner?.login ?? '',
avatar_url: repo.owner?.avatar_url ?? '',
```

---

### 1.2 Autenticación Insegura con Headers

**Archivos afectados**:
- `backend/src/modules/teams/teams.controller.ts` (líneas 43, 56, 91, 116)
- `backend/src/modules/security/security.controller.ts` (líneas 80, 87, 95)
- `backend/src/modules/billing/billing.controller.ts` (líneas 41, 105)

**Código problemático**:
```typescript
// INSEGURO: Cliente puede falsificar este header
async createTeam(
  @Headers('x-user-id') userId: string,  // ❌
  @Body() dto: CreateTeamDto,
) {
  const safeUserId = userId || 'default-user';  // ❌ Fallback peligroso
}
```

**Problemas**:
1. `x-user-id` header puede ser forjado por el cliente
2. Fallback a `'default-user'` permite acceso sin autenticación
3. No usa el sistema JWT estándar del proyecto

**Solución**: Usar `@CurrentUser()` decorator

```typescript
// SEGURO
async createTeam(
  @CurrentUser('userId') userId: string,  // ✅ Extraído del JWT
  @Body() dto: CreateTeamDto,
) {
  // userId viene del token JWT validado
}
```

---

### 1.3 Endpoints @Public() sin protección

**Archivo**: `backend/src/modules/setup/setup.controller.ts`

**Líneas con @Public()**: 23, 66, 87, 104, 119, 158, 165, 172, 179

```typescript
@Public()  // ❌ TODOS los endpoints de setup son públicos
@Post('start')
async startSetup(@Body() dto: StartSetupDto) {
  // Cualquiera puede iniciar setup de infraestructura
}
```

**Impacto**:
- Cualquier persona puede iniciar setup de Neon/Vercel/Railway
- Potencial abuso de recursos y costos
- Violación de seguridad grave

**Solución**: Remover `@Public()` y requerir autenticación

---

## 2. FALTA DE PERSISTENCIA (Módulos sin MongoDB)

### 2.1 Resumen de Módulos Afectados

| Módulo | Archivo | Storage Actual | Debería Usar |
|--------|---------|----------------|--------------|
| Setup | `setup-orchestrator.service.ts:22-23` | `Map<string, SetupState>` | MongoDB Schema |
| Teams | `teams.service.ts:16-17` | `Map<string, Team>` | MongoDB Schema |
| Teams Members | `members.service.ts:12-14` | `Map<string, TeamMember[]>` | MongoDB Schema |
| Teams Invitations | `invitations.service.ts` | `Map` | MongoDB Schema |
| Security Credentials | `credential-manager.service.ts` | `Map` | MongoDB Schema (encrypted) |
| Security Workspaces | `workspace.service.ts` | `Map` | MongoDB Schema |

### 2.2 Impacto

**En Render Free Tier**:
- El servidor se reinicia cada ~15 minutos de inactividad
- TODA la data en memoria se pierde
- Teams, invitaciones, setup states, credentials = BORRADOS

**Escenario real**:
1. Usuario crea un Team
2. Invita miembros
3. El servidor se duerme por inactividad (15 min)
4. Usuario vuelve → Team no existe, invitaciones perdidas

### 2.3 Schemas MongoDB Faltantes

**Crear estos schemas**:

```typescript
// backend/src/modules/teams/schemas/team.schema.ts
@Schema({ timestamps: true })
export class Team {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  ownerId: string;

  @Prop({ type: [String], default: [] })
  memberIds: string[];

  @Prop({ default: 'active' })
  status: string;
}

// backend/src/modules/setup/schemas/setup-state.schema.ts
@Schema({ timestamps: true })
export class SetupState {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  status: string;

  @Prop({ type: Object })
  config: Record<string, any>;

  @Prop({ type: [Object], default: [] })
  completedSteps: any[];

  @Prop({ type: [Object], default: [] })
  rollbackStack: any[];
}
```

---

## 3. INYECCIÓN DE DEPENDENCIAS

### 3.1 ConfigService no disponible en Setup Module

**Archivo**: `backend/src/modules/setup/setup.module.ts`

```typescript
// ACTUAL - Falta ConfigModule
@Module({
  providers: [
    SetupOrchestratorService,
    NeonSetupService,      // Usa ConfigService
    RailwaySetupService,   // Usa ConfigService
  ],
})
export class SetupModule {}
```

```typescript
// SOLUCIÓN
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],  // ✅ Agregar
  providers: [
    SetupOrchestratorService,
    NeonSetupService,
    RailwaySetupService,
  ],
})
export class SetupModule {}
```

**Nota**: Aunque ConfigModule está global en app.module.ts, es buena práctica importarlo explícitamente.

---

## 4. INCONSISTENCIAS FRONTEND-BACKEND

### 4.1 Frontend API Client vs Backend Endpoints

| API Client Method | Backend Endpoint | Estado |
|-------------------|------------------|--------|
| `setupApi.startSetup()` | `POST /api/setup/start` | ✅ Existe pero @Public |
| `setupApi.validateNeonToken()` | `POST /api/setup/validate/neon` | ✅ Existe pero @Public |
| `teamsApi.create()` | `POST /api/teams` | ⚠️ Usa x-user-id header |
| `teamsApi.getMembers()` | `GET /api/teams/:id/members` | ⚠️ Usa x-user-id header |
| `projectsApi.import()` | `POST /api/projects/import` | ✅ Recién agregado |
| `gitApi.listRepos()` | `GET /api/git/repos` | ❓ Verificar |
| `codebaseApi.analyze()` | `POST /api/codebase-analysis/:owner/:repo` | ❓ Verificar |

### 4.2 Axios Interceptors no envían userId

**Archivo**: `frontend/src/lib/api-client.ts` (líneas 11-23)

```typescript
// ACTUAL - Solo envía Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Problema**: Los controllers que esperan `x-user-id` header nunca lo reciben

**Solución A** (Backend - Recomendada): Usar `@CurrentUser()` en todos los controllers
**Solución B** (Frontend): Agregar userId al interceptor (NO recomendado, inseguro)

---

## 5. FUNCIONALIDADES INCOMPLETAS VS ESPECIFICACIÓN

### 5.1 Importación de Proyectos Existentes

| Feature | Spec | Implementación | Estado |
|---------|------|----------------|--------|
| Listar repos de usuario | Sección 8.2 | `GET /api/git/repos` | ⚠️ Parcial |
| Analizar codebase | Sección 8.2 | Módulo codebase-analysis | ❓ Verificar |
| Importar proyecto | Sección 8.2 | `POST /api/projects/import` | ✅ Agregado |
| Database branching Neon | Sección 9 | No implementado | ❌ Falta |
| Wizard adaptado para importados | Sección 8.3 | No existe | ❌ Falta |

### 5.2 Setup Automatizado

| Feature | Spec | Implementación | Estado |
|---------|------|----------------|--------|
| Neon setup | Sección 12.2 | `neon-setup.service.ts` | ⚠️ Sin persistencia |
| Vercel setup | Sección 12.3 | `vercel-setup.service.ts` | ⚠️ Sin persistencia |
| Railway setup | Sección 12.4 | `railway-setup.service.ts` | ⚠️ Sin persistencia |
| Rollback automático | Sección 13.2 | `rollback.service.ts` | ⚠️ Sin persistencia |
| UI de setup | Sección 12.5 | `SetupWizard.tsx` | ⚠️ Sin protección auth |

### 5.3 Teams & Collaboration

| Feature | Spec | Implementación | Estado |
|---------|------|----------------|--------|
| CRUD Teams | Sección Teams | `teams.service.ts` | ⚠️ Sin MongoDB |
| Miembros | Sección Teams | `members.service.ts` | ⚠️ Sin MongoDB |
| Invitaciones | Sección Teams | `invitations.service.ts` | ⚠️ Sin MongoDB |
| Git Connections | Sección Teams | `git-connections.service.ts` | ⚠️ Sin MongoDB |
| GitHub provider | Sección Teams | `github.provider.ts` | ✅ Existe |
| GitLab provider | Sección Teams | `gitlab.provider.ts` | ⚠️ Incompleto |
| Bitbucket provider | Sección Teams | `bitbucket.provider.ts` | ⚠️ Incompleto |

### 5.4 Security Module

| Feature | Spec | Implementación | Estado |
|---------|------|----------------|--------|
| Credential Manager | Sección 14.2 | `credential-manager.service.ts` | ⚠️ Sin MongoDB |
| Workspace Isolation | Sección 14.1 | `workspace.service.ts` | ⚠️ Sin MongoDB |
| Secret Scanning | Sección Security | `secrets-scanner.service.ts` | ✅ Existe |
| Vulnerability Detection | Sección Security | Existe | ✅ Existe |

---

## 6. POTENCIALES ERRORES HTTP

### 6.1 Errores 401 (Unauthorized)

| Escenario | Causa | Solución |
|-----------|-------|----------|
| Token expirado | JWT expira, refresh falla | Implementar refresh automático |
| Header x-user-id vacío | Controller usa fallback inseguro | Usar @CurrentUser() |
| GitHub token inválido | Token revocado o expirado | Validar antes de usar |

### 6.2 Errores 404 (Not Found)

| Escenario | Causa | Solución |
|-----------|-------|----------|
| Team no encontrado | Data perdida por reinicio | Persistir en MongoDB |
| Setup state no existe | Servidor reiniciado | Persistir en MongoDB |
| Proyecto importado no existe | ID inválido o borrado | Validar existencia |

### 6.3 Errores 500 (Server Error)

| Escenario | Causa | Solución |
|-----------|-------|----------|
| ConfigService undefined | Falta ConfigModule import | Importar ConfigModule |
| MongoDB connection | Connection string inválida | Validar MONGO_URI |
| GitHub API rate limit | Exceso de requests | Implementar cache/retry |
| LLM API error | API key inválida o límite | Validar keys, fallback |

---

## 7. PLAN DE CORRECCIÓN PRIORITIZADO

### Prioridad 1: CRÍTICOS (Bloquean producción)

1. **Fix TypeScript error en git.service.ts** (~15 min)
   - Agregar null checks en líneas 305-307

2. **Remover headers inseguros x-user-id** (~2 horas)
   - Migrar teams.controller.ts a @CurrentUser()
   - Migrar security.controller.ts a @CurrentUser()
   - Migrar billing.controller.ts a @CurrentUser()

3. **Proteger endpoints de Setup** (~30 min)
   - Remover @Public() de setup.controller.ts
   - Agregar @CurrentUser() a todos los endpoints

### Prioridad 2: ALTA (Pérdida de datos)

4. **Crear schemas MongoDB para Teams** (~3 horas)
   - team.schema.ts
   - team-member.schema.ts
   - team-invitation.schema.ts
   - git-connection.schema.ts
   - Migrar services a usar Mongoose

5. **Crear schemas MongoDB para Setup** (~2 horas)
   - setup-state.schema.ts
   - rollback-action.schema.ts
   - Migrar orchestrator a usar Mongoose

6. **Crear schemas MongoDB para Security** (~2 horas)
   - credential.schema.ts (con encryption)
   - workspace.schema.ts

### Prioridad 3: MEDIA (Funcionalidad incompleta)

7. **Completar importación de proyectos** (~4 horas)
   - Verificar endpoint listRepos funciona
   - Implementar codebase-analysis si falta
   - Crear UI de importación

8. **Database branching Neon** (~2 horas)
   - Implementar endpoint create branch
   - Integrar con preview deployments

9. **Completar providers Git** (~3 horas)
   - GitLab provider
   - Bitbucket provider

### Prioridad 4: BAJA (Mejoras)

10. **Mejorar error handling** (~2 horas)
11. **Agregar tests para nuevos schemas** (~3 horas)
12. **Documentar APIs faltantes** (~1 hora)

---

## 8. ARCHIVOS A MODIFICAR (Resumen)

### Backend - Críticos
```
backend/src/modules/git/git.service.ts                    # Fix TS error
backend/src/modules/teams/teams.controller.ts             # @CurrentUser
backend/src/modules/security/security.controller.ts       # @CurrentUser
backend/src/modules/billing/billing.controller.ts         # @CurrentUser
backend/src/modules/setup/setup.controller.ts             # Remove @Public
```

### Backend - Schemas nuevos
```
backend/src/modules/teams/schemas/team.schema.ts          # CREAR
backend/src/modules/teams/schemas/team-member.schema.ts   # CREAR
backend/src/modules/teams/schemas/invitation.schema.ts    # CREAR
backend/src/modules/teams/schemas/git-connection.schema.ts # CREAR
backend/src/modules/setup/schemas/setup-state.schema.ts   # CREAR
backend/src/modules/security/schemas/credential.schema.ts # CREAR
```

### Backend - Services a migrar
```
backend/src/modules/teams/teams.service.ts                # Map → MongoDB
backend/src/modules/teams/members.service.ts              # Map → MongoDB
backend/src/modules/teams/invitations.service.ts          # Map → MongoDB
backend/src/modules/setup/setup-orchestrator.service.ts   # Map → MongoDB
backend/src/modules/security/credential-manager.service.ts # Map → MongoDB
```

### Frontend - Verificar
```
frontend/src/lib/api-client.ts                            # Verificar endpoints
frontend/src/components/setup/SetupWizard.tsx             # Agregar auth check
```

---

## 9. ESTIMACIÓN TOTAL

| Prioridad | Items | Tiempo Estimado |
|-----------|-------|-----------------|
| Crítica | 3 | ~3 horas |
| Alta | 3 | ~7 horas |
| Media | 3 | ~9 horas |
| Baja | 3 | ~6 horas |
| **TOTAL** | **12** | **~25 horas** |

---

## 10. PRÓXIMOS PASOS

1. [ ] Aprobar este reporte
2. [ ] Comenzar con Prioridad 1 (Críticos)
3. [ ] Deploy incremental después de cada fix
4. [ ] Testing manual de cada corrección
5. [ ] Crear tests automatizados

---

*Documento generado: 2024-12-09*
