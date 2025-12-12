# Vibe Coding Platform - Flujos de Navegabilidad Frontend

## Documento de Especificación para Implementación

---

## 1. Arquitectura General de Navegación

### 1.1 Estructura de Rutas Principal

```
/                           → Landing Page (público)
/auth                       → Flujos de autenticación
  /login                    → Login
  /register                 → Registro
  /forgot-password          → Recuperar contraseña
  /reset-password/:token    → Restablecer contraseña
  /verify-email/:token      → Verificar email
  /oauth/callback/:provider → Callback OAuth

/dashboard                  → Dashboard principal (autenticado)
/projects                   → Gestión de proyectos
  /new                      → Crear nuevo proyecto
  /import                   → Importar proyecto existente
  /:projectId               → Vista de proyecto
    /intention              → Fase 1: Declaración de intención
    /business-analysis      → Fase 2: Análisis de negocio
    /technical-analysis     → Fase 3: Análisis técnico
    /execution              → Fase 4: Ejecución
    /tasks                  → Lista de tareas
    /settings               → Configuración del proyecto
    /integrations           → Integraciones del proyecto
    /team                   → Gestión de equipo
    /analytics              → Analíticas del proyecto

/settings                   → Configuración global
  /profile                  → Perfil de usuario
  /billing                  → Facturación
  /integrations             → Integraciones globales
  /api-keys                 → Gestión de API keys
  /notifications            → Preferencias de notificaciones
  /security                 → Seguridad (2FA, sesiones)

/admin                      → Panel de administración
  /users                    → Gestión de usuarios
  /analytics                → Analíticas de plataforma
  /system                   → Configuración del sistema
```

---

## 2. Flujo de Autenticación

### 2.1 Registro de Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUJO DE REGISTRO                            │
└─────────────────────────────────────────────────────────────────┘

[Landing Page]
      │
      ▼
┌─────────────┐     ┌──────────────────────────────────────────┐
│  /register  │────▶│  Formulario de Registro                   │
└─────────────┘     │  ─────────────────────────────────────────│
                    │  • Email                                   │
                    │  • Password (validación en tiempo real)    │
                    │  • Confirm Password                        │
                    │  • Nombre completo                         │
                    │  • Aceptar términos                        │
                    │  ─────────────────────────────────────────│
                    │  [Registrar con Email]                     │
                    │  ─────────────────────────────────────────│
                    │  ── O continuar con ──                     │
                    │  [GitHub] [Google] [GitLab]                │
                    └──────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │  Email   │       │  OAuth   │       │  Error   │
    │  Sent    │       │ Callback │       │ Handler  │
    └──────────┘       └──────────┘       └──────────┘
          │                   │                   │
          ▼                   │                   │
    ┌──────────┐              │           ┌──────────┐
    │  Verify  │              │           │  Mostrar │
    │  Email   │◀─────────────┘           │  Error   │
    └──────────┘                          └──────────┘
          │
          ▼
    ┌──────────────────────────────────────────────┐
    │              ONBOARDING FLOW                  │
    │  ────────────────────────────────────────────│
    │  Paso 1: Preferencias de desarrollo          │
    │    • Lenguajes favoritos                     │
    │    • Frameworks preferidos                   │
    │    • Nivel de experiencia                    │
    │  ────────────────────────────────────────────│
    │  Paso 2: Configurar integraciones            │
    │    • Conectar GitHub/GitLab/Bitbucket        │
    │    • Configurar provider de hosting          │
    │    • Conectar herramientas de CI/CD          │
    │  ────────────────────────────────────────────│
    │  Paso 3: Primer proyecto                     │
    │    • Crear nuevo proyecto                    │
    │    • Importar proyecto existente             │
    │    • Explorar templates                      │
    └──────────────────────────────────────────────┘
          │
          ▼
    ┌──────────┐
    │ Dashboard│
    └──────────┘
```

### 2.2 Login de Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│                       FLUJO DE LOGIN                             │
└─────────────────────────────────────────────────────────────────┘

[Cualquier página protegida sin sesión]
      │
      ▼
┌─────────────┐     ┌──────────────────────────────────────────┐
│   /login    │────▶│  Formulario de Login                      │
└─────────────┘     │  ─────────────────────────────────────────│
                    │  • Email                                   │
                    │  • Password                                │
                    │  • [Recordarme]                            │
                    │  • Olvidé mi contraseña →                  │
                    │  ─────────────────────────────────────────│
                    │  [Iniciar Sesión]                          │
                    │  ─────────────────────────────────────────│
                    │  ── O continuar con ──                     │
                    │  [GitHub] [Google] [GitLab]                │
                    └──────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │  2FA     │       │  Success │       │  Error   │
    │ Required │       │          │       │ Handler  │
    └──────────┘       └──────────┘       └──────────┘
          │                   │
          ▼                   │
    ┌──────────┐              │
    │  2FA     │              │
    │  Input   │              │
    └──────────┘              │
          │                   │
          ▼                   ▼
    ┌─────────────────────────────────────────────┐
    │  Redirect a:                                 │
    │  • returnUrl (si existe)                    │
    │  • /dashboard (default)                     │
    └─────────────────────────────────────────────┘
```

---

## 3. Dashboard Principal

