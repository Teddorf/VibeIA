# Plan de Implementación: Importar Proyectos Existentes

> **Objetivo**: Permitir a los usuarios conectar repositorios de GitHub existentes a VibeIA para generar planes de mejora, refactoring, o nuevas features sobre código ya existente.

## Resumen Ejecutivo

| Aspecto | Detalle |
|---------|---------|
| **Fases totales** | 5 fases |
| **Archivos nuevos** | ~15 archivos |
| **Archivos modificados** | ~10 archivos |
| **Endpoints nuevos** | 8 endpoints |
| **Componentes UI nuevos** | 6 componentes |

---

## Estado Actual vs. Objetivo

### Flujo Actual (Solo proyectos nuevos)
```
Dashboard → "New Project" → Wizard 4 stages → Crea repo vacío → Genera plan → Ejecuta
```

### Flujo Objetivo (Proyectos nuevos + existentes)
```
Dashboard → "New Project" | "Import Project"
                ↓                    ↓
           Wizard actual      Seleccionar repo GitHub
                                     ↓
                              Analizar codebase
                                     ↓
                              Wizard adaptado (sin Stage 1)
                                     ↓
                              Genera plan contextual
                                     ↓
                                  Ejecuta
```

---

## FASE 1: Backend - GitHub API Integration

**Objetivo**: Exponer endpoints para interactuar con repositorios de GitHub del usuario.

### 1.1 Crear Git Controller

**Archivo nuevo**: `backend/src/modules/git/git.controller.ts`

```typescript
// Endpoints a implementar:
GET  /api/git/repos              // Listar repos del usuario autenticado
GET  /api/git/repos/:owner/:repo // Obtener detalles de un repo específico
GET  /api/git/repos/:owner/:repo/tree // Obtener estructura de archivos
GET  /api/git/repos/:owner/:repo/contents/:path // Obtener contenido de archivo
```

### 1.2 Extender Git Service

**Archivo**: `backend/src/modules/git/git.service.ts`

```typescript
// Métodos nuevos a agregar:
- listUserRepos(accessToken: string): Promise<Repository[]>
- getRepository(owner: string, repo: string): Promise<RepositoryDetails>
- getRepositoryTree(owner: string, repo: string, branch?: string): Promise<TreeNode[]>
- getFileContent(owner: string, repo: string, path: string): Promise<FileContent>
- searchRepos(query: string, accessToken: string): Promise<Repository[]>
```

### 1.3 DTOs y Types

**Archivo nuevo**: `backend/src/modules/git/dto/github.dto.ts`

```typescript
// Interfaces:
- GitHubRepository { id, name, full_name, description, private, default_branch, language, updated_at }
- TreeNode { path, type: 'file' | 'dir', size? }
- FileContent { content, encoding, size }
- ImportRepoDto { repoFullName, branch? }
```

### 1.4 Autenticación GitHub

**Modificar**: `backend/src/modules/users/users.schema.ts`

- El campo `githubAccessToken` ya existe pero no se usa
- Necesitamos endpoint para que usuario conecte su cuenta GitHub

**Archivo nuevo**: `backend/src/modules/auth/github-auth.controller.ts`

```typescript
// OAuth flow con GitHub:
GET  /api/auth/github          // Redirect a GitHub OAuth
GET  /api/auth/github/callback // Callback de GitHub, guarda token
DELETE /api/auth/github        // Desconectar cuenta GitHub
GET  /api/auth/github/status   // Verificar si está conectado
```

### Entregables Fase 1:
- [ ] `git.controller.ts` con 4 endpoints
- [ ] `git.service.ts` extendido con 5 métodos
- [ ] `dto/github.dto.ts` con interfaces
- [ ] `github-auth.controller.ts` con OAuth flow
- [ ] Tests unitarios para nuevos métodos
- [ ] Actualizar `git.module.ts` con exports

---

## FASE 2: Backend - Análisis de Codebase

**Objetivo**: Analizar repositorios existentes para entender su estructura, tecnologías y estado actual.

### 2.1 Crear Módulo de Análisis

**Archivos nuevos**: `backend/src/modules/codebase-analysis/`

