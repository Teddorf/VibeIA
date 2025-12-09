# Plan de Remediación de Calidad de Código

**Fecha:** 2025-12-09
**Basado en:** [Reporte de Calidad 2025-12-09](../reports/2025-12-09_quality_report.md)
**Estado:** En Progreso

---

## Resumen de Issues a Resolver

| Severidad | Cantidad | Estimación |
|-----------|----------|------------|
| Críticos | 4 | 8 horas |
| Altos | 18 | 24 horas |
| Medios | 25+ | 16 horas |
| **TOTAL** | **47+** | **~48 horas (6 días)** |

---

## FASE 1: SEGURIDAD CRÍTICA (Semana 1)

### Sprint Goal: Eliminar vulnerabilidades críticas

### 1.1 Fix IDOR en Projects Controller
- [ ] **Archivo:** `backend/src/modules/projects/projects.controller.ts`
- [ ] **Prioridad:** P0 - CRÍTICO
- [ ] **Estimación:** 2 horas
- [ ] **Responsable:** _Asignar_

**Tareas:**
```
[x] Agregar validación de ownership en findOne()
[x] Agregar validación de ownership en update()
[x] Agregar validación de ownership en delete()
[x] Crear test para verificar que usuario no puede acceder a proyecto ajeno
[x] Code review
```

**Código a implementar:**
```typescript
// projects.controller.ts
@Get(':id')
async findOne(
  @CurrentUser('userId') userId: string,
  @Param('id') id: string,
) {
  const project = await this.projectsService.findOne(id);
  if (!project) {
    throw new NotFoundException('Project not found');
  }
  if (project.ownerId.toString() !== userId) {
    throw new ForbiddenException('You do not have access to this project');
  }
  return project;
}
```

---

### 1.2 Encriptar GitHub Tokens
- [ ] **Archivo:** `backend/src/modules/users/users.service.ts`
- [ ] **Prioridad:** P0 - CRÍTICO
- [ ] **Estimación:** 3 horas
- [ ] **Responsable:** _Asignar_

**Tareas:**
```
[x] Inyectar EncryptionService en UsersService
[x] Encriptar token antes de guardar en connectGitHub()
[x] Crear método getDecryptedGitHubToken()
[x] Actualizar todos los lugares que leen githubAccessToken
[x] Migrar tokens existentes (script de migración) -- Implemented Lazy Migration (fallback)
[x] Tests
```

---

### 1.3 Fix Salt Hardcodeado en Encryption
- [ ] **Archivo:** `backend/src/modules/users/encryption.service.ts`
- [ ] **Prioridad:** P0 - CRÍTICO
- [ ] **Estimación:** 1 hora
- [ ] **Responsable:** _Asignar_

**Tareas:**
```
[x] Agregar ENCRYPTION_SALT a .env.example
[x] Modificar getKey() para usar salt del environment
[x] Validar que ENCRYPTION_KEY existe en producción
[x] Documentar en CLAUDE.md
```

**Código a implementar:**
```typescript
private getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('ENCRYPTION_KEY must be set and at least 32 characters');
  }
  const salt = process.env.ENCRYPTION_SALT || 'vibeia-default-salt-change-in-prod';
  return crypto.scryptSync(secret, salt, this.keyLength);
}
```

---

### 1.4 Fix IDOR en Plans Service
- [ ] **Archivo:** `backend/src/modules/plans/plans.service.ts`
- [ ] **Prioridad:** P0 - CRÍTICO
- [ ] **Estimación:** 2 horas
- [ ] **Responsable:** _Asignar_

**Tareas:**
```
[x] Validar que projectId pertenece al userId en findAll() -- Already secure by design
[x] Agregar validación en findOne()
[x] Agregar validación en updateStatus()
[x] Tests de seguridad
```

---

## FASE 2: SEGURIDAD ALTA (Semana 1-2)

### 2.1 Implementar Rate Limiting
- [ ] **Archivos:** `backend/src/modules/auth/auth.controller.ts`, `app.module.ts`
- [ ] **Prioridad:** P1 - ALTO
- [ ] **Estimación:** 2 horas

**Tareas:**
```
[x] Instalar @nestjs/throttler
[x] Configurar ThrottlerModule en app.module.ts
[x] Aplicar @Throttle() en login (10 req/15min)
[x] Aplicar @Throttle() en register (5 req/15min)
[x] Aplicar @Throttle() en refresh (20 req/15min)
[x] Tests
```

---

### 2.2 Validar DTOs con class-validator
- [ ] **Archivos:** `backend/src/modules/projects/dto/`, controllers varios
- [ ] **Prioridad:** P1 - ALTO
- [ ] **Estimación:** 4 horas