### 3.1 Estructura del Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                      DASHBOARD LAYOUT                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  [Logo] Vibe Coding    [Buscar...]    [Notif] [User ▼]          │
├─────────────────────────────────────────────────────────────────┤
│         │                                                        │
│ SIDEBAR │                    MAIN CONTENT                        │
│         │                                                        │
│ ┌─────┐ │  ┌─────────────────────────────────────────────────┐  │
│ │ 🏠  │ │  │                                                 │  │
│ │Home │ │  │  RESUMEN DE ACTIVIDAD                           │  │
│ └─────┘ │  │  ────────────────────────────────────────────── │  │
│         │  │  [Proyectos Activos: 5] [Tareas Pendientes: 12] │  │
│ ┌─────┐ │  │  [Integraciones: 8]     [Créditos API: 1,234]   │  │
│ │ 📁  │ │  │                                                 │  │
│ │Proj │ │  └─────────────────────────────────────────────────┘  │
│ └─────┘ │                                                        │
│         │  ┌─────────────────────────────────────────────────┐  │
│ ┌─────┐ │  │                                                 │  │
│ │ ⚙️  │ │  │  PROYECTOS RECIENTES                            │  │
│ │Sett │ │  │  ────────────────────────────────────────────── │  │
│ └─────┘ │  │                                                 │  │
│         │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│ ┌─────┐ │  │  │ Proj 1   │ │ Proj 2   │ │ + Nuevo  │         │  │
│ │ 📊  │ │  │  │ ████░░░  │ │ ██████░  │ │          │         │  │
│ │Anal │ │  │  │ 60%      │ │ 85%      │ │ Proyecto │         │  │
│ └─────┘ │  │  └──────────┘ └──────────┘ └──────────┘         │  │
│         │  │                                                 │  │
│         │  └─────────────────────────────────────────────────┘  │
│         │                                                        │
│         │  ┌─────────────────────────────────────────────────┐  │
│         │  │                                                 │  │
│         │  │  ACTIVIDAD RECIENTE                             │  │
│         │  │  ────────────────────────────────────────────── │  │
│         │  │  • Tarea completada: "Setup DB" - hace 5 min    │  │
│         │  │  • PR merged: feat/auth - hace 1 hora           │  │
│         │  │  • Deploy exitoso: production - hace 2 horas    │  │
│         │  │                                                 │  │
│         │  └─────────────────────────────────────────────────┘  │
│         │                                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Flujo de Creación de Nuevo Proyecto

### 4.1 Wizard de Nuevo Proyecto

```
┌─────────────────────────────────────────────────────────────────┐
│                 FLUJO: NUEVO PROYECTO                            │
└─────────────────────────────────────────────────────────────────┘

[Dashboard] ──▶ [+ Nuevo Proyecto]
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  PASO 1/4: TIPO DE PROYECTO                                     │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │                 │  │                 │  │                 │  │
│  │  🆕 NUEVO       │  │  📥 IMPORTAR    │  │  📋 TEMPLATE    │  │
│  │  PROYECTO       │  │  EXISTENTE      │  │                 │  │
│  │                 │  │                 │  │                 │  │
│  │  Empezar desde  │  │  Desde GitHub,  │  │  Usar plantilla │  │
│  │  cero con AI    │  │  GitLab, repo   │  │  predefinida    │  │
│  │                 │  │                 │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│                            [Siguiente →]                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   [Nuevo Flow]   [Import Flow]   [Template Flow]
```

### 4.2 Flujo: Nuevo Proyecto desde Cero

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  PASO 2/4: INFORMACIÓN BÁSICA                                   │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  Nombre del proyecto *                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Mi Aplicación Increíble                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Descripción breve                                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Una app para gestionar tareas con IA                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Visibilidad                                                    │
│  ○ Privado (solo tú y colaboradores)                           │
│  ● Público (visible para todos)                                │
│                                                                  │
│  Repositorio Git                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ○ Crear nuevo en GitHub                                 │    │
│  │ ○ Crear nuevo en GitLab                                 │    │
│  │ ○ No crear repositorio ahora                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                     [← Atrás]  [Siguiente →]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  PASO 3/4: STACK TECNOLÓGICO SUGERIDO                           │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  Basado en tu descripción, sugerimos:                           │
│                                                                  │
│  Frontend                                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ☑ Next.js 14      ☑ TypeScript     ☑ Tailwind CSS      │    │
│  │ ☐ React           ☐ Vue.js         ☐ Svelte            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Backend                                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ☑ Node.js         ☑ tRPC           ☐ GraphQL           │    │
│  │ ☐ Python/FastAPI  ☐ Go             ☐ Rust              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Base de Datos                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ☑ Neon (PostgreSQL) - Recomendado por branching        │    │
│  │ ☐ Supabase          ☐ PlanetScale   ☐ MongoDB          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Hosting                                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ☑ Vercel (Frontend)  ☑ Railway (Backend)               │    │
│  │ ☐ Render             ☐ Fly.io         ☐ AWS            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                     [← Atrás]  [Siguiente →]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  PASO 4/4: CONFIGURAR INTEGRACIONES                             │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  Control de Versiones                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ GitHub         [Conectado ✓]  user/repo                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Base de Datos                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Neon           [Conectar]                               │    │
│  │                                                         │    │
│  │ ○ Crear nueva base de datos                             │    │
│  │ ○ Usar base de datos existente                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Hosting & Deploy                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Vercel         [Conectar]                               │    │
│  │ Railway        [Conectar]                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  CI/CD (Opcional)                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ GitHub Actions [Configurar automáticamente]             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                     [← Atrás]  [Crear Proyecto]                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ⏳ CONFIGURANDO PROYECTO...                                     │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  [████████░░░░░░░░░░░░] 40%                                     │
│                                                                  │
│  ✓ Repositorio creado en GitHub                                 │
│  ✓ Base de datos Neon provisionada                              │
│  ⏳ Configurando Vercel...                                       │
│  ○ Configurando Railway                                         │
│  ○ Configurando GitHub Actions                                  │
│  ○ Generando estructura inicial                                 │
│                                                                  │
│  [Cancelar]                                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
              [/projects/:id/intention]
```

### 4.3 Flujo: Importar Proyecto Existente

```
┌─────────────────────────────────────────────────────────────────┐
│                 FLUJO: IMPORTAR PROYECTO                         │
└─────────────────────────────────────────────────────────────────┘

