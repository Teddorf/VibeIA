# VibeIA - Reporte de Calidad de Código (Estilo SonarQube)

**Fecha de Análisis:** 2025-12-09
**Versión:** Develop Branch
**Analista:** Claude Code Static Analyzer

---

## RESUMEN EJECUTIVO

```
+------------------------------------------------------------------+
|  PUNTUACIÓN GENERAL: C                                            |
+------------------------------------------------------------------+
|  🔴 Críticos (Blocker):     4 issues                              |
|  🟠 Altos (Major):         18 issues                              |
|  🟡 Medios (Minor):        25+ issues                             |
|  🔵 Info:                  10+ suggestions                        |
+------------------------------------------------------------------+
|  ⏱️  DEUDA TÉCNICA ESTIMADA: 8-12 días                            |
|  📈 TENDENCIA: Estable (código funcional, necesita refactoring)   |
+------------------------------------------------------------------+
```

### Ratings por Categoría

| Categoría | Rating | Score |
|-----------|--------|-------|
| **Reliability** | C | Algunos bugs potenciales |
| **Security** | D | Vulnerabilidades críticas encontradas |
| **Maintainability** | C | Code smells significativos |
| **Coverage** | B | 17 spec files / 105 source files (16%) |
| **Duplications** | C | ~5% código duplicado |

---

## MÉTRICAS DE CÓDIGO

### Líneas de Código (LOC)

