# CLAUDE.md - VibeIA Project Context

> **IMPORTANTE**: Este archivo debe actualizarse con cada modificación significativa del proyecto. Mantener sincronizado con el estado actual del código.

## Descripción del Proyecto

**VibeIA** (Vibe Coding Platform) es una plataforma de generación de código impulsada por IA que guía a los usuarios a través de un wizard de 4 etapas para crear prompts ultra-granulares, orquesta agentes de IA para generación de código, aplica quality gates de nivel enterprise y gestiona tareas manuales de forma transparente.

## Stack Tecnológico

### Backend
- **Framework**: NestJS 11 (Node.js)
- **Lenguaje**: TypeScript 5.7
- **Base de datos**: MongoDB con Mongoose ODM
- **Autenticación**: Passport.js + JWT (access + refresh tokens)
- **Real-time**: Socket.io con WebSocket gateway
- **LLM**: Anthropic (Claude), OpenAI (GPT-4), Google Gemini
- **Git**: Octokit (GitHub API)
- **Testing**: Jest

### Frontend
- **Framework**: Next.js 15.1.3 (React 19, App Router)
- **Lenguaje**: TypeScript 5
- **Estilos**: Tailwind CSS v3.4.18, shadcn/ui (Radix)
- **Estado**: React Context API (AuthContext)
- **HTTP**: Axios con interceptors
- **Real-time**: Socket.io client
- **Testing**: Jest + React Testing Library

### Infraestructura
- **Containerización**: Docker + Docker Compose
- **Servicios**: MongoDB, Redis
- **Puertos**: Frontend (3000), Backend (3001), MongoDB (27017), Redis (6379)

### Deployment (Producción - Gratis)
- **Frontend**: Vercel (Next.js optimizado)
- **Backend**: Render (free tier, 750 hrs/mes)
- **Database**: MongoDB Atlas (free tier, 512MB)
- **Configuración**: `frontend/vercel.json`, `backend/render.yaml`

## Estructura del Proyecto

```
VibeIA/
├── backend/                    # API NestJS
│   └── src/
│       ├── main.ts            # Entry point
│       ├── app.module.ts      # Root module
│       └── modules/
│           ├── auth/          # Autenticación JWT
│           ├── users/         # Gestión de usuarios
│           ├── projects/      # Gestión de proyectos
│           ├── plans/         # Generación de planes
│           ├── execution/     # Motor de ejecución
│           ├── llm/           # Orquestador multi-LLM
│           ├── git/           # Integración GitHub
│           ├── quality-gates/ # Validación de código
│           ├── manual-tasks/  # Tareas manuales
│           ├── recommendations/ # Recomendaciones infra
│           ├── documentation/ # Generación de docs
│           ├── setup/         # Setup automatizado
│           └── events/        # WebSocket gateway
│
├── frontend/                   # App Next.js
│   └── src/
│       ├── app/               # App Router pages
│       │   ├── (auth)/        # Login/Register
│       │   ├── dashboard/     # Dashboard principal
│       │   ├── new-project/   # Crear proyecto
│       │   └── projects/      # Detalle proyecto
│       ├── components/
│       │   ├── layout/        # Header, navegación
│       │   ├── wizard/        # 4 stages del wizard
│       │   ├── execution/     # Dashboard ejecución
│       │   └── ui/            # shadcn/ui components
│       ├── contexts/          # AuthContext
│       └── lib/               # API client, utils
│
├── docker-compose.yml
├── implementation_plan.md      # Plan de implementación
└── CLAUDE.md                   # Este archivo
```

## Módulos Principales

### Auth Module (`backend/src/modules/auth/`)
- Autenticación JWT con access + refresh tokens
- Password hashing con bcrypt
- Guards globales con decorador `@Public()` para opt-out
- Role-based access control con `@Roles()`

**Endpoints**:
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Usuario actual

### Plans Module (`backend/src/modules/plans/`)
- Generación de planes ultra-granulares vía LLM
- Tareas de ~10 minutos con dependencias
- Fases con estimación de tiempo

**Endpoints**:
- `POST /api/plans/generate` - Generar plan desde wizard
- `GET /api/plans` - Listar planes (filtro projectId)
- `GET /api/plans/:id` - Detalle de plan
- `PATCH /api/plans/:id` - Actualizar estado

### Execution Module (`backend/src/modules/execution/`)
- Ejecución fase por fase, tarea por tarea
- Estados: running, paused, completed, failed
- Pause/resume con razón de pausa
- Quality gates antes de completar tareas
- Eventos WebSocket en tiempo real