[Seleccionar "Importar Existente"]
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  PASO 2/4: SELECCIONAR ORIGEN                                   │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  [GitHub Logo]  GitHub                                  │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  Buscar repositorio:                                    │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │ 🔍 Buscar...                                    │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │  Repositorios recientes:                                │    │
│  │  ○ user/my-awesome-app          ⭐ 45  🍴 12           │    │
│  │  ○ user/api-backend             ⭐ 23  🍴 5            │    │
│  │  ○ user/landing-page            ⭐ 8   🍴 2            │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ─── O importar desde URL ───                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ https://github.com/user/repo                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                     [← Atrás]  [Analizar Repositorio →]         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ⏳ ANALIZANDO REPOSITORIO...                                    │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  [████████████░░░░░░░░] 60%                                     │
│                                                                  │
│  ✓ Clonando repositorio                                         │
│  ✓ Detectando estructura del proyecto                           │
│  ⏳ Analizando dependencias...                                   │
│  ○ Detectando patrones de código                                │
│  ○ Identificando technical debt                                 │
│  ○ Escaneando vulnerabilidades                                  │
│  ○ Generando reporte de análisis                                │
│                                                                  │
│  Archivos analizados: 234/567                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  PASO 3/4: ANÁLISIS DEL PROYECTO                                │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  📊 RESUMEN DEL ANÁLISIS                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Stack Detectado:                                       │    │
│  │  • Frontend: React 18, TypeScript, Tailwind             │    │
│  │  • Backend: Node.js, Express, Prisma                    │    │
│  │  • Database: PostgreSQL                                 │    │
│  │  • Testing: Jest, React Testing Library                 │    │
│  │                                                         │    │
│  │  Métricas:                                              │    │
│  │  • Archivos: 234  │  Líneas de código: 45,678          │    │
│  │  • Test coverage: 67%  │  Complejidad promedio: 12     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ⚠️ ISSUES DETECTADOS                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  🔴 Críticos (3)                                        │    │
│  │  • 2 vulnerabilidades de seguridad en dependencias      │    │
│  │  • 1 secret expuesto en código                          │    │
│  │                                                         │    │
│  │  🟡 Warnings (8)                                        │    │
│  │  • 5 dependencias desactualizadas                       │    │
│  │  • 3 archivos sin tests                                 │    │
│  │                                                         │    │
│  │  🔵 Sugerencias (12)                                    │    │
│  │  • Código duplicado detectado                           │    │
│  │  • Oportunidades de refactoring                         │    │
│  │                                                         │    │
│  │  [Ver reporte completo]                                 │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ☑ Crear tareas automáticas para resolver issues críticos       │
│  ☑ Generar plan de mejora de código                             │
│                                                                  │
│                     [← Atrás]  [Siguiente →]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
              [Paso 4: Configurar Integraciones]
                        │
                        ▼
              [/projects/:id/intention]
```

---

## 5. Las 4 Fases del Proyecto

### 5.1 Fase 1: Declaración de Intención

```
┌─────────────────────────────────────────────────────────────────┐
│                 FASE 1: DECLARACIÓN DE INTENCIÓN                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [Proyecto: Mi App] ▸ Fase 1: Intención                         │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ PROGRESS BAR                                               │ │
│  │ [██░░░░░░░░░░░░░░░░░░] Fase 1 de 4                        │ │
│  │  ▲                                                         │ │
│  │  │                                                         │ │
│  │ [1.Intención] → [2.Negocio] → [3.Técnico] → [4.Ejecución] │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │  💬 CONVERSACIÓN CON AI CONDUCTOR                          │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │                                                            │ │
│  │  🤖 AI: ¡Hola! Soy tu AI Coding Conductor. Vamos a        │ │
│  │     definir claramente qué quieres construir.              │ │
│  │                                                            │ │
│  │     Cuéntame: ¿Qué problema quieres resolver con          │ │
│  │     esta aplicación?                                       │ │
│  │                                                            │ │
│  │  👤 Usuario: Quiero crear una app para que los equipos    │ │
│  │     puedan gestionar sus tareas de desarrollo con AI      │ │
│  │                                                            │ │
│  │  🤖 AI: Interesante. Para entender mejor:                 │ │
│  │     1. ¿Quiénes serán los usuarios principales?           │ │
│  │     2. ¿Qué diferencia a tu app de Jira o Linear?         │ │
│  │     3. ¿Qué rol específico jugará la AI?                  │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Escribe tu respuesta...                       [Enviar]│ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │  📋 DOCUMENTO DE INTENCIÓN (Auto-generado)                 │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │                                                            │ │
│  │  Problema a resolver:                                     │ │
│  │  • Los equipos pierden tiempo en gestión manual           │ │
│  │  • Falta de automatización inteligente                    │ │
│  │                                                            │ │
│  │  Usuarios objetivo:                                       │ │
│  │  • Equipos de desarrollo (5-20 personas)                  │ │
│  │  • Tech leads y PMs                                       │ │
│  │                                                            │ │
│  │  Propuesta de valor:                                      │ │
│  │  • AI que sugiere tareas y detecta bloqueos               │ │
│  │  • Integración nativa con GitHub                          │ │
│  │                                                            │ │
│  │  [Editar documento]  [Exportar como PDF]                  │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ☑ Confirmo que la intención está correctamente definida        │
│                                                                  │
│                        [Continuar a Fase 2 →]                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Fase 2: Análisis de Negocio