```
codebase-analysis/
├── codebase-analysis.module.ts
├── codebase-analysis.service.ts
├── codebase-analysis.controller.ts
├── analyzers/
│   ├── structure.analyzer.ts      // Estructura de carpetas
│   ├── dependencies.analyzer.ts   // package.json, requirements.txt, etc.
│   ├── tech-stack.analyzer.ts     // Detectar frameworks/lenguajes
│   └── patterns.analyzer.ts       // Detectar patrones de código
├── dto/
│   └── analysis-result.dto.ts
└── codebase-analysis.service.spec.ts
```

### 2.2 Servicio de Análisis

**Archivo**: `codebase-analysis.service.ts`

```typescript
// Método principal:
async analyzeRepository(owner: string, repo: string, accessToken: string): Promise<CodebaseAnalysis>

// CodebaseAnalysis interface:
{
  structure: {
    hasBackend: boolean,
    hasFrontend: boolean,
    isMonorepo: boolean,
    directories: string[]
  },
  techStack: {
    languages: { name: string, percentage: number }[],
    frameworks: string[],
    databases: string[],
    testing: string[]
  },
  dependencies: {
    production: { name: string, version: string }[],
    development: { name: string, version: string }[],
    outdated: { name: string, current: string, latest: string }[]
  },
  codeQuality: {
    hasLinting: boolean,
    hasTypeScript: boolean,
    hasTests: boolean,
    testCoverage?: number
  },
  suggestions: string[]  // Sugerencias iniciales basadas en análisis
}
```

### 2.3 Analizadores Específicos

**Detectores por archivo**:
| Archivo | Detecta |
|---------|---------|
| `package.json` | Node.js, dependencias npm, scripts |
| `requirements.txt` / `pyproject.toml` | Python, dependencias pip |
| `go.mod` | Go, módulos |
| `Cargo.toml` | Rust |
| `tsconfig.json` | TypeScript |
| `.eslintrc*` | ESLint config |
| `jest.config.*` | Jest testing |
| `docker-compose.yml` | Docker |
| `prisma/schema.prisma` | Prisma ORM |
| `.env.example` | Variables de entorno |

### 2.4 Endpoint de Análisis

```typescript
POST /api/codebase-analysis/:owner/:repo
  - Body: { branch?: string }
  - Response: CodebaseAnalysis
  - Cache: 1 hora (evitar re-análisis frecuente)
```

### Entregables Fase 2:
- [ ] Módulo `codebase-analysis` completo
- [ ] 4 analizadores especializados
- [ ] Endpoint POST para análisis
- [ ] Sistema de cache para análisis
- [ ] Tests unitarios (mocks de GitHub API)

---

## FASE 3: Backend - Importación de Proyectos

**Objetivo**: Crear proyectos en VibeIA desde repositorios existentes.

### 3.1 Extender Projects Controller

**Modificar**: `backend/src/modules/projects/projects.controller.ts`

```typescript
// Endpoint nuevo:
POST /api/projects/import
  Body: {
    githubRepoFullName: string,    // "owner/repo"
    branch?: string,               // default: default_branch
    name?: string,                 // override nombre
    description?: string           // override descripción
  }
  Response: Project (con análisis adjunto)
```

### 3.2 Extender Projects Service

**Modificar**: `backend/src/modules/projects/projects.service.ts`

```typescript
// Método nuevo:
async importFromGitHub(
  userId: string,
  repoFullName: string,
  options?: { branch?: string, name?: string, description?: string }
): Promise<Project>

// Flujo:
1. Verificar que usuario tiene GitHub conectado
2. Verificar acceso al repositorio
3. Obtener detalles del repo (nombre, descripción, branch default)
4. Ejecutar análisis de codebase
5. Crear Project en MongoDB con:
   - repositoryUrl: URL del repo
   - githubRepoId: ID del repo
   - metadata.imported: true
   - metadata.analysis: CodebaseAnalysis
   - metadata.importedAt: Date
6. Retornar proyecto creado
```

### 3.3 DTO de Importación

**Archivo nuevo**: `backend/src/modules/projects/dto/import-project.dto.ts`