**Tareas:**
```
[ ] Crear CreateProjectDto con validaciones
[ ] Crear UpdateProjectDto
[ ] Verificar/crear DTOs para todos los endpoints POST/PATCH
[ ] Aplicar ValidationPipe global en main.ts
[ ] Tests
```

---

### 2.3 Configurar CORS Correctamente
- [ ] **Archivo:** `backend/src/main.ts`
- [ ] **Prioridad:** P1 - ALTO
- [ ] **Estimación:** 1 hora

**Tareas:**
```
[ ] Validar que FRONTEND_URL existe en producción
[ ] Especificar methods permitidos
[ ] Especificar headers permitidos
[ ] Agregar maxAge
[ ] Tests de integración
```

---

### 2.4 Eliminar Logs Sensibles
- [ ] **Archivo:** `frontend/src/lib/api-client.ts`
- [ ] **Prioridad:** P1 - ALTO
- [ ] **Estimación:** 1 hora

**Tareas:**
```
[ ] Condicionar logs por NODE_ENV
[ ] No loguear response.data en producción
[ ] Sanitizar error messages
```

---

### 2.5 Validar JSON.parse en AuthContext
- [ ] **Archivo:** `frontend/src/contexts/AuthContext.tsx`
- [ ] **Prioridad:** P1 - ALTO
- [ ] **Estimación:** 2 horas

**Tareas:**
```
[ ] Instalar zod en frontend
[ ] Crear UserSchema con zod
[ ] Validar antes de usar datos de localStorage
[ ] Manejar errores de validación
[ ] Tests
```

---

### 2.6 Mejorar Validación de Contraseñas
- [ ] **Archivo:** `backend/src/modules/auth/auth.service.ts`
- [ ] **Prioridad:** P1 - ALTO
- [ ] **Estimación:** 2 horas

**Tareas:**
```
[ ] Requerir mínimo 12 caracteres
[ ] Requerir mayúscula, minúscula, número, símbolo
[ ] Validar contra lista de contraseñas comunes
[ ] Mensajes de error descriptivos
[ ] Tests
```

---

## FASE 3: CODE SMELLS BLOCKER (Semana 2)

### 3.1 Refactorizar SetupOrchestratorService
- [ ] **Archivo:** `backend/src/modules/setup/setup-orchestrator.service.ts`
- [ ] **Prioridad:** P1 - BLOCKER
- [ ] **Estimación:** 6 horas

**Tareas:**
```
[ ] Crear interface SetupPhaseExecutor
[ ] Crear NeonSetupExecutor
[ ] Crear VercelSetupExecutor
[ ] Crear RailwaySetupExecutor
[ ] Refactorizar execute() para usar Strategy pattern
[ ] Mantener tests existentes pasando
[ ] Agregar tests para cada executor
```

---

### 3.2 Fix useEffect Dependencies
- [ ] **Archivo:** `frontend/src/components/execution/ExecutionDashboard.tsx`
- [ ] **Prioridad:** P1 - BLOCKER
- [ ] **Estimación:** 2 horas

**Tareas:**
```
[ ] Envolver executeNextTask en useCallback
[ ] Agregar a dependencias del useEffect
[ ] Verificar que no hay loops infinitos
[ ] Tests
```

---

### 3.3 Dividir SetupWizard en Componentes
- [ ] **Archivo:** `frontend/src/components/setup/SetupWizard.tsx`
- [ ] **Prioridad:** P2 - MAJOR
- [ ] **Estimación:** 4 horas

**Tareas:**
```
[ ] Extraer SetupStepProviders.tsx
[ ] Extraer SetupStepTokens.tsx
[ ] Extraer SetupStepConfig.tsx
[ ] Extraer SetupStepExecuting.tsx
[ ] Extraer SetupStepComplete.tsx
[ ] Crear SetupContext para compartir estado
[ ] Mantener funcionalidad existente
[ ] Tests
```

---

### 3.4 Dividir ExecutionDashboard
- [ ] **Archivo:** `frontend/src/components/execution/ExecutionDashboard.tsx`
- [ ] **Prioridad:** P2 - MAJOR
- [ ] **Estimación:** 4 horas

**Tareas:**
```
[ ] Extraer ExecutionHeader.tsx
[ ] Extraer ExecutionPhases.tsx
[ ] Extraer ExecutionLogs.tsx
[ ] Extraer ExecutionTasks.tsx
[ ] Tests
```

---

## FASE 4: MEJORAS DE MANTENIBILIDAD (Semana 3)

### 4.1 Reemplazar console.log con Logger
- [ ] **Archivos:** 28+ archivos en backend
- [ ] **Prioridad:** P2 - MINOR
- [ ] **Estimación:** 3 horas

