# 🚀 VIBE CODING PLATFORM
## Especificación Técnica Completa

**Versión:** 1.0  
**Última actualización:** Diciembre 2024  
**Estado:** En desarrollo

---

# 📋 TABLA DE CONTENIDOS

1. [Visión General](#1-visión-general)
2. [Arquitectura de 4 Etapas](#2-arquitectura-de-4-etapas)
3. [Sistema de Planificación Granular](#3-sistema-de-planificación-granular)
4. [Integración con Git](#4-integración-con-git)
5. [Multi-LLM Orchestration](#5-multi-llm-orchestration)
6. [Gestión de Tareas Manuales](#6-gestión-de-tareas-manuales)
7. [Documentación Automática](#7-documentación-automática)
8. [Proyecto Nuevo vs Existente](#8-proyecto-nuevo-vs-existente)
9. [Sistema de Recomendación de Base de Datos](#9-sistema-de-recomendación-de-base-de-datos)
10. [Sistema de Recomendación de Deploy](#10-sistema-de-recomendación-de-deploy)
11. [Calculadora de Costos](#11-calculadora-de-costos)
12. [Setup Automatizado](#12-setup-automatizado)
13. [Manejo de Errores y Rollback](#13-manejo-de-errores-y-rollback)
14. [Seguridad y Aislamiento](#14-seguridad-y-aislamiento)
15. [Modelo de Negocio](#15-modelo-de-negocio)
16. [Roadmap](#16-roadmap)

---

# 1. VISIÓN GENERAL

## 1.1 Concepto Central

Vibe Coding Platform es una plataforma de desarrollo asistido por IA que actúa como **"AI Coding Conductor"**, orquestando múltiples LLMs mientras enseña mejores prácticas de desarrollo.

**Diferenciador clave:** Metodología sobre modelo. No competimos en IA, sino en proceso estructurado y calidad de output.

## 1.2 Problemas que Resuelve

| Problema | Solución Vibe |
|----------|---------------|
| Prompts amplios generan código imposible de mantener | Metodología granular con tareas de máximo 10 minutos |
| Falta de tests y calidad consistente | Quality gates obligatorios con coverage mínimo 80% |
| Código duplicado y vulnerabilidades | Scanning automático de seguridad y duplicación |
| Pérdida de contexto entre sesiones | Persistencia de contexto y documentación automática |
| Dependencia de un solo proveedor LLM | Arquitectura multi-LLM agnóstica |

## 1.3 Propuesta de Valor

```
Feature típica sin plataforma: 14 horas ($1,120)
Con Vibe Coding Platform:      2.25 horas ($180)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ahorro:                        $940 por feature (84% reducción)
```

---

# 2. ARQUITECTURA DE 4 ETAPAS

## 2.1 Overview del Flujo

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   ETAPA 1    │───▶│   ETAPA 2    │───▶│   ETAPA 3    │───▶│   ETAPA 4    │
│  Intención   │    │   Business   │    │   Técnico    │    │  Ejecución   │
│              │    │   Analysis   │    │   Analysis   │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
     QUÉ              POR QUÉ            CÓMO              HACER
```

## 2.2 Etapa 1: Declaración de Intención

El usuario describe **QUÉ** quiere construir en lenguaje natural. El sistema analiza el contexto del proyecto.

**Input ejemplo:**
```
"Quiero agregar un sistema de notificaciones en tiempo real 
para mi aplicación de gestión de proyectos"
```

**Output:**
- Análisis de intención
- Detección de alcance
- Identificación de dependencias

## 2.3 Etapa 2: Análisis de Negocio

Sistema hace 10-15 preguntas estructuradas sobre:

- **Alcance y usuarios:** ¿Quiénes usan esta feature?
- **Casos de uso:** ¿Qué eventos la disparan?
- **Escalabilidad:** Volumen esperado de usuarios/eventos
- **Canales e integraciones:** Email, push, in-app, SMS
- **Experiencia de usuario:** Cómo se visualiza, configuración

### Ejemplo: Sistema de Notificaciones

```
┌─────────────────────────────────────────────────────────┐
│  📊 ANÁLISIS DE NEGOCIO                                 │
└─────────────────────────────────────────────────────────┘

P1: ¿Quiénes reciben notificaciones?
    ( ) Todos los usuarios
    (•) Por rol (admin, user, etc.)
    ( ) Usuarios específicos
    ( ) Invitados también

P2: ¿Qué eventos generan notificaciones?
    [✓] Nuevo comentario
    [✓] Tarea asignada
    [✓] Deadline cercano
    [ ] Menciones
    [ ] Cambios de estado

P3: ¿Tienen prioridad/urgencia?
    (•) Sí, diferenciadas (alta, media, baja)
    ( ) No, todas iguales

P4: ¿Cómo se visualizan?
    [✓] Badge/contador en header
    [✓] Panel dropdown
    [ ] Página dedicada
    [✓] Email
    [ ] Push notifications

P5: ¿Volumen estimado?
    ( ) < 100 usuarios
    (•) 100 - 1,000 usuarios
    ( ) 1,000 - 10,000 usuarios
    ( ) > 10,000 usuarios

P6: ¿Usuarios pueden configurar preferencias?
    (•) Sí, por canal y tipo
    ( ) Sí, solo on/off global
    ( ) No, reciben todo
```

## 2.4 Etapa 3: Análisis Técnico + Recomendaciones

### 2.4.1 Análisis del Proyecto Actual

```typescript
interface ProjectAnalysis {
  stack: {
    frontend: 'Next.js' | 'React' | 'Vue' | 'Angular';
    backend: 'NestJS' | 'Express' | 'FastAPI';
    database: 'PostgreSQL' | 'MongoDB' | 'MySQL';
    testing: 'Jest' | 'Vitest' | 'Pytest';
  };
  patterns: {
    architecture: string;      // 'MVC', 'Clean Architecture', etc.
    stateManagement: string;   // 'Redux', 'Zustand', 'Context'
    authentication: string;    // 'JWT', 'Session', 'OAuth'
  };
  metrics: {
    totalFiles: number;
    linesOfCode: number;
    testCoverage: number;
    complexity: number;
    duplication: number;
    techDebt: number;
  };
  impacts: {
    filesToCreate: string[];
    filesToModify: string[];
    testsToCreate: string[];
    testsToModify: string[];
  };
}
```

### 2.4.2 Sistema de Arquetipos

Presenta 2-3 arquetipos validados para cada caso de uso:

```
┌─────────────────────────────────────────────────────────┐
│  🏗️ ARQUETIPOS DISPONIBLES                              │
└─────────────────────────────────────────────────────────┘

ARQUETIPO A: Event-Driven (Redis Pub/Sub + WebSocket) ⭐ RECOMENDADO
┌────────────────────────────────────────────────────┐
│ Pros:                                              │
│ • Desacoplado y extensible                        │
│ • Altamente escalable                             │
│ • Fácil testing                                   │
│                                                    │
│ Contras:                                          │
│ • Más complejo inicialmente                       │
│ • Requiere Redis                                  │
│                                                    │
│ Ideal para: Apps con >1000 usuarios               │
└────────────────────────────────────────────────────┘

ARQUETIPO B: Polling Simple
┌────────────────────────────────────────────────────┐
│ Pros:                                              │
│ • Implementación simple                           │
│ • Sin dependencias adicionales                    │
│                                                    │
│ Contras:                                          │
│ • No escalable                                    │
│ • Mayor carga en servidor                         │
│                                                    │
│ Ideal para: MVPs, <100 usuarios                   │
└────────────────────────────────────────────────────┘

ARQUETIPO C: Third-Party (Firebase/Pusher)
┌────────────────────────────────────────────────────┐
│ Pros:                                              │
│ • Setup instantáneo                               │
│ • Sin infraestructura propia                      │
│                                                    │
│ Contras:                                          │
│ • Vendor lock-in                                  │
│ • Costos variables                                │
│                                                    │
│ Ideal para: Prototipos rápidos                    │
└────────────────────────────────────────────────────┘
```

### 2.4.3 Propuesta de Arquitectura

```
Backend:
src/
├─ events/
│  ├─ eventBus.js           # Core event system
│  ├─ producers/            # Event emitters
│  │  ├─ taskProducer.js
│  │  └─ commentProducer.js
│  └─ consumers/            # Event handlers
│     ├─ notificationConsumer.js
│     └─ emailConsumer.js
├─ notifications/
│  ├─ notificationService.js
│  ├─ notificationModel.js
│  ├─ notificationController.js
│  └─ notificationSocket.js
└─ workers/
   └─ emailWorker.js

Frontend:
src/features/notifications/
├─ store/
│  └─ notificationStore.ts
├─ hooks/
│  ├─ useNotifications.ts
│  └─ useWebSocket.ts
├─ components/
│  ├─ NotificationBell.tsx
│  ├─ NotificationPanel.tsx
│  └─ NotificationItem.tsx
└─ api/
   └─ notificationApi.ts
```

### 2.4.4 Plan Generado

```
┌─────────────────────────────────────────────────────────┐
│  📋 PLAN DE IMPLEMENTACIÓN                              │
└─────────────────────────────────────────────────────────┘

Resumen:
• 4 Fases principales
• 18 Tareas granulares (máximo 10 min c/u)
• ~3.5 horas estimadas
• 18 archivos nuevos, 3 a modificar
• 28 unit tests, 12 integration, 4 E2E

FASE 1: Modelo de Datos (45 min) ────────────────────────

  Tarea 1.1: Crear schema Notification (8 min)
  ├─ Archivo: src/models/notification.model.ts
  ├─ Tests: notification.model.test.ts (3 tests)
  └─ Deps: ninguna

  Tarea 1.2: Agregar relación User-Notification (5 min)
  ├─ Archivo: src/models/user.model.ts (modificar)
  ├─ Tests: user.model.test.ts (modificar, +2 tests)
  └─ Deps: Tarea 1.1

  Tarea 1.3: Migration de BD (10 min)
  ├─ Archivo: migrations/add-notifications.ts
  ├─ Tests: migration.test.ts (crear, 2 tests)
  └─ Deps: Tareas 1.1, 1.2

FASE 2: Backend API (60 min) ────────────────────────────

  Tarea 2.1: POST /notifications endpoint (10 min)
  Tarea 2.2: GET /notifications endpoint (8 min)
  Tarea 2.3: PATCH /notifications/:id/read (6 min)
  Tarea 2.4: DELETE /notifications/:id (5 min)
  Tarea 2.5: WebSocket handler (15 min)
  Tarea 2.6: Event producers (10 min)

FASE 3: Frontend Components (50 min) ────────────────────

  Tarea 3.1: NotificationStore (12 min)
  Tarea 3.2: useNotifications hook (8 min)
  Tarea 3.3: NotificationBell component (10 min)
  Tarea 3.4: NotificationPanel component (12 min)
  Tarea 3.5: WebSocket integration (8 min)

FASE 4: Integration & E2E (35 min) ──────────────────────

  Tarea 4.1: Integration tests API (15 min)
  Tarea 4.2: E2E tests flujo completo (15 min)
  Tarea 4.3: Documentation update (5 min)
```

## 2.5 Etapa 4: Ejecución

Por cada tarea, el sistema ejecuta:

```
┌─────────────────────────────────────────────────────────┐
│  🔄 PIPELINE DE EJECUCIÓN POR TAREA                     │
└─────────────────────────────────────────────────────────┘

1. GENERATE CODE
   └─ LLM genera código según especificación

2. QUALITY CHECKS
   ├─ Lint (ESLint/Prettier)
   ├─ Complexity analysis
   ├─ Security scan
   └─ Duplication check

3. GENERATE TESTS
   ├─ Unit tests
   └─ Integration tests

4. RUN TESTS
   └─ Must pass 100%

5. GENERATE DOCS
   ├─ JSDoc/TSDoc
   ├─ README updates
   └─ API docs

6. GIT COMMIT
   └─ Conventional commit format

7. PUSH & UPDATE PR
   └─ Actualizar Draft PR
```

### Quality Gates Obligatorios

| Gate | Requisito | Bloquea si falla |
|------|-----------|------------------|
| Lint | Must pass | ✅ Sí |
| Unit Tests | 100% passing | ✅ Sí |
| Integration Tests | 100% passing | ✅ Sí |
| Coverage | ≥ 80% | ✅ Sí |
| Security | 0 vulnerabilidades | ✅ Sí |
| Duplication | ≤ 5% | ✅ Sí |
| Complexity | ≤ 10 ciclomático | ⚠️ Warning |

---

# 3. SISTEMA DE PLANIFICACIÓN GRANULAR

## 3.1 Estructura del Plan

```typescript
interface Plan {
  id: string;
  featureId: string;
  estimatedTime: number;          // minutos
  phases: Phase[];
  totalTasks: number;
  files: {
    toCreate: string[];
    toModify: string[];
    toDelete: string[];
  };
  tests: {
    unit: number;
    integration: number;
    e2e: number;
  };
}

interface Phase {
  id: string;
  name: string;
  order: number;
  estimatedTime: number;
  tasks: Task[];
  dependencies: string[];         // Phase IDs
}

interface Task {
  id: string;
  name: string;
  type: 'create' | 'modify' | 'delete' | 'test' | 'config';
  estimatedTime: number;          // máximo 10 minutos
  file: string;
  tests: TestSpec[];
  dependencies: string[];         // Task IDs
  qualityGates: QualityGate[];
}

interface TestSpec {
  file: string;
  action: 'create' | 'modify' | 'delete';
  cases: number;
  type: 'unit' | 'integration' | 'e2e';
}
```

## 3.2 Detección de Tests Obsoletos

```typescript
class TestObsolescenceDetector {
  
  async analyze(codeChanges: CodeChange[]): Promise<ObsoleteTest[]> {
    const obsoleteTests: ObsoleteTest[] = [];
    
    for (const change of codeChanges) {
      // Buscar tests que referencian código eliminado
      const affectedTests = await this.findTestsForFile(change.file);
      
      for (const test of affectedTests) {
        const analysis = await this.analyzeTest(test, change);
        
        if (analysis.coversDeletedCode) {
          obsoleteTests.push({
            testFile: test.file,
            reason: 'covers_deleted_code',
            action: 'delete',
            confidence: analysis.confidence
          });
        }
        
        if (analysis.duplicatesOtherTest) {
          obsoleteTests.push({
            testFile: test.file,
            reason: 'duplicates_test',
            duplicateOf: analysis.duplicateOf,
            action: 'delete',
            confidence: analysis.confidence
          });
        }
        
        if (analysis.testsOldImplementation) {
          obsoleteTests.push({
            testFile: test.file,
            reason: 'tests_old_implementation',
            action: 'update',
            suggestedChanges: analysis.suggestedChanges,
            confidence: analysis.confidence
          });
        }
      }
    }
    
    return obsoleteTests;
  }
}
```

## 3.3 Modificación Inteligente de Tests

```typescript
class TestModifier {
  
  async updateTests(
    existingTest: TestFile,
    codeChanges: CodeChange[]
  ): Promise<TestFile> {
    
    // Preservar estructura existente
    const preserved = {
      imports: existingTest.imports,
      setup: existingTest.beforeAll,
      teardown: existingTest.afterAll,
      helpers: existingTest.helperFunctions
    };
    
    // Analizar qué tests necesitan actualización
    const testsToUpdate = await this.analyzeTestCases(
      existingTest.testCases,
      codeChanges
    );
    
    // Actualizar assertions manteniendo estructura
    for (const testCase of testsToUpdate) {
      testCase.assertions = await this.updateAssertions(
        testCase.assertions,
        codeChanges
      );
    }
    
    // Agregar nuevos test cases si es necesario
    const newTestCases = await this.generateNewTestCases(
      codeChanges,
      existingTest.testCases
    );
    
    return {
      ...existingTest,
      ...preserved,
      testCases: [...testsToUpdate, ...newTestCases]
    };
  }
}
```

---

# 4. INTEGRACIÓN CON GIT

## 4.1 Branching Model: Hierarchical Feature Branching

```
main (production)
 │
 └─ develop (integration)
     │
     └─ feature/vibe-{feature}-{id}
         │
         ├─ feature/vibe-{feature}-{id}-phase-1
         │   ├─ commit: feat(notifications): create notification model
         │   ├─ commit: feat(notifications): add user relation
         │   └─ commit: feat(notifications): add migration
         │
         ├─ feature/vibe-{feature}-{id}-phase-2
         │   ├─ commit: feat(api): add POST /notifications
         │   ├─ commit: feat(api): add GET /notifications
         │   └─ commit: feat(api): add WebSocket handler
         │
         └─ feature/vibe-{feature}-{id}-phase-3
             └─ ...
```

## 4.2 Nomenclatura de Branches

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Feature | `feature/vibe-{name}-{id}` | `feature/vibe-notifications-a3f9c21` |
| Phase | `feature/vibe-{name}-{id}-phase-{n}` | `feature/vibe-notifications-a3f9c21-phase-1` |
| Task (opcional) | `task/{phase}.{task}-{name}` | `task/1.1-redis-setup` |

## 4.3 Formato de Commits

```
feat(scope): descripción corta

- Detalle 1
- Detalle 2
- Tests agregados/modificados: test1.ts, test2.ts

Generated-by: Vibe Coding Platform
Task-ID: task_abc123
Plan-ID: plan_xyz789
Phase: 1
Coverage: 85%
```

## 4.4 Flujo Automático de Git

```typescript
class GitWorkflow {
  
  async onPlanApproved(plan: Plan): Promise<void> {
    // 1. Crear feature branch
    await this.createBranch(`feature/vibe-${plan.featureName}-${plan.id}`);
    
    // 2. Crear Draft PR
    await this.createDraftPR({
      title: `[Vibe] ${plan.featureName}`,
      body: this.generatePRDescription(plan),
      labels: ['vibe-generated', 'in-progress']
    });
  }
  
  async onPhaseStart(phase: Phase): Promise<void> {
    // Crear phase branch desde feature branch
    await this.createBranch(
      `feature/vibe-${phase.featureName}-${phase.planId}-phase-${phase.order}`,
      { from: `feature/vibe-${phase.featureName}-${phase.planId}` }
    );
  }
  
  async onTaskComplete(task: Task): Promise<void> {
    // Commit con mensaje estructurado
    await this.commit({
      message: this.formatCommitMessage(task),
      files: task.affectedFiles
    });
  }
  
  async onPhaseComplete(phase: Phase): Promise<void> {
    // Merge phase → feature (--no-ff)
    await this.merge({
      from: `feature/vibe-${phase.featureName}-${phase.planId}-phase-${phase.order}`,
      to: `feature/vibe-${phase.featureName}-${phase.planId}`,
      noFastForward: true
    });
    
    // Push
    await this.push();
    
    // Actualizar PR
    await this.updatePR({
      body: this.generatePRDescription(phase.plan, { completedPhase: phase })
    });
  }
  
  async onPlanComplete(plan: Plan): Promise<void> {
    // Marcar PR como ready for review
    await this.markPRReady();
    
    // Actualizar labels
    await this.updateLabels(['vibe-generated', 'ready-for-review']);
  }
}
```

## 4.5 Protección de Branches

| Branch | Reviews | CI Checks | Force Push |
|--------|---------|-----------|------------|
| `main` | 2 requeridos | Todos deben pasar | ❌ Prohibido |
| `develop` | 1 requerido | Todos deben pasar | ❌ Prohibido |
| `feature/*` | 0 | Todos deben pasar | ✅ Permitido (rebases) |

## 4.6 Estrategia de Rollback

```typescript
class RollbackStrategy {
  
  // Rollback de una tarea específica
  async rollbackTask(task: Task): Promise<void> {
    await this.git.revert(task.commitSha);
    await this.updateTaskStatus(task.id, 'rolled_back');
  }
  
  // Rollback de una fase completa
  async rollbackPhase(phase: Phase): Promise<void> {
    const mergeCommit = await this.findPhaseMergeCommit(phase);
    await this.git.reset(mergeCommit.parent, { hard: true });
    await this.git.push({ force: true });
    await this.updatePhaseStatus(phase.id, 'rolled_back');
  }
  
  // Rollback de feature completa
  async rollbackFeature(plan: Plan): Promise<void> {
    await this.closePR(plan.prNumber);
    await this.deleteBranch(`feature/vibe-${plan.featureName}-${plan.id}`);
    await this.updatePlanStatus(plan.id, 'cancelled');
  }
}
```

---

# 5. MULTI-LLM ORCHESTRATION

## 5.1 Arquitectura Agnóstica

```typescript
interface LLMProvider {
  name: string;
  generate(prompt: string, context: Context): Promise<GeneratedCode>;
  estimateCost(prompt: string): number;
  isAvailable(): Promise<boolean>;
  getCapabilities(): Capabilities;
}

class LLMOrchestrator {
  
  private providers: Map<string, LLMProvider> = new Map([
    ['claude', new AnthropicProvider()],
    ['gpt4', new OpenAIProvider()],
    ['gemini', new GoogleProvider()]
  ]);
  
  async generate(
    task: Task,
    strategy: RoutingStrategy
  ): Promise<GeneratedCode> {
    
    const provider = await this.selectProvider(task, strategy);
    
    try {
      return await provider.generate(task.prompt, task.context);
    } catch (error) {
      // Fallback automático
      return await this.fallback(task, provider.name);
    }
  }
  
  private async selectProvider(
    task: Task,
    strategy: RoutingStrategy
  ): Promise<LLMProvider> {
    
    switch (strategy.type) {
      case 'by_task_type':
        // Frontend → Claude, Backend → GPT-4, Tests → Gemini
        return this.getProviderByTaskType(task.type);
        
      case 'by_complexity':
        // Simple → económico, Complex → top-tier
        return this.getProviderByComplexity(task.complexity);
        
      case 'by_cost':
        // Usar el más económico disponible
        return this.getCheapestAvailable();
        
      case 'by_user_credits':
        // Respetar créditos del usuario
        return this.getProviderWithinBudget(strategy.budget);
        
      default:
        return this.providers.get('claude')!;
    }
  }
}
```

## 5.2 Estrategias de Routing

| Estrategia | Descripción | Uso |
|------------|-------------|-----|
| `by_task_type` | Asigna LLM según tipo de código | Default |
| `by_complexity` | LLMs potentes para tareas complejas | Optimización de calidad |
| `by_cost` | Minimiza costos usando LLMs económicos | Budget limitado |
| `by_user_credits` | Respeta límites del usuario | Planes con límites |
| `fallback` | Cambia automáticamente si uno falla | Siempre activo |

## 5.3 Adapter Pattern

```typescript
abstract class BaseLLMAdapter implements LLMProvider {
  abstract name: string;
  
  abstract generate(prompt: string, context: Context): Promise<GeneratedCode>;
  
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        await this.sleep(Math.pow(2, i) * 1000);
      }
    }
    
    throw lastError;
  }
}

class AnthropicProvider extends BaseLLMAdapter {
  name = 'claude';
  
  async generate(prompt: string, context: Context): Promise<GeneratedCode> {
    return this.withRetry(async () => {
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      });
      
      return this.parseResponse(response);
    });
  }
}

class OpenAIProvider extends BaseLLMAdapter {
  name = 'gpt4';
  
  async generate(prompt: string, context: Context): Promise<GeneratedCode> {
    return this.withRetry(async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }]
      });
      
      return this.parseResponse(response);
    });
  }
}
```

---

# 6. GESTIÓN DE TAREAS MANUALES

## 6.1 Tipos de Tareas Manuales

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `EXTERNAL_SERVICE_SETUP` | Crear cuentas en servicios externos | Crear cuenta en Stripe |
| `INFRASTRUCTURE_SETUP` | Configurar infraestructura | Crear base de datos |
| `CREDENTIALS_CONFIG` | Configurar credenciales | Agregar API keys |
| `BUSINESS_DECISION` | Decisiones de negocio | Aprobar diseño |
| `MANUAL_TESTING` | Testing manual | Verificar flujo en UI |
| `DEPLOYMENT_CONFIG` | Configuración de deploy | DNS, SSL |

## 6.2 Flujo de Tareas Manuales

```
┌─────────────────────────────────────────────────────────┐
│  ⏸️  TAREA MANUAL DETECTADA                             │
└─────────────────────────────────────────────────────────┘

Necesito que configures las API keys de Stripe para continuar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASO 1 de 5: Crear cuenta en Stripe
┌────────────────────────────────────────────────┐
│ 1. Ve a https://dashboard.stripe.com          │
│ 2. Click "Sign Up"                             │
│ 3. Completa el registro                        │
│                                                │
│ [Abrir Stripe →]                              │
│                                                │
│ ¿Completaste este paso?                        │
│ [Sí, continuar] [Necesito ayuda]              │
└────────────────────────────────────────────────┘

PASO 2 de 5: Obtener API Keys
┌────────────────────────────────────────────────┐
│ 1. Ve al Dashboard de Stripe                  │
│ 2. Click "Developers" > "API keys"            │
│ 3. Copia las keys:                            │
│    - Publishable key (pk_test_...)            │
│    - Secret key (sk_test_...)                 │
│                                                │
│ Publishable Key:                               │
│ ┌────────────────────────────────────────────┐│
│ │ pk_test_                                   ││
│ └────────────────────────────────────────────┘│
│ ✅ Formato válido                              │
│                                                │
│ Secret Key:                                    │
│ ┌────────────────────────────────────────────┐│
│ │ sk_test_                                   ││
│ └────────────────────────────────────────────┘│
│ ⏳ Validando...                               │
│ ✅ API key válida - Cuenta: Acme Corp (Test) │
└────────────────────────────────────────────────┘
```

## 6.3 Sistema de Validación en Tiempo Real

```typescript
class ManualTaskValidator {
  
  private validators: Map<string, Validator> = new Map([
    ['API_KEY', new APIKeyValidator()],
    ['URL_ACCESSIBLE', new URLValidator()],
    ['DATABASE_CONNECTION', new DatabaseValidator()],
    ['SERVICE_HEALTH', new HealthCheckValidator()],
    ['EMAIL_FORMAT', new EmailValidator()],
    ['DOMAIN_OWNERSHIP', new DNSValidator()]
  ]);
  
  async validate(
    input: string,
    validationType: string,
    context: ValidationContext
  ): Promise<ValidationResult> {
    
    const validator = this.validators.get(validationType);
    
    if (!validator) {
      return { valid: true, message: 'No validation required' };
    }
    
    return await validator.validate(input, context);
  }
}

class APIKeyValidator implements Validator {
  
  async validate(
    key: string,
    context: ValidationContext
  ): Promise<ValidationResult> {
    
    // Validar formato
    const formatValid = this.validateFormat(key, context.service);
    if (!formatValid.valid) {
      return formatValid;
    }
    
    // Hacer request de prueba
    try {
      const testResult = await this.testAPIKey(key, context.service);
      
      return {
        valid: true,
        message: `API key válida - Cuenta: ${testResult.accountName}`,
        metadata: testResult
      };
      
    } catch (error) {
      return {
        valid: false,
        message: `API key inválida: ${error.message}`,
        suggestion: 'Verifica que copiaste la key correctamente'
      };
    }
  }
}
```

## 6.4 Opciones para Tareas Manuales

```
┌─────────────────────────────────────────────────────────┐
│  ⚙️  OPCIONES PARA ESTA TAREA                           │
└─────────────────────────────────────────────────────────┘

[ ] Completar ahora
    Hacer la tarea en este momento

[ ] Delegar a otro miembro
    Asignar a: [Dropdown de miembros del equipo]
    Notificar por: [Email] [Slack] [Ambos]

[ ] Saltar temporalmente
    ⚠️ Advertencia: Se generarán TODOs en el código
    ⚠️ Algunas funcionalidades no estarán disponibles
    
    Features afectadas:
    • Procesamiento de pagos
    • Webhooks de Stripe
    
    [Entiendo, saltar de todos modos]

[ ] Recordarme después
    ⏰ Recordar en: [1 hora] [4 horas] [Mañana]
```

---

# 7. DOCUMENTACIÓN AUTOMÁTICA

## 7.1 Estructura de Documentación Generada

```
docs/
├─ README.md                    # Overview actualizado
├─ CHANGELOG.md                 # Historial de cambios
├─ ARCHITECTURE.md              # Arquitectura general
│
├─ architecture/
│  ├─ adr/                      # Architecture Decision Records
│  │  ├─ ADR-001-event-driven.md
│  │  ├─ ADR-002-redis-pubsub.md
│  │  └─ ADR-003-websocket.md
│  ├─ diagrams/                 # Diagramas Mermaid
│  │  ├─ notification-flow.md
│  │  ├─ data-model.md
│  │  └─ system-overview.md
│  └─ patterns/
│     └─ event-bus.md
│
├─ api/
│  ├─ rest/
│  │  └─ openapi.yaml           # Spec completa
│  └─ websocket/
│     └─ events.md              # Documentación de eventos
│
├─ frontend/
│  ├─ components/
│  │  ├─ NotificationBell.md
│  │  └─ NotificationPanel.md
│  └─ hooks/
│     └─ useNotifications.md
│
├─ guides/
│  ├─ getting-started.md
│  ├─ development.md
│  └─ testing.md
│
└─ testing/
   ├─ strategy.md
   └─ coverage-report.md
```

## 7.2 Ejemplo de ADR (Architecture Decision Record)

```markdown
# ADR 001: Event-Driven Architecture for Notifications

## Estado
Aceptado

## Contexto
Necesitamos implementar un sistema de notificaciones en tiempo real
que pueda escalar a miles de usuarios concurrentes y manejar múltiples
tipos de eventos.

## Decisión
Implementar arquitectura Event-Driven usando Redis Pub/Sub para 
el event bus y WebSockets para la comunicación en tiempo real.

## Consecuencias

### Positivas
- Sistema desacoplado y extensible
- Fácil agregar nuevos tipos de eventos
- Escalable horizontalmente
- Testing simplificado

### Negativas
- Complejidad adicional en setup
- Requiere Redis como dependencia
- Debugging más complejo

## Alternativas Consideradas

### Polling
- Rechazado por no escalar bien
- Mayor carga en servidor
- Latencia inaceptable

### Firebase/Third-party
- Rechazado por vendor lock-in
- Costos impredecibles a escala

## Referencias
- [Redis Pub/Sub Documentation](https://redis.io/topics/pubsub)
- [System Design Interview - Notification System](...)
```

## 7.3 Generación de Diagramas Mermaid

```typescript
class DiagramGenerator {
  
  generateFlowDiagram(feature: Feature): string {
    return `
\`\`\`mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant EventBus
    participant WebSocket
    participant Database

    User->>Frontend: Trigger action
    Frontend->>API: POST /api/action
    API->>Database: Save data
    API->>EventBus: Publish event
    EventBus->>WebSocket: Broadcast
    WebSocket->>Frontend: Push notification
    Frontend->>User: Show notification
\`\`\`
    `;
  }
  
  generateDataModel(models: Model[]): string {
    return `
\`\`\`mermaid
erDiagram
    USER ||--o{ NOTIFICATION : receives
    USER {
        uuid id PK
        string email
        string name
        json preferences
    }
    NOTIFICATION {
        uuid id PK
        uuid userId FK
        string type
        string title
        text content
        boolean read
        timestamp createdAt
    }
\`\`\`
    `;
  }
}
```

---

# 8. PROYECTO NUEVO VS EXISTENTE

## 8.1 Proyecto Nuevo - Etapa 0: Setup

### Preguntas de Setup

```
┌─────────────────────────────────────────────────────────┐
│  🆕 CREAR NUEVO PROYECTO                                │
└─────────────────────────────────────────────────────────┘

Nombre del proyecto:
┌────────────────────────────────────────────────┐
│ awesome-saas-app                               │
└────────────────────────────────────────────────┘

Tipo de aplicación:
( ) Web Application (Full-stack)
(•) SaaS Platform
( ) API Only
( ) Mobile App (React Native)
( ) Monolith
( ) Microservices

Stack recomendado para SaaS:
┌────────────────────────────────────────────────┐
│ Frontend: Next.js 14 (App Router) + TypeScript │
│ Backend:  NestJS + TypeScript                  │
│ Database: Neon PostgreSQL                      │
│ Cache:    Redis (Railway)                      │
│ Auth:     NextAuth.js                          │
│ UI:       shadcn/ui                            │
│                                                │
│ [Usar stack recomendado] [Personalizar]       │
└────────────────────────────────────────────────┘

Repositorio Git:
( ) GitHub (recomendado)
( ) GitLab
( ) Bitbucket

Estructura:
(•) Monorepo (Turborepo) - Recomendado
( ) Repos separados
( ) Single repo simple
```

### Estructura Generada (Monorepo)

```
awesome-saas-app/
├─ apps/
│  ├─ web/                      # Next.js frontend
│  │  ├─ src/
│  │  │  ├─ app/               # App Router
│  │  │  ├─ components/
│  │  │  ├─ hooks/
│  │  │  ├─ lib/
│  │  │  └─ styles/
│  │  ├─ public/
│  │  ├─ next.config.js
│  │  └─ package.json
│  │
│  └─ api/                      # NestJS backend
│     ├─ src/
│     │  ├─ modules/
│     │  ├─ common/
│     │  ├─ config/
│     │  └─ main.ts
│     ├─ test/
│     └─ package.json
│
├─ packages/
│  ├─ ui/                       # Shared UI components
│  ├─ types/                    # Shared TypeScript types
│  ├─ config/                   # Shared configs
│  │  ├─ eslint/
│  │  └─ typescript/
│  └─ utils/                    # Shared utilities
│
├─ docs/
│  ├─ README.md
│  ├─ ARCHITECTURE.md
│  └─ CONTRIBUTING.md
│
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     └─ deploy.yml
│
├─ docker-compose.yml
├─ turbo.json
├─ package.json
└─ .env.example
```

## 8.2 Proyecto Existente - Etapa 0: Análisis

### Proceso de Análisis

```
┌─────────────────────────────────────────────────────────┐
│  🔍 ANALIZANDO PROYECTO EXISTENTE                       │
└─────────────────────────────────────────────────────────┘

[████████████████████░░░░░░░░] 65%

✅ Conectando repositorio...
✅ Clonando proyecto...
⏳ Analizando estructura...
⏸️ Detectando patrones...
⏸️ Escaneando dependencias...
⏸️ Calculando métricas...
```

### Resultado del Análisis

```
┌─────────────────────────────────────────────────────────┐
│  📊 ANÁLISIS COMPLETO                                   │
└─────────────────────────────────────────────────────────┘

STACK DETECTADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend:       Next.js 14.1.0 (App Router)
Backend:        NestJS 10.2.0
Database:       PostgreSQL (Prisma ORM)
Testing:        Jest + React Testing Library
State:          Redux Toolkit + RTK Query
Auth:           JWT + Refresh Tokens
Styling:        Tailwind CSS

MÉTRICAS DE CÓDIGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total archivos:          347
Líneas de código:        42,583
Test coverage:           67% ⚠️ (recomendado: 80%)
Complejidad promedio:    8.3 ✅
Código duplicado:        4.2% ✅
Tech debt estimado:      ~18 horas ⚠️

PATRONES DETECTADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Arquitectura:    MVC + Service Layer (92% confidence)
API Style:       REST
State Pattern:   Redux + Normalized State
Auth Pattern:    JWT with HTTP-only cookies

ISSUES DETECTADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 CRÍTICO
• Test coverage bajo 80%
• 3 vulnerabilidades en dependencias
• 1 branch stale (45 días sin merge)

🟡 IMPORTANTE  
• Tech debt acumulado: 18 horas
• 14 archivos con complejidad > 15
• Falta documentación de arquitectura

🔵 SUGERENCIAS
• Considerar migrar Redux → Zustand
• Agregar E2E tests
• Configurar Sentry para monitoring

RECOMENDACIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de agregar features nuevas, recomiendo:

1. [ ] Subir coverage a 80% (estimado: 4 horas)
2. [ ] Actualizar dependencias vulnerables (30 min)
3. [ ] Crear ARCHITECTURE.md (1 hora)

[Resolver issues primero] [Continuar con feature]
```

## 8.3 Convergencia de Flujos

```
┌─────────────────┐         ┌─────────────────┐
│  NUEVO PROYECTO │         │ PROYECTO EXIST. │
│                 │         │                 │
│  Etapa 0:       │         │  Etapa 0:       │
│  Setup Inicial  │         │  Análisis       │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌─────────────────────┐
         │  FLUJO COMÚN        │
         │                     │
         │  Etapa 1: Intención │
         │  Etapa 2: Business  │
         │  Etapa 3: Técnico   │
         │  Etapa 4: Ejecución │
         └─────────────────────┘
```

---

# 9. SISTEMA DE RECOMENDACIÓN DE BASE DE DATOS

## 9.1 Cuestionario de Evaluación

```
┌─────────────────────────────────────────────────────────┐
│  🗄️ CONFIGURACIÓN DE BASE DE DATOS                      │
└─────────────────────────────────────────────────────────┘

P1: ¿Qué tipo de datos vas a almacenar?
( ) Principalmente relacionales (usuarios, órdenes, productos)
( ) Documentos flexibles (JSON, estructuras variables)
( ) Mixto (relacional + documentos)
( ) Time-series / Analytics
( ) Cache / Session storage

P2: ¿Volumen esperado de datos?
( ) < 1 GB (MVP, proyecto pequeño)
( ) 1-10 GB (Startup, crecimiento inicial)
( ) 10-100 GB (Empresa mediana)
( ) > 100 GB (Enterprise)

P3: ¿Tráfico esperado?
( ) < 100 requests/min (proyecto personal)
( ) 100-1,000 requests/min (pequeño negocio)
( ) 1,000-10,000 requests/min (mediano)
( ) > 10,000 requests/min (alto tráfico)

P4: ¿Necesitás branching de base de datos?
💡 Branching permite copias de la DB por branch de Git
( ) Sí, muy útil para mi workflow
( ) No, no es necesario

P5: ¿Presupuesto mensual para DB?
( ) $0-10 (gratis/hobby)
( ) $10-50 (startup)
( ) $50-200 (crecimiento)
( ) $200+ (enterprise)
```

## 9.2 Proveedores Evaluados

### Neon (PostgreSQL Serverless) ⭐ RECOMENDADO

```typescript
const neonAnalysis = {
  type: 'PostgreSQL Serverless',
  score: 95,
  
  pros: [
    'Database branching (feature única)',
    'Serverless (escala a cero)',
    'Excellent free tier',
    'Setup instantáneo',
    'Compatible con Prisma, Drizzle',
    'Backups automáticos'
  ],
  
  cons: [
    'Solo PostgreSQL (no NoSQL)',
    'Relativamente nuevo'
  ],
  
  pricing: {
    free: {
      storage: '0.5 GB',
      computeHours: '191.9/mes (~6.4h/día)',
      branches: 10,
      price: '$0'
    },
    launch: {
      storage: '10 GB',
      computeHours: 'Unlimited',
      branches: 'Unlimited',
      price: '$19/mes'
    },
    scale: {
      storage: '50 GB',
      autoscaling: true,
      price: '$69/mes'
    }
  },
  
  compatibility: {
    prisma: true,
    drizzle: true,
    typeorm: true,
    vercel: 'Native integration'
  }
};
```

### Comparativa de Proveedores

| Proveedor | Tipo | Branching | Free Tier | Precio Inicial | Score |
|-----------|------|-----------|-----------|----------------|-------|
| **Neon** | PostgreSQL | ✅ | 0.5 GB | $19/mes | 95 |
| Supabase | PostgreSQL + BaaS | ❌ | 500 MB | $25/mes | 82 |
| PlanetScale | MySQL | ✅ | 5 GB | $29/mes | 78 |
| MongoDB Atlas | NoSQL | ❌ | 512 MB | $57/mes | 70 |
| Railway Postgres | PostgreSQL | ❌ | $5 credits | Variable | 75 |

## 9.3 Lógica de Recomendación

```typescript
class DatabaseRecommender {
  
  recommend(requirements: DBRequirements): DBRecommendation {
    let scores = new Map<string, number>();
    
    // Neon scoring
    let neonScore = 70; // Base
    if (requirements.dataType === 'relational') neonScore += 15;
    if (requirements.needsBranching) neonScore += 20;
    if (requirements.budget <= 50) neonScore += 10;
    if (requirements.traffic < 1000) neonScore += 10;
    scores.set('neon', neonScore);
    
    // Supabase scoring
    let supabaseScore = 70;
    if (requirements.needsAuth) supabaseScore += 20;
    if (requirements.needsStorage) supabaseScore += 15;
    if (requirements.needsRealtime) supabaseScore += 15;
    scores.set('supabase', supabaseScore);
    
    // Return top recommendation
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    return this.buildRecommendation(sorted[0][0], sorted[0][1]);
  }
}
```

---

# 10. SISTEMA DE RECOMENDACIÓN DE DEPLOY

## 10.1 Cuestionario de Evaluación

```
┌─────────────────────────────────────────────────────────┐
│  🚀 CONFIGURACIÓN DE DEPLOYMENT                         │
└─────────────────────────────────────────────────────────┘

P1: ¿Qué componentes tiene tu aplicación?
[✓] Frontend (Next.js)
[✓] Backend API (NestJS)
[ ] Background workers
[ ] Cron jobs
[ ] WebSocket server

P2: ¿Necesitás preview deployments?
(•) Sí, muy útil para revisar cambios
( ) No, solo producción y staging

P3: ¿Tráfico esperado?
( ) < 1,000 usuarios/día (MVP)
( ) 1,000-10,000 usuarios/día (Pequeño negocio)
( ) 10,000-100,000 usuarios/día (Crecimiento)
( ) > 100,000 usuarios/día (Alto tráfico)

P4: ¿Complejidad de infraestructura?
( ) Simple (Frontend + API + DB)
( ) Media (+ Redis/Cache + Storage)
( ) Compleja (+ Queue + Workers + Multiple services)

P5: ¿Presupuesto mensual para hosting?
( ) $0-20 (hobby/MVP)
( ) $20-100 (startup)
( ) $100-500 (crecimiento)
( ) $500+ (enterprise)

P6: ¿Nivel de DevOps del equipo?
( ) Bajo (queremos algo managed/simple)
( ) Medio (configs básicas OK)
( ) Alto (queremos control total)
```

## 10.2 Configuración Recomendada: Vercel + Railway

```
┌─────────────────────────────────────────────────────────┐
│  🎯 ARQUITECTURA RECOMENDADA                            │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                                                      │
│   ┌─────────────┐        ┌─────────────┐            │
│   │   VERCEL    │        │  RAILWAY    │            │
│   │  Frontend   │◄──────►│  Backend    │            │
│   │  (Next.js)  │        │  (NestJS)   │            │
│   └─────────────┘        └──────┬──────┘            │
│                                 │                    │
│                    ┌────────────┼────────────┐      │
│                    │            │            │      │
│                    ▼            ▼            ▼      │
│              ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│              │  NEON   │ │  REDIS  │ │   S3    │   │
│              │Postgres │ │ (Cache) │ │(Storage)│   │
│              └─────────┘ └─────────┘ └─────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## 10.3 Comparativa de Opciones

| Opción | Setup | DX | Año 1 | Score |
|--------|-------|-----|-------|-------|
| **Vercel + Railway** | 15 min | ⭐⭐⭐⭐⭐ | $2,700 | 95 |
| Render | 20 min | ⭐⭐⭐⭐ | $1,800 | 85 |
| Railway Solo | 15 min | ⭐⭐⭐⭐ | $2,400 | 82 |
| Fly.io | 30 min | ⭐⭐⭐⭐ | $2,000 | 78 |
| AWS ECS | 2 weeks | ⭐⭐⭐ | $6,000+ | 65 |

## 10.4 Cuándo Cambiar de Plataforma

```
┌─────────────────────────────────────────────────────────┐
│  💡 CUÁNDO CONSIDERAR MIGRAR A AWS/GCP                  │
└─────────────────────────────────────────────────────────┘

Vercel + Railway es más económico hasta:
• > 100,000 usuarios/día
• > $500/mes en costos actuales
• Necesidad de compliance específico (HIPAA, SOC2)
• Equipos dedicados de DevOps (3+)

Revisá esta decisión cuando alcances:
✓ 75,000 usuarios/día
✓ $400/mes en costos
✓ Necesidades de customización extremas

Ahorro manteniéndote en managed platforms:
• ~$300-500/mes vs AWS
• ~2-3 ingenieros DevOps no necesarios
• ~160 horas/año en mantenimiento
```

---

# 11. CALCULADORA DE COSTOS

## 11.1 Proyección por Fases

```
┌─────────────────────────────────────────────────────────┐
│  💰 PROYECCIÓN DE COSTOS                                │
└─────────────────────────────────────────────────────────┘

FASE MVP (Primeros 3 meses)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vercel:       $0/mes   (Hobby plan)
Railway:      $5/mes   (Starter, $5 credits)
Neon:         $0/mes   (Free tier)
──────────────────────────────────────────────────────────
Total:        $5/mes
3 meses:      $15 TOTAL

✓ Suficiente para: ~1,000 usuarios/día
✓ Incluye: Preview deployments ilimitados


FASE CRECIMIENTO (Meses 4-9)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vercel:       $20/mes  (Pro - mejor performance)
Railway:      $35/mes  (más compute)
Neon:         $19/mes  (Launch - 10GB storage)
──────────────────────────────────────────────────────────
Total:        $74/mes
6 meses:      $444

✓ Soporta: ~10,000 usuarios/día


FASE ESCALA (Año 1+)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vercel:       $20/mes
Railway:      $100/mes (scaled services)
Neon:         $69/mes  (Scale - 50GB + autoscaling)
──────────────────────────────────────────────────────────
Total:        $189/mes
12 meses:     $2,268

✓ Soporta: ~100,000 usuarios/día


📊 COSTO TOTAL AÑO 1: ~$2,700
   Costo por usuario activo: ~$0.05
```

## 11.2 Calculadora Interactiva

```typescript
class CostCalculator {
  
  calculateProjection(
    profile: ProjectProfile,
    timeline: Timeline
  ): CostProjection {
    
    const phases = [
      {
        name: 'MVP',
        duration: 3,
        users: profile.mvpUsers,
        costs: {
          neon: this.calculateNeonCost(profile.mvpStorage, profile.mvpCompute),
          vercel: this.calculateVercelCost(profile.mvpBandwidth),
          railway: this.calculateRailwayCost(profile.mvpMemory, profile.mvpCPU)
        }
      },
      {
        name: 'Growth',
        duration: 6,
        users: profile.growthUsers,
        costs: {
          neon: this.calculateNeonCost(profile.growthStorage, profile.growthCompute),
          vercel: this.calculateVercelCost(profile.growthBandwidth),
          railway: this.calculateRailwayCost(profile.growthMemory, profile.growthCPU)
        }
      },
      {
        name: 'Scale',
        duration: 12,
        users: profile.scaleUsers,
        costs: {
          neon: this.calculateNeonCost(profile.scaleStorage, profile.scaleCompute),
          vercel: this.calculateVercelCost(profile.scaleBandwidth),
          railway: this.calculateRailwayCost(profile.scaleMemory, profile.scaleCPU)
        }
      }
    ];
    
    return {
      phases,
      year1Total: this.calculateYear1Total(phases),
      costPerUser: this.calculateCostPerUser(phases)
    };
  }
  
  calculateNeonCost(storage: number, computeHours: number): NeonCost {
    // Free tier
    if (storage <= 0.5 && computeHours <= 191.9) {
      return { tier: 'Free', monthly: 0 };
    }
    
    // Launch tier
    if (storage <= 10) {
      return { tier: 'Launch', monthly: 19 };
    }
    
    // Scale tier
    if (storage <= 50) {
      return { tier: 'Scale', monthly: 69 };
    }
    
    // Business (custom pricing)
    const extraStorage = storage - 50;
    return { 
      tier: 'Business', 
      monthly: 700 + (extraStorage * 3.5) 
    };
  }
}
```

---

# 12. SETUP AUTOMATIZADO

## 12.1 Arquitectura del Setup Engine

```typescript
class SetupOrchestrator {
  
  private tasks: SetupTask[] = [];
  private state: SetupState;
  private rollbackStack: RollbackAction[] = [];
  
  async execute(): Promise<SetupResult> {
    this.state = new SetupState();
    
    try {
      // 1. Planificar tareas
      await this.planTasks();
      
      // 2. Validar prerequisitos
      await this.validatePrerequisites();
      
      // 3. Ejecutar secuencialmente
      for (const task of this.tasks) {
        await this.executeTask(task);
      }
      
      // 4. Validación final
      await this.validateSetup();
      
      // 5. Generar documentación
      await this.generateSetupDocs();
      
      return {
        success: true,
        urls: this.state.urls,
        credentials: this.state.credentials,
        nextSteps: this.generateNextSteps()
      };
      
    } catch (error) {
      // Auto-rollback en caso de error
      await this.rollback();
      throw new SetupError(error);
    }
  }
}
```

## 12.2 Setup de Neon

```typescript
class NeonSetupTask implements SetupTask {
  
  async execute(): Promise<NeonSetupResult> {
    
    // 1. Crear proyecto
    const project = await this.neonClient.post('/projects', {
      project: {
        name: this.config.projectName,
        region_id: this.selectOptimalRegion(),
        pg_version: 16,
        store_passwords: true,
        history_retention_seconds: 604800 // 7 days
      }
    });
    
    // 2. Crear database
    const database = await this.neonClient.post(
      `/projects/${project.id}/databases`,
      {
        database: {
          name: 'main',
          owner_name: 'neondb_owner'
        }
      }
    );
    
    // 3. Crear branch para previews
    const previewBranch = await this.neonClient.post(
      `/projects/${project.id}/branches`,
      {
        branch: { name: 'preview' },
        endpoints: [{
          type: 'read_write',
          autoscaling_limit_min_cu: 0.25,
          autoscaling_limit_max_cu: 2,
          suspend_timeout_seconds: 300
        }]
      }
    );
    
    // 4. Obtener connection strings
    const connectionStrings = await this.getConnectionStrings(database.id);
    
    // 5. Validar conexión
    await this.validateConnection(connectionStrings.main);
    
    return {
      projectId: project.id,
      databaseId: database.id,
      connectionStrings,
      dashboardUrl: `https://console.neon.tech/app/projects/${project.id}`,
      branches: {
        main: database.default_branch_id,
        preview: previewBranch.id
      }
    };
  }
}
```

## 12.3 Setup de Vercel

```typescript
class VercelSetupTask implements SetupTask {
  
  async execute(): Promise<VercelSetupResult> {
    
    // 1. Crear proyecto
    const project = await this.vercelClient.post('/v9/projects', {
      name: this.config.projectName,
      framework: 'nextjs',
      gitRepository: {
        type: 'github',
        repo: this.config.repoFullName
      },
      rootDirectory: this.config.frontendPath || '/'
    });
    
    // 2. Configurar environment variables
    await this.configureEnvironmentVariables(project.id);
    
    // 3. Trigger primer deploy
    const deployment = await this.vercelClient.post('/v13/deployments', {
      name: this.config.projectName,
      gitSource: {
        type: 'github',
        ref: 'main',
        repoId: this.config.repoId
      },
      target: 'production'
    });
    
    // 4. Esperar deployment
    await this.waitForDeployment(deployment.id);
    
    return {
      projectId: project.id,
      url: `https://${project.name}.vercel.app`,
      dashboardUrl: `https://vercel.com/${this.config.teamSlug}/${project.name}`
    };
  }
}
```

## 12.4 Setup de Railway

```typescript
class RailwaySetupTask implements SetupTask {
  
  async execute(): Promise<RailwaySetupResult> {
    
    // 1. Crear proyecto
    const project = await this.railwayClient.post('/projects', {
      name: this.config.projectName,
      description: 'Backend API',
      isPublic: false
    });
    
    // 2. Crear servicio de API
    const apiService = await this.railwayClient.post(
      `/projects/${project.id}/services`,
      {
        name: 'api',
        source: {
          type: 'repo',
          repo: this.config.repoFullName,
          branch: 'main',
          buildCommand: 'npm run build',
          startCommand: 'npm run start:prod',
          rootDirectory: this.config.backendPath || '/'
        },
        resources: {
          replicas: 1,
          memory: 512,
          cpu: 1
        },
        healthcheck: {
          path: '/health',
          interval: 30
        }
      }
    );
    
    // 3. Crear Redis (si necesita)
    let redisService;
    if (this.config.needsRedis) {
      redisService = await this.railwayClient.post(
        `/projects/${project.id}/databases`,
        {
          name: 'redis',
          type: 'redis',
          version: '7'
        }
      );
    }
    
    // 4. Configurar variables de entorno
    await this.configureEnvironmentVariables(project.id);
    
    return {
      projectId: project.id,
      services: {
        api: {
          id: apiService.id,
          url: `https://${apiService.domain}`
        },
        redis: redisService ? {
          id: redisService.id,
          connectionString: redisService.connectionString
        } : undefined
      }
    };
  }
}
```

## 12.5 UI de Setup

```
┌─────────────────────────────────────────────────────────┐
│  🚀 CONFIGURACIÓN AUTOMÁTICA                            │
└─────────────────────────────────────────────────────────┘

[████████████████░░░░░░░░░░░░] 60%

✅ 1. Crear proyecto Neon (2 min)
   ├─ ✓ Proyecto creado: awesome-app-prod
   ├─ ✓ Database creada: main
   ├─ ✓ Preview branch creada
   └─ ✓ Connection strings generadas

✅ 2. Configurar Vercel (2 min)
   ├─ ✓ Proyecto creado
   ├─ ✓ Git integration configurada
   ├─ ✓ Environment variables configuradas
   └─ ⏳ Deploy iniciado... Building [████████░░] 80%

⏳ 3. Configurar Railway (3 min)
   ├─ ✓ Proyecto creado
   ├─ ✓ API service creado
   ├─ ⏳ Redis creando...
   └─ ⏸️ Variables de entorno (pending)

⏸️ 4. Conectar servicios (1 min)
⏸️ 5. Validar setup (1 min)
⏸️ 6. Deploy inicial (2 min)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tiempo estimado restante: ~5 minutos
```

---

# 13. MANEJO DE ERRORES Y ROLLBACK

## 13.1 Clasificación de Errores

```typescript
enum ErrorType {
  NETWORK = 'network',           // Temporales, retryables
  RATE_LIMIT = 'rate_limit',     // Retryable con backoff
  AUTH = 'auth',                 // No retryable
  VALIDATION = 'validation',     // No retryable
  CONFLICT = 'conflict',         // Puede ser retryable
  SERVER = 'server',             // Retryable
  QUOTA = 'quota',               // No retryable inmediatamente
  UNKNOWN = 'unknown'            // Retryable una vez
}

interface ErrorStrategy {
  retry: boolean;
  maxRetries: number;
  backoff: 'exponential' | 'linear' | 'none';
  initialDelay?: number;
  rollbackOnFailure: boolean;
  userAction?: 'reauth' | 'fix_input' | 'upgrade_plan';
  alternative?: string;
}

const ERROR_STRATEGIES: Record<ErrorType, ErrorStrategy> = {
  [ErrorType.NETWORK]: {
    retry: true,
    maxRetries: 3,
    backoff: 'exponential',
    rollbackOnFailure: true
  },
  
  [ErrorType.RATE_LIMIT]: {
    retry: true,
    maxRetries: 5,
    backoff: 'exponential',
    initialDelay: 60000, // 1 min
    rollbackOnFailure: false
  },
  
  [ErrorType.AUTH]: {
    retry: false,
    maxRetries: 0,
    backoff: 'none',
    rollbackOnFailure: true,
    userAction: 'reauth'
  },
  
  [ErrorType.VALIDATION]: {
    retry: false,
    maxRetries: 0,
    backoff: 'none',
    rollbackOnFailure: true,
    userAction: 'fix_input'
  },
  
  [ErrorType.QUOTA]: {
    retry: false,
    maxRetries: 0,
    backoff: 'none',
    rollbackOnFailure: true,
    userAction: 'upgrade_plan'
  }
};
```

## 13.2 Rollback Engine

```typescript
class RollbackEngine {
  
  private stack: RollbackAction[] = [];
  private executed: Set<string> = new Set();
  
  async registerAction(action: RollbackAction) {
    this.stack.push(action);
  }
  
  async rollback(reason: string): Promise<RollbackResult> {
    console.log(`🔄 Starting rollback: ${reason}`);
    
    const results: RollbackActionResult[] = [];
    const errors: Error[] = [];
    
    // Ejecutar en orden inverso (LIFO)
    while (this.stack.length > 0) {
      const action = this.stack.pop()!;
      
      if (this.executed.has(action.id)) {
        continue; // Skip si ya se ejecutó
      }
      
      try {
        await this.executeWithTimeout(action, 30000);
        results.push({ actionId: action.id, success: true });
        this.executed.add(action.id);
        
      } catch (error) {
        errors.push(error);
        results.push({ 
          actionId: action.id, 
          success: false, 
          error: error.message 
        });
        // Continuar con otros rollbacks
      }
    }
    
    return {
      success: errors.length === 0,
      actionsExecuted: results.length,
      actionsFailed: errors.length,
      results
    };
  }
}
```

## 13.3 Rollback Actions por Proveedor

```typescript
// Neon Rollback
class NeonRollbackAction implements RollbackAction {
  async execute(): Promise<void> {
    // Verificar que existe
    const exists = await this.projectExists(this.projectId);
    if (!exists) return;
    
    // Eliminar proyecto (elimina todo: databases, branches)
    await this.neonClient.delete(`/projects/${this.projectId}`);
  }
}

// Vercel Rollback
class VercelRollbackAction implements RollbackAction {
  async execute(): Promise<void> {
    // Eliminar deployments primero
    await this.deleteDeployments(this.projectId);
    
    // Eliminar proyecto
    await this.vercelClient.delete(`/v9/projects/${this.projectId}`);
  }
}

// Railway Rollback
class RailwayRollbackAction implements RollbackAction {
  async execute(): Promise<void> {
    // Railway elimina todo automáticamente con el proyecto
    await this.railwayClient.delete(`/projects/${this.projectId}`);
  }
}
```

## 13.4 Recovery System

```typescript
class RecoverySystem {
  
  async attemptRecovery(
    failedSetup: SetupState,
    error: EnhancedError
  ): Promise<RecoveryResult> {
    
    const analysis = this.analyzeFailure(failedSetup, error);
    
    if (!analysis.recoverable) {
      return { success: false, action: 'full_rollback' };
    }
    
    switch (analysis.strategy) {
      case 'partial_rollback':
        // Rollback solo la tarea fallida y reintentar
        return await this.partialRollbackAndRetry(failedSetup, analysis);
        
      case 'alternative':
        // Usar recurso existente si hay conflicto
        return await this.useAlternativeResource(failedSetup, analysis);
        
      case 'skip':
        // Saltar tarea no crítica
        return await this.skipNonCritical(failedSetup, analysis);
        
      case 'manual':
        // Requerir intervención del usuario
        return await this.requestManualIntervention(failedSetup, analysis);
    }
  }
  
  private isCritical(task: SetupTask): boolean {
    const criticalTasks = [
      'create_database',
      'create_frontend_project',
      'create_backend_project',
      'configure_database_connection'
    ];
    
    return criticalTasks.includes(task.type);
  }
}
```

## 13.5 UI de Errores

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️  ERROR EN LA CONFIGURACIÓN                          │
└─────────────────────────────────────────────────────────┘

Error en: Configurar Railway Project
Paso: 3 de 6

Error: Rate limit exceeded
Código: 429

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 RECUPERACIÓN AUTOMÁTICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ Reintentando automáticamente...

Intento 1 de 5
Próximo intento en: 2 minutos

[████████░░░░░░░░░░░░░░░░░] 2:00

💡 Railway tiene un límite de requests por minuto.
   Estoy esperando antes de reintentar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ COMPLETADO EXITOSAMENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Proyecto Neon creado
✓ Database configurada
✓ Proyecto Vercel creado
✓ Variables de entorno en Vercel

[Esperar y reintentar] [Cancelar setup]
```

## 13.6 UI de Rollback Completado

```
┌─────────────────────────────────────────────────────────┐
│  ✅ LIMPIEZA COMPLETADA                                  │
└─────────────────────────────────────────────────────────┘

Recursos eliminados:
✓ 1 proyecto Neon
✓ 1 database
✓ 2 branches
✓ 1 proyecto Vercel
✓ 3 deployments
✓ 1 proyecto Railway
✓ 2 servicios (API + Redis)
✓ 4 variables de entorno

Tiempo total: 2m 45s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 COSTOS EVITADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si estos recursos hubieran quedado activos:
• Vercel: $0/mes (hobby tier)
• Railway: $5-10/mes
• Neon: $0/mes (free tier)

Total evitado: ~$5-10/mes ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Reintentar Setup] [Volver al Dashboard]
```

---

# 14. SEGURIDAD Y AISLAMIENTO

## 14.1 Workspace Isolation

```typescript
interface WorkspaceConfig {
  base: 'ubuntu:22.04';
  tools: ['git', 'node', 'npm', 'python'];
  resources: {
    cpu: 2;
    memory: '4GB';
    disk: '10GB';
  };
  network: 'isolated';
  lifetime: '1-3 hours';
  autoDestroy: true;
}
```

Cada usuario/plan se ejecuta en un container Docker efímero:

- **Base image:** Ubuntu 22.04 + Git + Node.js
- **Recursos:** 2 CPU, 4GB RAM, 10GB disk
- **Network:** Aislada del resto
- **Lifetime:** 1-3 horas, auto-destrucción

## 14.2 Manejo de Credenciales

```typescript
class CredentialManager {
  
  // Git tokens: OAuth fine-grained, encriptados
  async storeGitToken(token: string): Promise<void> {
    const encrypted = await this.encrypt(token, 'AES-256-GCM');
    await this.secretsManager.store('git_token', encrypted);
  }
  
  // API keys LLM: Rotación automática
  async getLLMApiKey(provider: string): Promise<string> {
    const key = await this.secretsManager.get(`llm_${provider}`);
    
    if (this.shouldRotate(key)) {
      await this.rotateKey(provider);
    }
    
    return key.value;
  }
  
  // User secrets: Nunca commitados
  ensureGitignore(secrets: string[]): void {
    const gitignore = fs.readFileSync('.gitignore', 'utf-8');
    
    for (const secret of secrets) {
      if (!gitignore.includes(secret)) {
        fs.appendFileSync('.gitignore', `\n${secret}`);
      }
    }
  }
}
```

---

# 15. MODELO DE NEGOCIO

## 15.1 Estructura de Costos (100 usuarios/mes)

| Categoría | Servicio | Costo Mensual |
|-----------|----------|---------------|
| **Hosting** | Vercel (Pro) | $20 |
| | Railway | $100 |
| | Neon (Launch) | $19 |
| | Redis (Railway) | $14 |
| **Subtotal Hosting** | | **$153** |
| **Monitoring** | Sentry | $26 |
| **LLM APIs** | Anthropic | $500 |
| | OpenAI | $200 |
| **Subtotal LLM** | | **$700** |
| **TOTAL** | | **~$900/mes** |

## 15.2 Pricing Sugerido

| Plan | Precio | Incluye |
|------|--------|---------|
| **Básico** | $29/mes | 50 tareas, 1 proyecto |
| **Pro** | $99/mes | 500 tareas, proyectos ilimitados |
| **Enterprise** | Custom | Ilimitado, white-label, soporte dedicado |

## 15.3 ROI para Usuario

```
Feature típica sin Vibe:    14 horas × $80/hora = $1,120
Feature con Vibe:           2.25 horas × $80/hora = $180

Ahorro por feature:         $940 (84% reducción)
Features por mes (avg):     4

Ahorro mensual:             $3,760
Costo Vibe (Pro):           $99
ROI:                        3,800%
```

---

# 16. ROADMAP

## 16.1 MVP (3 meses)

### Mes 1: Core Platform
- [ ] Autenticación y dashboard
- [ ] UI de question engine
- [ ] Integración GitHub básica
- [ ] Sistema de planes

### Mes 2: Code Generation
- [ ] Integración Anthropic Claude
- [ ] Quality gates (lint, tests)
- [ ] Git workflow (commits, branches)
- [ ] Preview de código

### Mes 3: Polish
- [ ] Manual tasks flow
- [ ] Documentación automática
- [ ] Arquetipos iniciales (5)
- [ ] Beta testing

## 16.2 Post-MVP (6 meses)

### Fase 2 (Meses 4-6)
- [ ] Multi-LLM (OpenAI, Gemini)
- [ ] GitLab, Bitbucket
- [ ] Team collaboration
- [ ] Analytics dashboard

### Fase 3 (Meses 7-9)
- [ ] IDE plugins (VS Code, JetBrains)
- [ ] CLI tool
- [ ] Custom arquetipos
- [ ] Enterprise SSO

## 16.3 Métricas de Éxito

### Product Metrics
- MAU / DAU
- Retention 30/90 días
- Plans created/user/month
- Tasks completed/user/month
- Quality gates pass rate
- Test coverage average

### Business Metrics
- MRR / ARR
- CAC / LTV
- Churn rate
- NPS

### Technical Metrics
- Time to generate plan (p50, p95)
- Time to execute task (p50, p95)
- LLM API response time (p95)
- System uptime

---

# APÉNDICES

## A. Glosario

| Término | Definición |
|---------|------------|
| **Arquetipo** | Patrón de arquitectura validado para un caso de uso específico |
| **Phase** | Grupo lógico de tareas relacionadas |
| **Quality Gate** | Verificación obligatoria que debe pasar antes de continuar |
| **Task** | Unidad mínima de trabajo (~10 minutos) |
| **Branching** | Feature de Neon para crear copias de la DB por branch |

## B. Referencias

- [Neon Documentation](https://neon.tech/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Anthropic API](https://docs.anthropic.com)
- [Conventional Commits](https://www.conventionalcommits.org)

## C. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Dic 2024 | Versión inicial completa |

---

**Documento generado por Vibe Coding Platform Spec Generator**  
**© 2024 - Todos los derechos reservados**