| Componente | Archivos | LOC | Promedio/Archivo |
|------------|----------|-----|------------------|
| **Backend src/** | 105 | 7,633 | 73 |
| **Frontend src/** | 50+ | 9,029 | 180 |
| **Tests (backend)** | 17 | ~3,500 | 206 |
| **Tests (frontend)** | 8 | ~1,200 | 150 |
| **TOTAL** | ~180 | ~21,362 | - |

### Archivos más Grandes (Hotspots)

| Archivo | LOC | Problema |
|---------|-----|----------|
| `frontend/src/lib/api-client.ts` | 1,058 | God Object - demasiadas responsabilidades |
| `backend/src/modules/security/security.service.spec.ts` | 858 | Test file largo |
| `frontend/src/components/setup/SetupWizard.tsx` | 714 | Componente monolítico |
| `backend/src/modules/teams/teams.controller.ts` | 696 | Controller muy grande |
| `backend/src/modules/manual-tasks/manual-tasks.service.ts` | 579 | Service complejo |
| `frontend/src/components/wizard/InfraRecommendations.tsx` | 565 | Componente complejo |
| `backend/src/modules/git/git.service.ts` | 515 | >500 LOC threshold |
| `frontend/src/app/projects/[id]/page.tsx` | 500 | Límite del threshold |

### Complejidad

| Métrica | Valor | Threshold | Status |
|---------|-------|-----------|--------|
| Complejidad Ciclomática Máx | 25 | <15 | ⚠️ |
| Profundidad Anidamiento Máx | 5 | <4 | ⚠️ |
| Parámetros Máx por Función | 8 | <7 | ⚠️ |
| Líneas Máx por Función | 205 | <50 | 🔴 |

---

## VULNERABILIDADES DE SEGURIDAD

### 🔴 CRÍTICAS (4)

#### SEC-001: IDOR - Acceso a Proyectos sin Validación de Propiedad
- **Archivo:** `backend/src/modules/projects/projects.controller.ts:26`
- **CWE:** CWE-639
- **Descripción:** Un usuario autenticado puede acceder a proyectos de otros usuarios
- **Impacto:** Divulgación de información sensible, manipulación de datos
- **Fix:**
```typescript
@Get(':id')
async findOne(@CurrentUser('userId') userId: string, @Param('id') id: string) {
  const project = await this.projectsService.findOne(id);
  if (project.ownerId.toString() !== userId) {
    throw new ForbiddenException('You do not own this project');
  }
  return project;
}
```

#### SEC-002: GitHub Token Almacenado sin Encriptar
- **Archivo:** `backend/src/modules/users/users.service.ts:419`
- **CWE:** CWE-522
- **Descripción:** GitHub access token se guarda en plain text en MongoDB
- **Impacto:** Si DB se compromete, todos los tokens de GitHub se exponen
- **Fix:** Usar `encryptionService.encrypt(accessToken)` antes de guardar

#### SEC-003: IDOR - Query Manipulation en Plans
- **Archivo:** `backend/src/modules/plans/plans.service.ts:68`
- **CWE:** CWE-639
- **Descripción:** Se confía en userId del request sin validación cruzada

#### SEC-004: Salt Hardcodeado en Derivación de Clave
- **Archivo:** `backend/src/modules/users/encryption.service.ts:13`
- **CWE:** CWE-327
- **Descripción:** `crypto.scryptSync(secret, 'salt', ...)` usa salt literal
- **Fix:** Usar salt aleatorio por instancia o del environment

### 🟠 ALTAS (8)

| ID | Vulnerabilidad | Archivo | CWE |
|----|---------------|---------|-----|
| SEC-005 | CORS Misconfiguration | `main.ts:8` | CWE-184 |
| SEC-006 | Tokens en localStorage | `AuthContext.tsx:30` | CWE-522 |
| SEC-007 | Logs con Datos Sensibles | `api-client.ts:29` | CWE-532 |
| SEC-008 | JSON.parse sin Validación | `AuthContext.tsx:52` | CWE-502 |
| SEC-009 | Falta Validación en DTOs | `projects.controller.ts:9` | CWE-20 |
| SEC-010 | Sin Rate Limiting Auth | `auth.controller.ts:11` | CWE-770 |
| SEC-011 | Missing CSRF Protection | Todo el backend | CWE-352 |
| SEC-012 | Validación Contraseña Débil | `auth.service.ts:47` | CWE-521 |

### 🟡 MEDIAS (4)

| ID | Vulnerabilidad | Archivo |
|----|---------------|---------|
| SEC-013 | Masking API Keys Inadecuado | `encryption.service.ts:56` |
| SEC-014 | Dependencias Potencialmente Vulnerables | `package.json` |
| SEC-015 | Endpoints Públicos sin Contexto | `recommendations.controller.ts` |
| SEC-016 | Token sin HTTPOnly Flag | Frontend auth |

---

## CODE SMELLS

### 🔴 BLOCKERS (1)

#### CS-001: SetupOrchestratorService.execute() - Método Gigante
- **Archivo:** `backend/src/modules/setup/setup-orchestrator.service.ts:149-354`
- **LOC:** 205 líneas
- **Problema:** Código completamente duplicado para 3 providers
- **Impacto:** Imposible de mantener, bugs se replican
- **Fix:** Extraer `SetupPhaseExecutor` interface con Strategy pattern

### 🟠 MAJORS (10)

| ID | Code Smell | Archivo | LOC |
|----|------------|---------|-----|
| CS-002 | Archivo >500 líneas | `git.service.ts` | 515 |
| CS-003 | Archivo >500 líneas | `setup-orchestrator.service.ts` | 445 |
| CS-004 | Método >50 líneas | `execution.service.ts:142-254` | 112 |
| CS-005 | Método >50 líneas | `execution.service.ts:53-140` | 88 |
| CS-006 | Método >50 líneas | `quality-gates.service.ts:70-164` | 94 |
| CS-007 | LLM Providers Duplicados | `llm/providers/*` | ~150 cada uno |
| CS-008 | Componente >300 líneas | `SetupWizard.tsx` | 714 |
| CS-009 | Componente >300 líneas | `ExecutionDashboard.tsx` | 460 |
| CS-010 | useEffect deps faltantes | `ExecutionDashboard.tsx:288` | - |
| CS-011 | SRP Violation | `SetupOrchestratorService` | - |

### 🟡 MINORS (15+)

| Tipo | Cantidad | Archivos Afectados |
|------|----------|-------------------|
| `console.log` en producción | 28+ | execution, llm, git, plans |
| Magic Numbers | 10+ | setup, cost-calculator, security |
| Código Duplicado | 5 patrones | git, teams, llm providers |
| Tipos `any` | 8+ | execution, llm, wizard |
| Handlers Inline Repetitivos | 8+ | SetupWizard, InfraRecommendations |
| `getStatusColor` duplicado | 3 archivos | dashboard, projects, execution |

---

## ANÁLISIS DE TESTS

### Cobertura Estimada

| Módulo | Tests | Archivos | Coverage Est. |
|--------|-------|----------|---------------|
| Backend | 17 spec files | 105 src files | ~16% |
| Frontend | 8 test files | 50+ src files | ~15% |

### Módulos sin Tests

- `backend/src/modules/billing/` - Sin spec files visibles
- `backend/src/modules/events/` - Gateway sin tests
- `frontend/src/app/settings/` - Página sin tests
- `frontend/src/app/new-project/` - Página sin tests

### Test Code Smells

- Tests con múltiples assertions no relacionadas
- Mocks excesivamente complejos en algunos specs
- Tests sin cleanup de estado

---

## ANÁLISIS DE DEPENDENCIAS

### Estado de Vulnerabilidades

```json
{
  "backend": {
    "vulnerabilities": 0,
    "total_dependencies": 832
  },
  "frontend": {
    "vulnerabilities": 0,
    "total_dependencies": 739
  }
}
```

✅ **No se encontraron vulnerabilidades conocidas** en `npm audit`

### Dependencias a Monitorear

| Package | Versión | Razón |
|---------|---------|-------|
| `passport-github2` | ^0.1.12 | Versión antigua |
| `socket.io` | ^4.8.1 | Monitorear actualizaciones |
| `mongoose` | ^8.20.1 | Versión reciente, revisar periódicamente |

---

## RECOMENDACIONES PRIORIZADAS

### 🔴 URGENTE (Esta Semana)

1. **Implementar validación IDOR** en todos los endpoints
   - `projects.controller.ts` - Validar ownership
   - `plans.service.ts` - Validar userId
   - Esfuerzo: 4 horas

2. **Encriptar GitHub tokens** antes de guardar
   - Usar `encryptionService.encrypt()` existente
   - Esfuerzo: 2 horas

3. **Corregir useEffect dependencies** en ExecutionDashboard
   - Agregar `executeNextTask` a deps o usar `useCallback`
   - Esfuerzo: 1 hora

### 🟠 IMPORTANTE (Este Sprint)

4. **Mover tokens a HTTPOnly cookies**
   - Refactorizar auth flow
   - Esfuerzo: 8 horas

5. **Implementar rate limiting** en auth endpoints
   - Usar `@nestjs/throttler`
   - Esfuerzo: 2 horas

6. **Refactorizar SetupOrchestratorService**
   - Extraer Strategy pattern
   - Esfuerzo: 6 horas

7. **Validar todos los DTOs** con class-validator
   - Crear DTOs faltantes
   - Esfuerzo: 4 horas

### 🟡 MEJORAS (Próximo Sprint)

8. **Reemplazar console.log con Logger**
   - Usar NestJS Logger
   - Esfuerzo: 3 horas

9. **Extraer componentes grandes**
   - SetupWizard → 5 sub-componentes
   - ExecutionDashboard → 4 sub-componentes
   - Esfuerzo: 8 horas

10. **Consolidar código duplicado**
    - `getStatusColor` → `lib/utils.ts`
    - `formatDate` → `lib/utils.ts`
    - LLM Providers → BaseLLMProvider
    - Esfuerzo: 4 horas

---

## TOP 10 HOTSPOTS

Archivos que requieren atención prioritaria:

| # | Archivo | Issues | Categorías |
|---|---------|--------|-----------|
| 1 | `users.service.ts` | 3 | Security, Duplication |
| 2 | `execution.service.ts` | 5 | Complexity, Console.log |
| 3 | `setup-orchestrator.service.ts` | 4 | Complexity, Duplication, SRP |
| 4 | `git.service.ts` | 3 | Size, Error handling |
| 5 | `SetupWizard.tsx` | 4 | Size, Duplication, Types |
| 6 | `ExecutionDashboard.tsx` | 4 | Size, useEffect, Re-renders |
| 7 | `AuthContext.tsx` | 3 | Security, useEffect |
| 8 | `api-client.ts` | 3 | Size, Logging, Types |
| 9 | `projects.controller.ts` | 2 | Security, Validation |
| 10 | `encryption.service.ts` | 2 | Security (salt) |

---

## QUALITY GATE STATUS

```
❌ QUALITY GATE: FAILED
```

| Criterio | Requerido | Actual | Status |
|----------|-----------|--------|--------|
| Security Rating | ≥ A | D | ❌ |
| Reliability Rating | ≥ A | C | ❌ |
| Maintainability Rating | ≥ A | C | ❌ |
| Coverage | > 80% | ~16% | ❌ |
| Duplications | < 3% | ~5% | ❌ |
| Critical Issues | 0 | 4 | ❌ |
| Blocker Issues | 0 | 1 | ❌ |

---

## CONCLUSIÓN

El proyecto VibeIA tiene una **arquitectura sólida** y **funcionalidad completa**, pero presenta **deuda técnica significativa** principalmente en:

1. **Seguridad:** Vulnerabilidades IDOR críticas y manejo de tokens
2. **Mantenibilidad:** Archivos muy grandes que necesitan refactoring
3. **Testing:** Cobertura insuficiente

**Recomendación:** Priorizar fixes de seguridad antes de nuevas features.

---

*Generado por Claude Code Static Analyzer*
*Basado en análisis estático del código fuente*