```
┌─────────────────────────────────────────────────────────────────┐
│                 FASE 2: ANÁLISIS DE NEGOCIO                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [Proyecto: Mi App] ▸ Fase 2: Análisis de Negocio               │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [████████░░░░░░░░░░░░] Fase 2 de 4                        │ │
│  │ [1.Intención ✓] → [2.Negocio] → [3.Técnico] → [4.Ejecución]│ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────┐ ┌─────────────────────────────────────┐│
│  │                     │ │                                     ││
│  │  SECCIONES          │ │  USER STORIES & FEATURES            ││
│  │  ─────────────────  │ │  ─────────────────────────────────  ││
│  │                     │ │                                     ││
│  │  ☑ User Stories     │ │  Epic: Gestión de Tareas            ││
│  │  ☐ User Journeys    │ │                                     ││
│  │  ☐ Features List    │ │  US-001: Como usuario, quiero       ││
│  │  ☐ Priorización     │ │  crear tareas rápidamente           ││
│  │  ☐ MVP Definition   │ │  ┌───────────────────────────────┐  ││
│  │  ☐ Success Metrics  │ │  │ Criterios de aceptación:      │  ││
│  │                     │ │  │ • Formulario simple            │  ││
│  │                     │ │  │ • Asignación automática        │  ││
│  │                     │ │  │ • Estimación AI                │  ││
│  │                     │ │  └───────────────────────────────┘  ││
│  │                     │ │  Story Points: [3 ▼]  Priority: [High]│
│  │                     │ │                                     ││
│  │                     │ │  US-002: Como tech lead, quiero     ││
│  │                     │ │  ver el progreso del sprint         ││
│  │                     │ │  ...                                ││
│  │                     │ │                                     ││
│  │                     │ │  [+ Agregar User Story]             ││
│  │                     │ │                                     ││
│  └─────────────────────┘ └─────────────────────────────────────┘│
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  🤖 AI SUGGESTIONS                                         │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │  Basado en tu intención, sugiero agregar:                 │ │
│  │  • US: Notificaciones en tiempo real                      │ │
│  │  • US: Dashboard de métricas                              │ │
│  │  • US: Integración con Slack                              │ │
│  │  [Agregar todas] [Revisar una por una]                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│           [← Volver a Fase 1]  [Continuar a Fase 3 →]           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Fase 3: Análisis Técnico

```
┌─────────────────────────────────────────────────────────────────┐
│                 FASE 3: ANÁLISIS TÉCNICO                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [Proyecto: Mi App] ▸ Fase 3: Análisis Técnico                  │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [████████████░░░░░░░░] Fase 3 de 4                        │ │
│  │ [1 ✓] → [2 ✓] → [3.Técnico] → [4.Ejecución]               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  TABS: [Arquitectura] [DB Schema] [APIs] [Infraestructura]│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │  📐 DIAGRAMA DE ARQUITECTURA (Auto-generado)               │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │                                                            │ │
│  │  ┌─────────┐     ┌─────────┐     ┌─────────┐              │ │
│  │  │ Next.js │────▶│  tRPC   │────▶│  Neon   │              │ │
│  │  │Frontend │     │  API    │     │ Postgres│              │ │
│  │  └─────────┘     └─────────┘     └─────────┘              │ │
│  │       │               │                                    │ │
│  │       │               │                                    │ │
│  │       ▼               ▼                                    │ │
│  │  ┌─────────┐     ┌─────────┐                              │ │
│  │  │  Vercel │     │ Railway │                              │ │
│  │  │  Edge   │     │ Workers │                              │ │
│  │  └─────────┘     └─────────┘                              │ │
│  │                                                            │ │
│  │  [Editar en modo visual]  [Ver código Mermaid]            │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │  🗄️ SCHEMA DE BASE DE DATOS                                │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │                                                            │ │
│  │  model User {                                              │ │
│  │    id        String   @id @default(cuid())                │ │
│  │    email     String   @unique                             │ │
│  │    name      String?                                      │ │
│  │    tasks     Task[]                                       │ │
│  │    createdAt DateTime @default(now())                     │ │
│  │  }                                                         │ │
│  │                                                            │ │
│  │  model Task {                                              │ │
│  │    id        String   @id @default(cuid())                │ │
│  │    title     String                                       │ │
│  │    status    Status   @default(TODO)                      │ │
│  │    userId    String                                       │ │
│  │    user      User     @relation(...)                      │ │
│  │  }                                                         │ │
│  │                                                            │ │
│  │  [Ver ERD visual]  [Editar schema]                        │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ⚠️ AI REVIEW                                               │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │  • Considera agregar índices en Task.status y Task.userId │ │
│  │  • Sugiero soft delete en lugar de hard delete            │ │
│  │  • Falta tabla de AuditLog para compliance                │ │
│  │  [Aplicar sugerencias]                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│           [← Volver a Fase 2]  [Continuar a Fase 4 →]           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Fase 4: Ejecución (Task Management)