**Tareas:**
```
[ ] Inyectar Logger en cada service
[ ] Reemplazar console.log → this.logger.log
[ ] Reemplazar console.error → this.logger.error
[ ] Reemplazar console.warn → this.logger.warn
[ ] Verificar que no queden console.* en src/
```

---

### 4.2 Consolidar Código Duplicado
- [ ] **Archivos:** Varios
- [ ] **Prioridad:** P2 - MINOR
- [ ] **Estimación:** 4 horas

**Tareas:**
```
[ ] Mover getStatusColor a frontend/src/lib/utils.ts
[ ] Mover formatDate a frontend/src/lib/utils.ts
[ ] Crear BaseLLMProvider abstract class
[ ] Refactorizar providers para extender base
[ ] Consolidar error handling en GitService
```

---

### 4.3 Extraer Magic Numbers/Strings
- [ ] **Archivos:** Varios
- [ ] **Prioridad:** P3 - MINOR
- [ ] **Estimación:** 2 horas

**Tareas:**
```
[ ] Crear constants.ts en backend
[ ] Crear constants.ts en frontend
[ ] Extraer durations, status strings, etc.
[ ] Usar enums donde corresponda
```

---

### 4.4 Tipar Correctamente (eliminar any)
- [ ] **Archivos:** WizardContainer, Stage3, api-client, execution.service
- [ ] **Prioridad:** P2 - MAJOR
- [ ] **Estimación:** 4 horas

**Tareas:**
```
[ ] Crear WizardData interface completa
[ ] Tipar wizardData en WizardContainer
[ ] Tipar businessData en Stage3
[ ] Tipar parámetros en execution.service
[ ] Eliminar todos los any restantes
```

---

## FASE 5: TESTING (Semana 3-4)

### 5.1 Aumentar Cobertura Backend
- [ ] **Target:** 50% → 80%
- [ ] **Prioridad:** P2
- [ ] **Estimación:** 8 horas

**Módulos prioritarios:**
```
[ ] billing/ - Sin tests
[ ] events/ - Gateway sin tests
[ ] git/ - Cobertura parcial
[ ] security/ - Cobertura parcial
```

---

### 5.2 Aumentar Cobertura Frontend
- [ ] **Target:** 15% → 60%
- [ ] **Prioridad:** P2
- [ ] **Estimación:** 8 horas

**Componentes prioritarios:**
```
[ ] settings/page.tsx
[ ] new-project/page.tsx
[ ] InfraRecommendations.tsx
[ ] DocumentationGenerator.tsx
```

---

## FASE 6: INFRAESTRUCTURA (Semana 4)

### 6.1 Mover Tokens a HTTPOnly Cookies
- [ ] **Archivos:** Backend auth, Frontend AuthContext
- [ ] **Prioridad:** P1 - ALTO
- [ ] **Estimación:** 8 horas

**Tareas:**
```
[ ] Modificar login para setear cookie HTTPOnly
[ ] Modificar refresh para usar cookie
[ ] Modificar frontend para no guardar tokens en localStorage
[ ] Mantener user data en localStorage (no sensible)
[ ] Configurar CORS para credentials
[ ] Tests E2E
```

---

### 6.2 Implementar CSRF Protection
- [ ] **Archivo:** Backend app.module.ts
- [ ] **Prioridad:** P2 - ALTO
- [ ] **Estimación:** 4 horas

**Tareas:**
```
[ ] Instalar csurf o similar
[ ] Configurar middleware
[ ] Enviar token CSRF en responses
[ ] Validar en requests mutantes
[ ] Tests
```

---

## Cronograma Propuesto

| Semana | Fase | Horas | Entregables |
|--------|------|-------|-------------|
| 1 | Fase 1 + 2.1-2.3 | 16h | Seguridad crítica + rate limiting |
| 2 | Fase 2.4-2.6 + 3.1-3.2 | 16h | Seguridad alta + blockers |
| 3 | Fase 3.3-3.4 + 4 | 16h | Refactoring componentes + mantenibilidad |
| 4 | Fase 5 + 6 | 16h | Testing + infraestructura auth |

**Total:** ~64 horas (8 días de trabajo efectivo)

---

## Checklist de Validación Final

Antes de cerrar el plan, verificar:

```
[ ] Todos los issues críticos resueltos
[ ] npm audit clean
[ ] Tests pasando
[ ] Coverage > 60%
[ ] No console.log en producción
[ ] Documentación actualizada
[ ] CLAUDE.md actualizado
[ ] Code review completado
```

---

## Tracking de Progreso

| Fecha | Issue | Estado | Notas |
|-------|-------|--------|-------|
| 2025-12-09 | Plan creado | Pendiente | - |
| | | | |

---

*Plan generado automáticamente basado en análisis de código*
*Actualizar este documento conforme se avance*