**Endpoints**:
- `POST /api/execution/:planId/start` - Iniciar ejecución
- `GET /api/execution/:planId/status` - Estado actual
- `POST /api/execution/:planId/pause` - Pausar
- `POST /api/execution/:planId/resume` - Reanudar

### LLM Module (`backend/src/modules/llm/`)
- Orquestador multi-proveedor con fallback automático
- Proveedores: Anthropic (primario), Gemini, OpenAI
- Generación de planes y código

### Quality Gates (`backend/src/modules/quality-gates/`)
- **Lint**: console statements, debugger, TODO, any types
- **Security**: secrets hardcoded, SQL injection, XSS, eval
- **Tests**: estructura, assertions, .only/.skip, coverage

### Recommendations (`backend/src/modules/recommendations/`)
- Recomendación de base de datos (Neon, Supabase, PlanetScale, MongoDB Atlas)
- Recomendación de deploy (Vercel, Netlify, Railway, Render, Fly.io)
- Cálculo de costos por fase (MVP, Growth, Scale)

### Setup (`backend/src/modules/setup/`)
- Setup automatizado de Neon, Vercel, Railway
- Orquestación con rollback automático
- Generación de archivo .env

### Documentation (`backend/src/modules/documentation/`)
- Generación de README, ADRs, Changelog
- Diagramas Mermaid (secuencia, flujo, ERD, clases)
- OpenAPI 3.0.3 docs

## Modelos de Datos (MongoDB)

### User
```typescript
{
  email: string (unique)
  name: string
  password: string (bcrypt)
  githubId?: string
  githubAccessToken?: string
  projects: string[]
  refreshTokens?: string[]
  isActive: boolean
  lastLogin?: Date
}
```

### Project
```typescript
{
  name: string
  description?: string
  ownerId: string (ref User)
  repositoryUrl?: string
  githubRepoId?: string
  status: 'active' | 'archived'
  metadata?: Record<string, any>
}
```

### Plan
```typescript
{
  projectId: string
  userId: string
  wizardData: {
    stage1: { projectName, description }
    stage2: Record<string, string> // Business questions
    stage3: { selectedArchetypes, plan }
  }
  phases: [{
    name: string
    tasks: [{
      id, name, description
      estimatedTime: number (minutes)
      dependencies: string[]
      status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'
    }]
    estimatedTime: number
    status: 'pending' | 'in_progress' | 'completed'
  }]
  estimatedTime: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'
}
```

## WebSocket Events (Socket.io `/execution`)

**Suscripción**:
- `subscribe_execution { planId }`
- `unsubscribe_execution { planId }`

**Eventos recibidos**:
- `status_update` - Cambio de estado con progreso
- `task_started` - Tarea iniciada
- `task_completed` - Tarea completada
- `task_failed` - Tarea fallida
- `phase_completed` - Fase completada
- `execution_completed` - Ejecución completa
- `log` - Logs de ejecución
- `error` - Errores

## Comandos Principales

```bash
# Backend
cd backend
npm install
npm run start:dev      # Desarrollo (hot-reload)
npm run build          # Build producción
npm run test           # Tests unitarios
npm run test:cov       # Coverage

# Frontend
cd frontend
npm install
npm run dev            # Desarrollo
npm run build          # Build producción
npm run test           # Tests componentes

# Docker (desarrollo local)
docker-compose up -d   # Levantar todos los servicios
docker-compose down    # Detener servicios
```

## Deployment a Producción (100% Gratis)

### Paso 1: MongoDB Atlas (Base de datos)