```
┌─────────────────────────────────────────────────────────────────┐
│                 FASE 4: EJECUCIÓN                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [Proyecto: Mi App] ▸ Fase 4: Ejecución                         │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [████████████████████] Fase 4 de 4                        │ │
│  │ [1 ✓] → [2 ✓] → [3 ✓] → [4.Ejecución]                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Sprint: Sprint 1 ▼  │  Progreso: 45%  │  Días restantes: 8    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  TABS: [Kanban] [Lista] [Timeline] [AI Assistant]         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ╔═══════════════╦═══════════════╦═══════════════╦════════════╗│
│  ║   BACKLOG     ║  IN PROGRESS  ║   REVIEW      ║   DONE     ║│
│  ║   (12)        ║   (3)         ║   (2)         ║   (8)      ║│
│  ╠═══════════════╬═══════════════╬═══════════════╬════════════╣│
│  ║               ║               ║               ║            ║│
│  ║ ┌───────────┐ ║ ┌───────────┐ ║ ┌───────────┐ ║ ┌────────┐ ║│
│  ║ │ TASK-015  │ ║ │ TASK-010  │ ║ │ TASK-008  │ ║ │TASK-001│ ║│
│  ║ │ ────────  │ ║ │ ────────  │ ║ │ ────────  │ ║ │────────│ ║│
│  ║ │ Setup     │ ║ │ User      │ ║ │ Task API  │ ║ │Project │ ║│
│  ║ │ Auth      │ ║ │ Dashboard │ ║ │ endpoints │ ║ │setup   │ ║│
│  ║ │           │ ║ │           │ ║ │           │ ║ │        │ ║│
│  ║ │ 🏷️ auth   │ ║ │ 🏷️ ui     │ ║ │ 🏷️ api    │ ║ │🏷️ setup│ ║│
│  ║ │ ⏱️ 8min   │ ║ │ ⏱️ 10min  │ ║ │ ⏱️ 6min   │ ║ │⏱️ 5min │ ║│
│  ║ │ 👤 @you   │ ║ │ 👤 @dev1  │ ║ │ 👤 @dev2  │ ║ │✅ Done │ ║│
│  ║ └───────────┘ ║ └───────────┘ ║ └───────────┘ ║ └────────┘ ║│
│  ║               ║               ║               ║            ║│
│  ║ ┌───────────┐ ║ ┌───────────┐ ║ ┌───────────┐ ║ ┌────────┐ ║│
│  ║ │ TASK-016  │ ║ │ TASK-011  │ ║ │ TASK-009  │ ║ │TASK-002│ ║│
│  ║ │ ...       │ ║ │ ...       │ ║ │ ...       │ ║ │...     │ ║│
│  ║ └───────────┘ ║ └───────────┘ ║ └───────────┘ ║ └────────┘ ║│
│  ║               ║               ║               ║            ║│
│  ║ [+ Add Task] ║               ║               ║            ║│
│  ║               ║               ║               ║            ║│
│  ╚═══════════════╩═══════════════╩═══════════════╩════════════╝│
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  🤖 AI CONDUCTOR ACTIVO                                    │ │
│  │  ──────────────────────────────────────────────────────── │ │
│  │  "Veo que TASK-010 lleva 2 horas. ¿Necesitas ayuda?       │ │
│  │   Detecté un posible bloqueo en la integración OAuth."    │ │
│  │                                                            │ │
│  │  [Sí, ayúdame]  [Estoy bien]  [Escalar a senior]         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Vista de Tarea Individual (Ultra-granular: Max 10 min)

```
┌─────────────────────────────────────────────────────────────────┐
│                     VISTA DE TAREA                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ← Volver a Sprint  │  TASK-015: Setup Authentication           │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  📋 DESCRIPCIÓN                                             ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │  Configurar NextAuth.js con providers de GitHub y Google   ││
│  │                                                             ││
│  │  ✅ CRITERIOS DE ACEPTACIÓN                                 ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │  ☐ NextAuth configurado en /api/auth/[...nextauth]         ││
│  │  ☐ Provider de GitHub funcionando                          ││
│  │  ☐ Provider de Google funcionando                          ││
│  │  ☐ Sesión persistida en base de datos                      ││
│  │  ☐ Tests unitarios pasando (min 80% coverage)              ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │ DETALLES             │  │ 🤖 AI CODING ASSISTANT           │ │
│  │ ────────────────────  │  │ ─────────────────────────────── │ │
│  │                      │  │                                  │ │
│  │ Estado:  [In Progress▼]│  │ "Para esta tarea necesitas:     │ │
│  │ Tiempo est.: 8 min   │  │                                  │ │
│  │ Tiempo real: 5:23    │  │ 1. Instalar next-auth            │ │
│  │                      │  │    npm i next-auth               │ │
│  │ Asignado: @you       │  │                                  │ │
│  │ Reviewer: @lead      │  │ 2. Crear archivo de config:      │ │
│  │                      │  │    /pages/api/auth/[...nextauth] │ │
│  │ Branch:              │  │                                  │ │
│  │ feat/auth-setup      │  │ 3. Configurar providers          │ │
│  │                      │  │                                  │ │
│  │ PR: #23 (draft)      │  │ ¿Quieres que genere el código?   │ │
│  │                      │  │ [Generar código]                 │ │
│  │ Labels:              │  │ [Explicar más]                   │ │
│  │ 🏷️ auth 🏷️ setup     │  │                                  │ │
│  │                      │  │                                  │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  📁 ARCHIVOS RELACIONADOS                                   ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │                                                             ││
│  │  📄 pages/api/auth/[...nextauth].ts    [Ver] [Editar]      ││
│  │  📄 lib/auth.ts                        [Ver] [Editar]      ││
│  │  📄 prisma/schema.prisma               [Ver]               ││
│  │  📄 tests/auth.test.ts                 [Ver] [Run Tests]   ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  🔒 QUALITY GATES                                           ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │                                                             ││
│  │  ✅ Linting passed                                          ││
│  │  ✅ Type checking passed                                    ││
│  │  ⏳ Tests running...  [████░░░░░░] 45%                      ││
│  │  ⏳ Security scan pending                                   ││
│  │  ⏳ Code review pending                                     ││
│  │                                                             ││
│  │  Coverage actual: 72%  │  Requerido: 80%                   ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [Marcar como Completada]  [Solicitar Review]  [Necesito Ayuda] │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Panel de Integraciones

### 7.1 Integraciones Globales (Settings)

