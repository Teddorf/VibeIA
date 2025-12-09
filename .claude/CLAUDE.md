# CLAUDE.md - VibeIA Project Context

> **IMPORTANTE**: Este archivo debe actualizarse con cada modificación significativa del proyecto. Mantener sincronizado con el estado actual del código.

## 🚀 URLs de Producción

| Servicio | URL | Estado |
|----------|-----|--------|
| **Frontend** | https://frontend-delta-drab-99.vercel.app | ✅ Live |
| **Backend API** | https://vibeia.onrender.com | ✅ Live |
| **Database** | MongoDB Atlas (cluster0.31tgodn.mongodb.net) | ✅ Conectado |

### Links Rápidos
- **Login**: https://frontend-delta-drab-99.vercel.app/login
- **Register**: https://frontend-delta-drab-99.vercel.app/register
- **Dashboard**: https://frontend-delta-drab-99.vercel.app/dashboard
- **API Health**: https://vibeia.onrender.com/api/recommendations/database/providers

> **Nota**: El backend en Render (free tier) se duerme después de 15 min de inactividad. El primer request tarda ~30 segundos en despertar.

## Descripción del Proyecto

**VibeIA** (Vibe Coding Platform) es una plataforma de generación de código impulsada por IA que guía a los usuarios a través de un wizard de 4 etapas para crear prompts ultra-granulares, orquesta agentes de IA para generación de código, aplica quality gates de nivel enterprise y gestiona tareas manuales de forma transparente.

## Stack Tecnológico

### Backend
- **Framework**: NestJS 11 (Node.js)
- **Lenguaje**: TypeScript 5.7
- **Base de datos**: MongoDB Atlas (cloud)
- **Autenticación**: Passport.js + JWT (access + refresh tokens)
- **Real-time**: Socket.io con WebSocket gateway
- **LLM**: Anthropic (Claude), OpenAI (GPT-4), Google Gemini
- **Git**: Octokit (GitHub API)
- **Testing**: Jest
- **Hosting**: Render (free tier)

### Frontend
- **Framework**: Next.js 15.1.3 (React 19, App Router)
- **Lenguaje**: TypeScript 5
- **Estilos**: Tailwind CSS v3.4.18, shadcn/ui (Radix)
- **Estado**: React Context API (AuthContext)
- **HTTP**: Axios con interceptors
- **Real-time**: Socket.io client
- **Testing**: Jest + React Testing Library
- **Hosting**: Vercel

### Infraestructura de Producción
- **Frontend**: Vercel (gratis, CDN global)
- **Backend**: Render (free tier, 750 hrs/mes)
- **Database**: MongoDB Atlas (free tier, 512MB)

## Estructura del Proyecto

```
VibeIA/
├── backend/                    # API NestJS
│   ├── Dockerfile              # Docker config para Render
│   └── src/
│       ├── main.ts            # Entry point (puerto 10000)
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
│           ├── teams/         # Colaboración en equipo
│           ├── security/      # Escaneo de seguridad
│           ├── billing/       # Gestión de facturación
│           ├── error-handling/# Manejo de errores
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
├── docker-compose.yml          # Solo para desarrollo local
├── implementation_plan.md      # Plan de implementación
└── .claude/CLAUDE.md          # Este archivo
```

## Módulos Principales

### Auth Module (`backend/src/modules/auth/`)
- Autenticación JWT con access + refresh tokens
- Password hashing con bcrypt
- Guards globales con decorador `@Public()` para opt-out
- Role-based access control con `@Roles()`

**Endpoints** (Base: `https://vibeia.onrender.com`):
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

### Teams Module (`backend/src/modules/teams/`)
- CRUD de equipos
- Gestión de miembros
- Sistema de invitaciones
- Conexiones Git (GitHub, GitLab, Bitbucket)

### Security Module (`backend/src/modules/security/`)
- Escaneo de secretos en código
- Detección de vulnerabilidades
- Validación de headers de seguridad
- Gestión de credenciales
- Rate limiting

## Modelos de Datos (MongoDB Atlas)

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

## Comandos de Desarrollo Local

```bash
# Backend (desarrollo local)
cd backend
npm install
npm run start:dev      # http://localhost:3001
npm run build          # Build producción
npm run test           # Tests unitarios
npm run test:cov       # Coverage

# Frontend (desarrollo local)
cd frontend
npm install
npm run dev            # http://localhost:3000
npm run build          # Build producción
npm run test           # Tests componentes

# Docker (desarrollo local opcional)
docker-compose up -d   # Levantar todos los servicios
docker-compose down    # Detener servicios
```

## Variables de Entorno en Producción

### Backend (Render)
```bash
NODE_ENV=production
PORT=10000
MONGO_URI=mongodb+srv://VibeIA_db:xxxxx@cluster0.31tgodn.mongodb.net/vibecoding
JWT_SECRET=vibeia-jwt-secret-key-prod-2024-secure
JWT_REFRESH_SECRET=vibeia-refresh-secret-key-prod-2024-secure
FRONTEND_URL=https://frontend-delta-drab-99.vercel.app

# Opcional: LLM APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
GITHUB_TOKEN=ghp_...
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://vibeia.onrender.com
```

## Deployment

### Arquitectura de Producción

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Vercel       │────▶│    Render       │────▶│  MongoDB Atlas  │
│   (Frontend)    │     │   (Backend)     │     │   (Database)    │
│    Next.js      │     │    NestJS       │     │    MongoDB      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
   CDN Global              Docker Container
   Auto-deploy             Free Tier (750h)
```

### Render Service Config
- **Service ID**: `srv-d4ro4echg0os73d4pho0`
- **Root Directory**: `backend`
- **Dockerfile Path**: `./Dockerfile`
- **Docker Command**: `node dist/src/main.js`
- **Port**: 10000

### Vercel Config
- **Root Directory**: `frontend`
- **Framework**: Next.js (auto-detectado)
- **Build Command**: `npm run build`

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
| Phase 10 | ✅ | Security & Billing Modules |
| Phase 11 | ✅ | Teams & Collaboration |
| Deployment | ✅ | Producción en Vercel + Render + MongoDB Atlas |

## Flujo de Usuario

1. **Login/Register** → https://frontend-delta-drab-99.vercel.app/login
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
6. Push a GitHub → auto-deploy en Render

### Al modificar modelos:
1. Actualizar schema en `backend/src/modules/*/`
2. Actualizar sección "Modelos de Datos" aquí
3. Verificar que los tests pasen

### Al agregar features frontend:
1. Crear componente en directorio apropiado
2. Agregar a `lib/api-client.ts` si requiere API
3. Agregar tests en `__tests__/`
4. Push a GitHub → auto-deploy en Vercel
5. Actualizar este archivo

### Troubleshooting Deployment

**Backend no responde:**
1. Verificar logs en Render Dashboard
2. El free tier se duerme después de 15 min - esperar ~30s
3. Verificar que MONGO_URI esté correctamente configurado

**CORS errors:**
1. Verificar que `FRONTEND_URL` en Render coincida con URL de Vercel
2. Redeploy backend después de cambiar variables

**MongoDB connection failed:**
1. Verificar Network Access en MongoDB Atlas (0.0.0.0/0)
2. Verificar usuario/contraseña en connection string

---

**Última actualización**: Deployment completo a producción (Vercel + Render + MongoDB Atlas)

**Próximos pasos sugeridos**:
- Configurar dominio personalizado
- Integración con más proveedores cloud
- Sistema de templates de proyectos
- Analytics y métricas de uso
- Mejoras de UX basadas en feedback