1. Ir a [mongodb.com/atlas](https://mongodb.com/atlas) → Create Account
2. Create Cluster → **M0 Free Tier** (512MB gratis)
3. Database Access → Add User (username/password)
4. Network Access → Add IP → **Allow Access from Anywhere** (0.0.0.0/0)
5. Connect → Drivers → Copiar connection string:
   ```
   mongodb+srv://usuario:password@cluster.xxxxx.mongodb.net/vibecoding
   ```

### Paso 2: Backend → Render

1. Ir a [render.com](https://render.com) → Create Account
2. New → **Web Service** → Connect GitHub repo
3. Configurar:
   - **Name**: vibeia-backend
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: **Free**
4. Environment Variables:
   ```
   NODE_ENV=production
   PORT=3001
   MONGO_URI=mongodb+srv://...  (de MongoDB Atlas)
   JWT_SECRET=genera-string-seguro-32-chars
   JWT_REFRESH_SECRET=otro-string-seguro-diferente
   ANTHROPIC_API_KEY=sk-ant-...
   FRONTEND_URL=https://pendiente.vercel.app
   ```
5. Create Web Service → Copiar URL (ej: `https://vibeia-backend.onrender.com`)

> **Nota**: El free tier de Render se duerme tras 15 min de inactividad. El primer request tarda ~30 seg en despertar.

### Paso 3: Frontend → Vercel

1. Ir a [vercel.com](https://vercel.com) → Create Account
2. Add New Project → Import GitHub repo
3. Configurar:
   - **Root Directory**: `frontend`
   - **Framework**: Next.js (auto-detectado)
4. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://vibeia-backend.onrender.com
   ```
5. Deploy → Copiar URL (ej: `https://vibeia.vercel.app`)

### Paso 4: Actualizar referencias cruzadas

1. En **Render** → Environment → Actualizar:
   ```
   FRONTEND_URL=https://tu-app.vercel.app
   ```
2. Redeploy en Render para aplicar CORS

## Variables de Entorno

### Backend (.env)
```
MONGO_URI=mongodb://localhost:27017/vibecoding
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
GITHUB_TOKEN=ghp_...
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Convenciones de Código

### Nomenclatura
- **Servicios**: PascalCase + "Service" (`PlansService`)
- **Controladores**: PascalCase + "Controller" (`PlansController`)
- **Decoradores**: camelCase con @ (`@Public()`, `@Roles()`)
- **Rutas API**: REST con prefijo `/api/`
- **Eventos**: snake_case (`status_update`, `task_started`)

### Archivos
- `*.controller.ts` - Controladores HTTP
- `*.service.ts` - Lógica de negocio
- `*.schema.ts` - Esquemas MongoDB
- `*.dto.ts` - Data Transfer Objects
- `*.spec.ts` - Tests unitarios
- `*.test.tsx` - Tests de componentes

### Testing
- Tests unitarios junto al código fuente
- Mocks para servicios externos (LLM, Git, DB)
- React Testing Library para componentes
- 197+ tests backend, 83+ tests frontend

## Estado de Implementación

| Fase | Estado | Descripción |
|------|--------|-------------|
| Phase 1 | ✅ | Core Platform & Wizard (4 stages) |
| Phase 2 | ✅ | Execution Engine & Git Integration |
| Phase 3 | ✅ | Manual Tasks & Quality Gates |
| Phase 4 | ✅ | Auth, Real-time Updates & Testing |
| Phase 5 | ✅ | Dashboard & Project Management |
| Phase 6 | ✅ | Infrastructure Recommendations |
| Phase 7 | ✅ | Automated Documentation System |
| Phase 8 | ✅ | Automated Setup System |
| Phase 9 | ✅ | Error Handling & Rollback System |

## Flujo de Usuario

1. **Landing Page** → Registro/Login
2. **Dashboard** → Ver proyectos y planes
3. **New Project** → Wizard de 4 etapas:
   - Stage 1: Intent (nombre, descripción)
   - Stage 2: Business Analysis (5 preguntas)
   - Stage 3: Technical Analysis + Recomendaciones
   - Stage 4: Preview del plan
4. **Execution Dashboard** → Monitoreo en tiempo real
5. **Manual Tasks** → Guía paso a paso cuando se requiere
6. **Project Detail** → Ver historial y estado

## Notas para Desarrollo

### Al agregar un nuevo módulo:
1. Crear carpeta en `backend/src/modules/`
2. Crear controller, service, module, tests
3. Importar en `app.module.ts`
4. Documentar endpoints en este archivo
5. Agregar tests unitarios

### Al modificar modelos:
1. Actualizar schema en `backend/src/modules/*/`
2. Actualizar sección "Modelos de Datos" aquí
3. Verificar que los tests pasen

### Al agregar features frontend:
1. Crear componente en directorio apropiado
2. Agregar a `lib/api-client.ts` si requiere API
3. Agregar tests en `__tests__/`
4. Actualizar este archivo

---

**Última actualización**: Phase 9 completado - Error Handling & Rollback System + Configuración de deployment

**Próximos pasos sugeridos**:
- Integración con más proveedores cloud
- Sistema de templates de proyectos
- Analytics y métricas de uso
- Mejoras de UX basadas en feedback