```
┌─────────────────────────────────────────────────────────────────┐
│                 CONFIGURACIÓN DE INTEGRACIONES                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Settings ▸ Integraciones                                       │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🔍 Buscar integraciones...                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  CATEGORÍAS: [Todas] [Git] [DB] [Hosting] [CI/CD] [AI] [Comms] │
│                                                                  │
│  ═══════════════════════════════════════════════════════════   │
│  📦 CONTROL DE VERSIONES                                        │
│  ═══════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [GitHub Logo]                                               ││
│  │                                                             ││
│  │ GitHub                              [Conectado ✓]           ││
│  │ Repositorios, PRs, Issues, Actions                          ││
│  │                                                             ││
│  │ Cuenta: @username                                           ││
│  │ Permisos: repo, workflow, read:org                          ││
│  │                                                             ││
│  │ [Configurar]  [Reconectar]  [Desconectar]                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [GitLab Logo]                                               ││
│  │                                                             ││
│  │ GitLab                              [No conectado]          ││
│  │ Repositorios, MRs, CI/CD pipelines                          ││
│  │                                                             ││
│  │ [Conectar GitLab]                                           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Bitbucket Logo]                                            ││
│  │                                                             ││
│  │ Bitbucket                           [No conectado]          ││
│  │ Repositorios, PRs, Pipelines                                ││
│  │                                                             ││
│  │ [Conectar Bitbucket]                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ═══════════════════════════════════════════════════════════   │
│  🗄️ BASES DE DATOS                                              │
│  ═══════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Neon Logo]                                                 ││
│  │                                                             ││
│  │ Neon                                [Conectado ✓]           ││
│  │ PostgreSQL serverless con branching                         ││
│  │                                                             ││
│  │ Proyecto: my-project-db                                     ││
│  │ Branch principal: main                                      ││
│  │ Branches activos: 3                                         ││
│  │                                                             ││
│  │ [Configurar]  [Ver branches]  [Desconectar]                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Supabase Logo]                                             ││
│  │                                                             ││
│  │ Supabase                            [No conectado]          ││
│  │ PostgreSQL + Auth + Storage + Realtime                      ││
│  │                                                             ││
│  │ [Conectar Supabase]                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ═══════════════════════════════════════════════════════════   │
│  🚀 HOSTING & DEPLOY                                            │
│  ═══════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Vercel Logo]                                               ││
│  │                                                             ││
│  │ Vercel                              [Conectado ✓]           ││
│  │ Frontend hosting, Edge Functions, Analytics                 ││
│  │                                                             ││
│  │ Team: my-team                                               ││
│  │ Proyectos: 3                                                ││
│  │                                                             ││
│  │ [Configurar]  [Ver proyectos]  [Desconectar]               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Railway Logo]                                              ││
│  │                                                             ││
│  │ Railway                             [Conectado ✓]           ││
│  │ Backend hosting, Workers, Cron jobs                         ││
│  │                                                             ││
│  │ Team: my-team                                               ││
│  │ Servicios activos: 2                                        ││
│  │                                                             ││
│  │ [Configurar]  [Ver servicios]  [Desconectar]               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Más opciones de hosting:                                    ││
│  │ [Render] [Fly.io] [AWS] [GCP] [Azure] [DigitalOcean]       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ═══════════════════════════════════════════════════════════   │
│  🔄 CI/CD                                                       │
│  ═══════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [GitHub Actions Logo]                                       ││
│  │                                                             ││
│  │ GitHub Actions                      [Conectado ✓]           ││
│  │ Workflows automáticos, Testing, Deploy                      ││
│  │                                                             ││
│  │ Workflows activos: 4                                        ││
│  │ Último run: hace 23 min (success)                          ││
│  │                                                             ││
│  │ [Ver workflows]  [Configurar]                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ═══════════════════════════════════════════════════════════   │
│  🤖 AI PROVIDERS                                                │
│  ═══════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Anthropic Logo]                                            ││
│  │                                                             ││
│  │ Anthropic (Claude)                  [Conectado ✓]           ││
│  │ AI principal para código y análisis                         ││
│  │                                                             ││
│  │ Modelo: claude-3-5-sonnet                                   ││
│  │ Créditos restantes: 45,234 tokens                          ││
│  │                                                             ││
│  │ [Configurar modelo]  [Ver uso]                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [OpenAI Logo]                                               ││
│  │                                                             ││
│  │ OpenAI                              [No conectado]          ││
│  │ GPT-4, embeddings, DALL-E                                   ││
│  │                                                             ││
│  │ [Conectar API Key]                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ═══════════════════════════════════════════════════════════   │
│  💬 COMUNICACIÓN                                                │
│  ═══════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Slack Logo]                                                ││
│  │                                                             ││
│  │ Slack                               [No conectado]          ││
│  │ Notificaciones, comandos, integración de equipo             ││
│  │                                                             ││
│  │ [Conectar Slack]                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Discord Logo]                                              ││
│  │                                                             ││
│  │ Discord                             [No conectado]          ││
│  │ Notificaciones, bots, webhooks                              ││
│  │                                                             ││
│  │ [Conectar Discord]                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ═══════════════════════════════════════════════════════════   │
│  📊 MONITOREO & ANALYTICS                                       │
│  ═══════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Sentry Logo]        [Posthog Logo]       [Datadog Logo]   ││
│  │ Sentry               PostHog              Datadog           ││
│  │ [No conectado]       [No conectado]       [No conectado]    ││
│  │ [Conectar]           [Conectar]           [Conectar]        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Flujo de Rollback y Manejo de Errores

```
┌─────────────────────────────────────────────────────────────────┐
│                     MANEJO DE ERRORES                            │
└─────────────────────────────────────────────────────────────────┘

Cuando ocurre un error durante la ejecución:

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ⚠️ ERROR EN TAREA TASK-015                                      │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  ❌ Error: Tests fallando                                   ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │                                                             ││
│  │  FAIL  tests/auth.test.ts                                   ││
│  │    ✕ should authenticate with GitHub (234 ms)              ││
│  │    ✕ should create session in database (156 ms)            ││
│  │                                                             ││
│  │  Tests: 2 failed, 4 passed, 6 total                        ││
│  │  Coverage: 68% (required: 80%)                              ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  🤖 AI ANÁLISIS DEL ERROR                                   ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │                                                             ││
│  │  Detecté los siguientes problemas:                          ││
│  │                                                             ││
│  │  1. El mock de GitHub OAuth no está configurado             ││
│  │     correctamente en el test environment                    ││
│  │                                                             ││
│  │  2. Falta la variable GITHUB_CLIENT_SECRET en .env.test    ││
│  │                                                             ││
│  │  Solución sugerida:                                         ││
│  │  ```javascript                                              ││
│  │  // En tests/setup.ts                                       ││
│  │  jest.mock('next-auth/providers/github', () => ({          ││
│  │    default: () => ({ id: 'github', name: 'GitHub' })       ││
│  │  }));                                                       ││
│  │  ```                                                        ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  OPCIONES:                                                      │
│                                                                  │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          │
│  │ 🔄 Aplicar    │ │ ↩️ Rollback   │ │ 🆘 Escalar    │          │
│  │ fix sugerido │ │ a último      │ │ a senior      │          │
│  │              │ │ estado bueno  │ │               │          │
│  └───────────────┘ └───────────────┘ └───────────────┘          │
│                                                                  │
│  ┌───────────────┐ ┌───────────────┐                            │
│  │ 📝 Editar     │ │ ⏸️ Pausar     │                            │
│  │ manualmente  │ │ tarea         │                            │
│  └───────────────┘ └───────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Si se selecciona ROLLBACK:

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  🔄 ROLLBACK EN PROGRESO                                         │
│  ════════════════════════════════════════════════════════════   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  [████████████░░░░░░░░] 60%                                 ││
│  │                                                             ││
│  │  ✓ Git: Revirtiendo commit abc123                          ││
│  │  ✓ Neon: Restaurando branch de DB a snapshot anterior      ││
│  │  ⏳ Vercel: Revirtiendo deploy a versión previa             ││
│  │  ○ Railway: Pendiente                                       ││
│  │  ○ Limpiando recursos temporales                           ││
│  │                                                             ││
│  │  Tiempo estimado: 45 segundos                              ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ⚠️ El rollback revertirá:                                       │
│  • 3 commits en branch feat/auth-setup                         │
│  • 1 migración de base de datos                                 │
│  • 1 deploy en preview                                          │
│                                                                  │
│  [Cancelar Rollback]                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Componentes UI Reutilizables