```typescript
export class ImportProjectDto {
  @IsString()
  @IsNotEmpty()
  githubRepoFullName: string;  // "owner/repo"

  @IsString()
  @IsOptional()
  branch?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

### 3.4 Actualizar Schema de Project

**Modificar**: `backend/src/modules/projects/projects.schema.ts`

```typescript
// Agregar campos:
@Prop({ type: Object })
metadata: {
  imported?: boolean,
  importedAt?: Date,
  analysis?: CodebaseAnalysis,
  originalBranch?: string,
  // ... otros campos existentes
}
```

### Entregables Fase 3:
- [ ] Endpoint `POST /api/projects/import`
- [ ] `ImportProjectDto` con validaciones
- [ ] `importFromGitHub` en ProjectsService
- [ ] Schema actualizado con campos de importación
- [ ] Tests de integración

---

## FASE 4: Backend - Generación de Planes Contextuales

**Objetivo**: Generar planes que consideren el código existente del repositorio.

### 4.1 Extender Plans Service

**Modificar**: `backend/src/modules/plans/plans.service.ts`

```typescript
// Modificar generatePlan para aceptar análisis:
async generatePlan(createPlanDto: CreatePlanDto): Promise<Plan> {
  // Si el proyecto fue importado, incluir análisis en el prompt
  const project = await this.projectsService.findOne(createPlanDto.projectId);

  if (project.metadata?.imported) {
    // Incluir contexto del codebase existente
    const enhancedWizardData = {
      ...createPlanDto.wizardData,
      existingCodebase: project.metadata.analysis
    };
    return this.llmService.generatePlanWithContext(enhancedWizardData, userConfig);
  }

  // Flujo normal para proyectos nuevos
  return this.llmService.generatePlan(createPlanDto.wizardData, userConfig);
}
```

### 4.2 Nuevo Prompt Template para LLM

**Modificar**: `backend/src/modules/llm/llm.service.ts`

```typescript
// Template nuevo para proyectos importados:
const IMPORTED_PROJECT_PROMPT = `
Estás analizando un proyecto existente con las siguientes características:

## Análisis del Codebase Actual
- Estructura: ${analysis.structure}
- Tech Stack: ${analysis.techStack}
- Dependencias: ${analysis.dependencies}
- Calidad: ${analysis.codeQuality}

## Objetivo del Usuario
${wizardData.stage1.description}

## Requisitos de Negocio
${wizardData.stage2}

## Genera un plan que:
1. Respete la arquitectura existente
2. No rompa funcionalidad actual
3. Sugiera mejoras incrementales
4. Identifique refactoring necesario
5. Agregue nuevas features de forma modular
`;
```

### 4.3 Tipos de Planes para Proyectos Importados

El usuario podrá elegir el tipo de plan:

| Tipo | Descripción |
|------|-------------|
| `feature` | Agregar nueva funcionalidad |
| `refactor` | Mejorar código existente |
| `fix` | Corregir bugs o issues |
| `upgrade` | Actualizar dependencias/framework |
| `optimize` | Mejorar performance |
| `security` | Mejoras de seguridad |

### 4.4 Actualizar CreatePlanDto

**Modificar**: `backend/src/modules/plans/dto/create-plan.dto.ts`

```typescript
export class CreatePlanDto {
  projectId: string;
  userId: string;

  // Nuevo campo para proyectos importados:
  planType?: 'new' | 'feature' | 'refactor' | 'fix' | 'upgrade' | 'optimize' | 'security';

  wizardData: {
    stage1: { projectName: string; description: string };
    stage2: Record<string, string>;
    stage3: { selectedArchetypes: string[] };
    // Nuevo: contexto específico para importados
    importContext?: {
      focusAreas?: string[];      // Áreas del código a modificar
      excludeAreas?: string[];    // Áreas a no tocar
      preservePatterns?: boolean; // Mantener patrones existentes
    };
  };
}
```

### Entregables Fase 4:
- [ ] `generatePlanWithContext` en LlmService
- [ ] Prompt templates para proyectos importados
- [ ] `planType` en CreatePlanDto
- [ ] `importContext` en wizardData
- [ ] Tests con mocks de LLM

---

## FASE 5: Frontend - UI de Importación

**Objetivo**: Crear la interfaz de usuario para importar y gestionar proyectos existentes.

### 5.1 Página de Conexión GitHub

**Archivo nuevo**: `frontend/src/app/settings/github/page.tsx`

```tsx
// Componente para:
- Ver estado de conexión GitHub
- Botón "Conectar con GitHub" (OAuth)
- Botón "Desconectar"
- Lista de permisos otorgados
```

### 5.2 Modal/Página de Importación

**Archivo nuevo**: `frontend/src/app/import-project/page.tsx`

```tsx
// Flujo en 3 pasos:
1. Buscar/Seleccionar repositorio
   - Lista de repos del usuario
   - Buscador
   - Filtros (lenguaje, fecha)