### 9.1 Lista de Componentes Core

```
┌─────────────────────────────────────────────────────────────────┐
│                 COMPONENTES UI CORE                              │
└─────────────────────────────────────────────────────────────────┘

LAYOUT COMPONENTS
─────────────────
• AppShell          - Layout principal con sidebar y header
• Sidebar           - Navegación lateral colapsable
• Header            - Barra superior con search y user menu
• PageContainer     - Contenedor de página con breadcrumbs
• Modal             - Modal genérico con variantes
• Drawer            - Panel lateral deslizante
• Tabs              - Navegación por tabs

FORM COMPONENTS
───────────────
• Input             - Input de texto con validación
• Select            - Dropdown con búsqueda
• MultiSelect       - Selector múltiple con tags
• Checkbox          - Checkbox con estados
• RadioGroup        - Grupo de radio buttons
• TextArea          - Área de texto expandible
• FileUpload        - Upload de archivos con preview
• DatePicker        - Selector de fecha/hora
• CodeEditor        - Editor de código con syntax highlighting

DATA DISPLAY
────────────
• Card              - Tarjeta de contenido
• Table             - Tabla con sorting y filtering
• DataGrid          - Grid de datos avanzado
• List              - Lista de items
• Timeline          - Línea temporal de eventos
• ProgressBar       - Barra de progreso
• Badge             - Badge/tag informativo
• Avatar            - Avatar de usuario
• Tooltip           - Tooltip informativo
• Toast             - Notificaciones toast

PROJECT SPECIFIC
────────────────
• TaskCard          - Tarjeta de tarea (Kanban)
• ProjectCard       - Tarjeta de proyecto
• IntegrationCard   - Tarjeta de integración
• PhaseIndicator    - Indicador de fase del proyecto
• AIChat            - Interfaz de chat con AI
• CodeBlock         - Bloque de código con copy
• QualityGate       - Indicador de quality gate
• MetricCard        - Tarjeta de métrica/KPI
• SprintBoard       - Board de Kanban completo
• UserStoryCard     - Tarjeta de user story
```

---

## 10. Estados y Transiciones

### 10.1 Estados de Proyecto

```
PROJECT STATES
══════════════

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  DRAFT   │───▶│ PLANNING │───▶│  ACTIVE  │───▶│ COMPLETED│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │
     │               │               │               │
     ▼               ▼               ▼               ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ ARCHIVED │◀───│  PAUSED  │◀───│  PAUSED  │    │ ARCHIVED │
└──────────┘    └──────────┘    └──────────┘    └──────────┘

Transiciones permitidas:
• DRAFT → PLANNING (completar wizard)
• PLANNING → ACTIVE (completar fase 3)
• ACTIVE → COMPLETED (todas las tareas done)
• ACTIVE → PAUSED (usuario decide pausar)
• PAUSED → ACTIVE (usuario decide continuar)
• Cualquiera → ARCHIVED (usuario archiva)
```

### 10.2 Estados de Tarea

```
TASK STATES (Ultra-granular: max 10 min)
═══════════════════════════════════════

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ BACKLOG  │───▶│   TODO   │───▶│IN_PROGRESS───▶│  REVIEW  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                     │               │
                     ┌───────────────┘               │
                     │                               │
                     ▼                               ▼
              ┌──────────┐                    ┌──────────┐
              │ BLOCKED  │                    │   DONE   │
              └──────────┘                    └──────────┘
                     │                               │
                     ▼                               ▼
              ┌──────────┐                    ┌──────────┐
              │ ESCALATED│                    │ VERIFIED │
              └──────────┘                    └──────────┘

Quality Gates para pasar a DONE:
• Tests passing (min 80% coverage)
• Linting passed
• Security scan passed
• Code review approved
• No code duplication > threshold
```

---

## 11. Rutas de API (Frontend calls)

```
┌─────────────────────────────────────────────────────────────────┐
│                     API ROUTES (tRPC)                            │
└─────────────────────────────────────────────────────────────────┘

AUTHENTICATION
──────────────
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/verify-email
GET    /api/auth/me
POST   /api/auth/2fa/enable
POST   /api/auth/2fa/verify
DELETE /api/auth/2fa/disable

PROJECTS
────────
GET    /api/projects                    - List projects
POST   /api/projects                    - Create project
GET    /api/projects/:id                - Get project
PATCH  /api/projects/:id                - Update project
DELETE /api/projects/:id                - Delete project
POST   /api/projects/:id/archive        - Archive project
POST   /api/projects/import             - Import from repo
GET    /api/projects/:id/analyze        - Analyze project

PHASES (The 4 stages)
─────────────────────
GET    /api/projects/:id/intention      - Get intention phase
PATCH  /api/projects/:id/intention      - Update intention
GET    /api/projects/:id/business       - Get business analysis
PATCH  /api/projects/:id/business       - Update business
GET    /api/projects/:id/technical      - Get technical analysis
PATCH  /api/projects/:id/technical      - Update technical
POST   /api/projects/:id/phase/advance  - Advance to next phase

TASKS (Ultra-granular)
──────────────────────
GET    /api/projects/:id/tasks          - List tasks
POST   /api/projects/:id/tasks          - Create task
GET    /api/tasks/:id                   - Get task
PATCH  /api/tasks/:id                   - Update task
DELETE /api/tasks/:id                   - Delete task
POST   /api/tasks/:id/start             - Start task (timer)
POST   /api/tasks/:id/complete          - Complete task
POST   /api/tasks/:id/review            - Submit for review
POST   /api/tasks/:id/escalate          - Escalate task

SPRINTS
───────
GET    /api/projects/:id/sprints        - List sprints
POST   /api/projects/:id/sprints        - Create sprint
GET    /api/sprints/:id                 - Get sprint
PATCH  /api/sprints/:id                 - Update sprint
POST   /api/sprints/:id/start           - Start sprint
POST   /api/sprints/:id/complete        - Complete sprint

INTEGRATIONS
────────────
GET    /api/integrations                - List available
GET    /api/integrations/connected      - List connected
POST   /api/integrations/:type/connect  - Connect integration
DELETE /api/integrations/:id/disconnect - Disconnect
POST   /api/integrations/:id/test       - Test connection
GET    /api/integrations/:id/status     - Get status

AI CONDUCTOR
────────────
POST   /api/ai/chat                     - Chat with AI
POST   /api/ai/analyze-code             - Analyze code
POST   /api/ai/suggest-tasks            - Get task suggestions
POST   /api/ai/review-code              - Code review
POST   /api/ai/generate-code            - Generate code
POST   /api/ai/explain-error            - Explain error

QUALITY GATES
─────────────
GET    /api/tasks/:id/quality           - Get quality status
POST   /api/tasks/:id/quality/run       - Run quality checks
GET    /api/tasks/:id/coverage          - Get test coverage
GET    /api/tasks/:id/security          - Get security scan

ROLLBACK
────────
POST   /api/projects/:id/rollback       - Initiate rollback
GET    /api/projects/:id/snapshots      - List snapshots
POST   /api/projects/:id/restore/:snap  - Restore snapshot

ANALYTICS
─────────
GET    /api/projects/:id/analytics      - Project analytics
GET    /api/analytics/dashboard         - Dashboard data
GET    /api/analytics/velocity          - Team velocity
GET    /api/analytics/quality           - Quality metrics
```

---

## 12. Responsive Breakpoints

```
┌─────────────────────────────────────────────────────────────────┐
│                     RESPONSIVE DESIGN                            │
└─────────────────────────────────────────────────────────────────┘

BREAKPOINTS (Tailwind defaults)
═══════════════════════════════

• sm:  640px   - Mobile landscape
• md:  768px   - Tablet portrait
• lg:  1024px  - Tablet landscape / Small desktop
• xl:  1280px  - Desktop
• 2xl: 1536px  - Large desktop

LAYOUT ADAPTATIONS
══════════════════

Mobile (< 768px):
─────────────────
• Sidebar: Hidden, accessible via hamburger menu
• Kanban: Vertical stacking, swipeable columns
• Tables: Card view / horizontal scroll
• Modals: Full screen
• Navigation: Bottom tab bar

Tablet (768px - 1024px):
────────────────────────
• Sidebar: Collapsed icons only, expand on hover
• Kanban: 2-3 columns visible
• Tables: Responsive with priority columns
• Modals: Centered with max-width

Desktop (> 1024px):
───────────────────
• Sidebar: Expanded with labels
• Kanban: All columns visible
• Tables: Full feature set
• Modals: Standard sizing

COMPONENT ADAPTATIONS
═════════════════════

TaskCard:
• Mobile: Full width, stacked layout
• Tablet: 2-column grid
• Desktop: 3-4 column grid

AIChat:
• Mobile: Full screen overlay
• Tablet: Side panel (50% width)
• Desktop: Side panel (30% width)

SprintBoard:
• Mobile: Single column with tabs
• Tablet: Horizontal scroll
• Desktop: All columns visible
```

---

## 13. Implementación Técnica Recomendada

```
┌─────────────────────────────────────────────────────────────────┐
│                 STACK TÉCNICO FRONTEND                           │
└─────────────────────────────────────────────────────────────────┘

FRAMEWORK & RUNTIME
═══════════════════
• Next.js 14 (App Router)
• TypeScript 5.x
• React 18

STYLING
═══════
• Tailwind CSS 3.x
• shadcn/ui components
• Framer Motion (animaciones)
• Lucide Icons

STATE MANAGEMENT
════════════════
• Zustand (global state)
• TanStack Query (server state)
• React Hook Form (forms)
• Zod (validation)

API LAYER
═════════
• tRPC (type-safe API)
• Next.js API Routes
• WebSocket (real-time)

AUTHENTICATION
══════════════
• NextAuth.js v5
• OAuth providers (GitHub, Google, GitLab)
• JWT + Sessions

TESTING
═══════
• Vitest (unit tests)
• Testing Library (component tests)
• Playwright (e2e tests)
• MSW (API mocking)

TOOLING
═══════
• ESLint + Prettier
• Husky + lint-staged
• Commitlint
• Bundle analyzer
```

---

## 14. Checklist de Implementación

```
┌─────────────────────────────────────────────────────────────────┐
│                 CHECKLIST DE IMPLEMENTACIÓN                      │
└─────────────────────────────────────────────────────────────────┘

FASE 1: FOUNDATION
══════════════════
☐ Setup Next.js 14 con App Router
☐ Configurar TypeScript estricto
☐ Implementar sistema de autenticación
☐ Crear layout principal (AppShell)
☐ Configurar Tailwind + shadcn/ui
☐ Setup tRPC
☐ Implementar rutas protegidas

FASE 2: CORE FEATURES
═════════════════════
☐ Dashboard principal
☐ CRUD de proyectos
☐ Wizard de nuevo proyecto
☐ Importación de repositorios
☐ Sistema de fases (4 stages)
☐ Gestión de tareas (Kanban)
☐ Quality gates básicos

FASE 3: INTEGRATIONS
════════════════════
☐ GitHub integration
☐ Neon database branching
☐ Vercel deploy
☐ Railway integration
☐ AI provider (Claude)
☐ Webhook system

FASE 4: ADVANCED
════════════════
☐ Real-time updates
☐ Rollback system
☐ Analytics dashboard
☐ Team collaboration
☐ Notifications system
☐ Mobile responsiveness

FASE 5: POLISH
══════════════
☐ Error handling global
☐ Loading states
☐ Empty states
☐ Onboarding flow
☐ Help tooltips
☐ Keyboard shortcuts
☐ Accessibility (a11y)
☐ Performance optimization
```

---

## Notas para Claude Code

Este documento define la estructura completa de navegación del frontend. Al implementar:

1. Mantener consistencia en todos los flujos
2. Cada tarea debe ser máximo 10 minutos
3. Implementar quality gates en cada transición
4. El AI Conductor debe estar presente en todas las fases
5. Priorizar la experiencia del desarrollador (DX)
6. Rollback debe funcionar en todos los niveles (git, db, deploy)

Las integraciones son el core de la plataforma - asegurar que cada una tenga:
- Estado de conexión visible
- Feedback de errores claro
- Opción de reconexión
- Logs de actividad