2. Configurar importación
   - Seleccionar branch
   - Override nombre/descripción
   - Ver preview del análisis

3. Confirmar
   - Resumen de lo que se importará
   - Botón "Importar Proyecto"
```

### 5.3 Componentes de UI

**Archivos nuevos**: `frontend/src/components/import/`

```
import/
├── RepoSelector.tsx        // Lista de repos con búsqueda
├── RepoCard.tsx            // Card de un repo individual
├── BranchSelector.tsx      // Dropdown de branches
├── AnalysisPreview.tsx     // Preview del análisis de codebase
├── ImportConfirmation.tsx  // Resumen y confirmación
└── GitHubConnectButton.tsx // Botón de conexión OAuth
```

### 5.4 Actualizar Dashboard

**Modificar**: `frontend/src/app/dashboard/page.tsx`

```tsx
// Agregar botón "Import Project" junto a "New Project":
<div className="flex gap-2">
  <Link href="/new-project">New Project</Link>
  <Link href="/import-project">Import from GitHub</Link>
</div>

// Indicador visual para proyectos importados vs nuevos
{project.metadata?.imported && (
  <Badge>Imported</Badge>
)}
```

### 5.5 Actualizar API Client

**Modificar**: `frontend/src/lib/api-client.ts`

```typescript
// Agregar métodos:
export const gitApi = {
  listRepos: () => api.get('/git/repos'),
  getRepo: (owner: string, repo: string) => api.get(`/git/repos/${owner}/${repo}`),
  getRepoTree: (owner: string, repo: string) => api.get(`/git/repos/${owner}/${repo}/tree`),
};

export const githubAuthApi = {
  getAuthUrl: () => api.get('/auth/github'),
  getStatus: () => api.get('/auth/github/status'),
  disconnect: () => api.delete('/auth/github'),
};

export const projectsApi = {
  // Existentes...
  import: (data: ImportProjectDto) => api.post('/projects/import', data),
};

export const codebaseApi = {
  analyze: (owner: string, repo: string) => api.post(`/codebase-analysis/${owner}/${repo}`),
};
```

### 5.6 Wizard Adaptado para Importados

**Modificar**: `frontend/src/components/wizard/`

Para proyectos importados, el wizard cambia:

| Stage | Proyecto Nuevo | Proyecto Importado |
|-------|---------------|-------------------|
| 1 | Nombre + Descripción | **SKIP** (viene del repo) |
| 2 | Business Questions | Business Questions + Tipo de Plan |
| 3 | Technical Archetypes | Technical + Focus Areas |
| 4 | Preview + Crear Repo | Preview (repo ya existe) |

**Archivo nuevo**: `frontend/src/components/wizard/ImportedProjectWizard.tsx`

```tsx
// Wizard simplificado para proyectos importados:
- Stage 1: Mostrar análisis del codebase + seleccionar tipo de plan
- Stage 2: Business questions adaptadas al tipo de plan
- Stage 3: Seleccionar áreas de focus + archetypes relevantes
- Stage 4: Preview del plan generado
```

### Entregables Fase 5:
- [ ] Página `/settings/github` con OAuth
- [ ] Página `/import-project` con flujo de 3 pasos
- [ ] 6 componentes de UI para importación
- [ ] Dashboard actualizado con botón Import
- [ ] API client extendido
- [ ] Wizard adaptado para importados
- [ ] Tests de componentes

---

## Resumen de Archivos

### Archivos Nuevos (Backend)
| Archivo | Descripción |
|---------|-------------|
| `git/git.controller.ts` | Endpoints REST para GitHub |
| `git/dto/github.dto.ts` | DTOs de GitHub |
| `auth/github-auth.controller.ts` | OAuth con GitHub |
| `codebase-analysis/codebase-analysis.module.ts` | Módulo de análisis |
| `codebase-analysis/codebase-analysis.service.ts` | Lógica de análisis |
| `codebase-analysis/codebase-analysis.controller.ts` | Endpoint de análisis |
| `codebase-analysis/analyzers/*.ts` | 4 analizadores |
| `projects/dto/import-project.dto.ts` | DTO de importación |

### Archivos Nuevos (Frontend)
| Archivo | Descripción |
|---------|-------------|
| `app/settings/github/page.tsx` | Conexión GitHub |
| `app/import-project/page.tsx` | Página de importación |
| `components/import/RepoSelector.tsx` | Selector de repos |
| `components/import/RepoCard.tsx` | Card de repo |
| `components/import/BranchSelector.tsx` | Selector de branch |
| `components/import/AnalysisPreview.tsx` | Preview de análisis |
| `components/import/ImportConfirmation.tsx` | Confirmación |
| `components/import/GitHubConnectButton.tsx` | Botón OAuth |
| `components/wizard/ImportedProjectWizard.tsx` | Wizard para importados |

### Archivos Modificados
| Archivo | Cambios |
|---------|---------|
| `git/git.service.ts` | +5 métodos |
| `git/git.module.ts` | Exportar controller |
| `projects/projects.controller.ts` | +1 endpoint |
| `projects/projects.service.ts` | +1 método |
| `projects/projects.schema.ts` | +campos metadata |
| `plans/plans.service.ts` | Soporte contexto |
| `plans/dto/create-plan.dto.ts` | +planType, importContext |
| `llm/llm.service.ts` | +generatePlanWithContext |
| `frontend/lib/api-client.ts` | +4 APIs |
| `frontend/app/dashboard/page.tsx` | +botón Import |

---

## Variables de Entorno Nuevas

```bash
# Backend (Render)
GITHUB_CLIENT_ID=xxxxx          # OAuth App ID
GITHUB_CLIENT_SECRET=xxxxx      # OAuth App Secret
GITHUB_CALLBACK_URL=https://vibeia.onrender.com/api/auth/github/callback

# Frontend (Vercel)
# No se requieren nuevas variables
```

---

## Orden de Implementación Recomendado

```
Fase 1 (GitHub API) ──────────────────────────────────────────┐
     │                                                         │
     ▼                                                         │
Fase 2 (Análisis) ─────────────────────────────────────────────┤
     │                                                         │
     ▼                                                         │
Fase 3 (Importación) ──────────────────────────────────────────┤
     │                                                         │
     ▼                                                         │
Fase 4 (Planes Contextuales) ──────────────────────────────────┤
     │                                                         │
     ▼                                                         │
Fase 5 (Frontend UI) ──────────────────────────────────────────┘
```

**Dependencias**:
- Fase 2 depende de Fase 1 (necesita API de GitHub)
- Fase 3 depende de Fase 2 (necesita análisis)
- Fase 4 depende de Fase 3 (necesita proyectos importados)
- Fase 5 depende de Fases 1-4 (necesita todos los endpoints)

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Rate limits de GitHub API | Media | Alto | Implementar cache + retry con backoff |
| Repos muy grandes | Media | Medio | Limitar análisis a archivos clave, paginar |
| Tokens GitHub expiran | Alta | Medio | Refresh automático, UI para reconectar |
| Análisis incorrecto | Media | Bajo | Permitir edición manual del análisis |
| LLM no entiende contexto | Baja | Alto | Mejorar prompts, tests con repos reales |

---

## Métricas de Éxito

- [ ] Usuario puede conectar cuenta GitHub en < 30 segundos
- [ ] Listar repos del usuario en < 2 segundos
- [ ] Análisis de repo completo en < 30 segundos
- [ ] Importar proyecto en < 10 segundos
- [ ] Plan generado considera código existente (validación manual)

---

## Próximos Pasos

1. **Aprobación del plan** - Revisar y aprobar este documento
2. **Crear GitHub OAuth App** - En GitHub Developer Settings
3. **Implementar Fase 1** - Comenzar con git.controller.ts
4. **Testing incremental** - Tests por cada fase
5. **Deploy por fase** - Deploy a producción después de cada fase completa

---

*Documento creado: 2024-12-09*
*Última actualización: 2024-12-09*
