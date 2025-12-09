# Plan de Test Manual de Regresión E2E - VibeIA

> **Versión**: 1.0
> **Fecha**: 2025-12-08
> **Plataforma**: VibeIA (Vibe Coding Platform)

---

## 1. Objetivo

Este documento define el plan de pruebas de regresión end-to-end (E2E) manual para validar que todas las funcionalidades críticas de VibeIA funcionan correctamente después de cada release o cambio significativo.

---

## 2. Alcance

### 2.1 En Alcance
- Flujos de autenticación (registro, login, logout)
- Wizard de creación de proyectos (4 etapas)
- Motor de ejecución y monitoreo en tiempo real
- Gestión de proyectos y planes
- Integración WebSocket
- Quality Gates
- Tareas manuales
- Recomendaciones de infraestructura
- Sistema de setup automatizado
- Equipos y colaboración
- Billing y suscripciones

### 2.2 Fuera de Alcance
- Pruebas de carga/rendimiento
- Pruebas de seguridad penetration testing
- Pruebas automatizadas (cubiertas por suite de Jest)

---

## 3. Prerrequisitos

### 3.1 Ambiente de Pruebas
- [ ] Backend corriendo en `http://localhost:3001`
- [ ] Frontend corriendo en `http://localhost:3000`
- [ ] MongoDB disponible y vacío/limpio
- [ ] Redis corriendo (para caché)
- [ ] Variables de entorno configuradas (.env)

### 3.2 Datos de Prueba
```
Usuario Test 1:
  Email: test1@vibeia.com
  Password: TestPass123!

Usuario Test 2:
  Email: test2@vibeia.com
  Password: TestPass456!
```

### 3.3 Herramientas Necesarias
- Navegador (Chrome/Firefox con DevTools)
- Postman o similar (para pruebas API directas)
- Consola del navegador abierta para verificar WebSocket

---

## 4. Casos de Prueba

### 4.1 Módulo: Autenticación

#### TC-AUTH-001: Registro de usuario exitoso
| Campo | Valor |
|-------|-------|
| **Prioridad** | CRÍTICA |
| **Precondición** | Usuario no registrado |

**Pasos:**
1. Navegar a `/register`
2. Ingresar nombre: "Test User"
3. Ingresar email: `test1@vibeia.com`
4. Ingresar contraseña: `TestPass123!`
5. Confirmar contraseña: `TestPass123!`
6. Click en "Sign up"

**Resultado Esperado:**
- [ ] Redirección a `/dashboard`
- [ ] Token guardado en localStorage
- [ ] Header muestra nombre del usuario

---

#### TC-AUTH-002: Registro con contraseña débil
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Ninguna |

**Pasos:**
1. Navegar a `/register`
2. Ingresar nombre: "Test User"
3. Ingresar email: `weak@test.com`
4. Ingresar contraseña: `123` (menos de 8 caracteres)
5. Confirmar contraseña: `123`
6. Click en "Sign up"

**Resultado Esperado:**
- [ ] Mensaje de error: contraseña debe tener mínimo 8 caracteres
- [ ] No se realiza redirección
- [ ] Usuario no se crea

---

#### TC-AUTH-003: Registro con contraseñas que no coinciden
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Ninguna |

**Pasos:**
1. Navegar a `/register`
2. Ingresar nombre: "Test User"
3. Ingresar email: `mismatch@test.com`
4. Ingresar contraseña: `TestPass123!`
5. Confirmar contraseña: `DifferentPass123!`
6. Click en "Sign up"

**Resultado Esperado:**
- [ ] Mensaje de error: "Passwords do not match"
- [ ] No se realiza redirección

---

#### TC-AUTH-004: Login exitoso
| Campo | Valor |
|-------|-------|
| **Prioridad** | CRÍTICA |
| **Precondición** | Usuario registrado (TC-AUTH-001) |

**Pasos:**
1. Navegar a `/login`
2. Ingresar email: `test1@vibeia.com`
3. Ingresar contraseña: `TestPass123!`
4. Click en "Sign in"

**Resultado Esperado:**
- [ ] Redirección a `/dashboard`
- [ ] Tokens guardados en localStorage
- [ ] Usuario autenticado visible en header

---

#### TC-AUTH-005: Login con credenciales inválidas
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Ninguna |

**Pasos:**
1. Navegar a `/login`
2. Ingresar email: `wrong@email.com`
3. Ingresar contraseña: `WrongPassword!`
4. Click en "Sign in"

**Resultado Esperado:**
- [ ] Mensaje de error: "Invalid email or password"
- [ ] No se realiza redirección
- [ ] No se guardan tokens

---

#### TC-AUTH-006: Logout
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Usuario autenticado |

**Pasos:**
1. Estar logueado en dashboard
2. Click en menú de usuario (avatar/nombre)
3. Click en "Logout"

**Resultado Esperado:**
- [ ] Redirección a `/` (landing) o `/login`
- [ ] Tokens removidos de localStorage
- [ ] Intentar acceder a `/dashboard` redirige a login

---

#### TC-AUTH-007: Acceso a ruta protegida sin autenticación
| Campo | Valor |
|-------|-------|
| **Prioridad** | CRÍTICA |
| **Precondición** | No estar autenticado |

**Pasos:**
1. Limpiar localStorage (borrar tokens)
2. Navegar directamente a `/dashboard`

**Resultado Esperado:**
- [ ] Redirección automática a `/login`
- [ ] No se muestra contenido del dashboard

---

#### TC-AUTH-008: Refresh token automático
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Usuario autenticado |

**Pasos:**
1. Estar logueado
2. En DevTools > Application > Storage, modificar el access_token para que sea inválido
3. Realizar una acción que requiera API (ej: cargar proyectos)

**Resultado Esperado:**
- [ ] Sistema usa refresh_token automáticamente
- [ ] Nuevo access_token guardado
- [ ] Acción se completa sin error visible al usuario

---

### 4.2 Módulo: Wizard de Creación de Proyecto

#### TC-WIZ-001: Stage 1 - Declaración de intención válida
| Campo | Valor |
|-------|-------|
| **Prioridad** | CRÍTICA |
| **Precondición** | Usuario autenticado |

**Pasos:**
1. Navegar a `/new-project`
2. En Stage 1, ingresar:
   - Project Name: "E-commerce Platform"
   - Description: "A modern e-commerce platform with product catalog and checkout"
3. Click "Next: Business Analysis"

**Resultado Esperado:**
- [ ] Transición a Stage 2
- [ ] Datos de Stage 1 preservados
- [ ] Progress indicator muestra Stage 2

---

#### TC-WIZ-002: Stage 1 - Campos requeridos
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Usuario autenticado |

**Pasos:**
1. Navegar a `/new-project`
2. Dejar campos vacíos
3. Intentar hacer click en "Next"

**Resultado Esperado:**
- [ ] Botón "Next" deshabilitado o muestra error
- [ ] No permite avanzar sin datos

---

#### TC-WIZ-003: Stage 2 - Completar análisis de negocio
| Campo | Valor |
|-------|-------|
| **Prioridad** | CRÍTICA |
| **Precondición** | Stage 1 completado |

**Pasos:**
1. En Stage 2, responder las 5 preguntas:
   - Q1 (Target users): "Small business owners and online shoppers"
   - Q2 (Main features): "Product catalog, shopping cart, payment processing, order tracking"
   - Q3 (Expected users): Seleccionar "100-1,000"
   - Q4 (Integrations): "Stripe for payments, SendGrid for emails"
   - Q5 (Auth methods): Seleccionar "All options"
2. Click "Next: Technical Analysis"

**Resultado Esperado:**
- [ ] Transición a Stage 3
- [ ] Todas las respuestas preservadas
- [ ] Progress indicator actualizado

---

#### TC-WIZ-004: Stage 2 - Navegación hacia atrás
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Stage 2 activo con datos |

**Pasos:**
1. Estar en Stage 2 con algunas respuestas
2. Click "Previous" o navegación a Stage 1
3. Volver a Stage 2

**Resultado Esperado:**
- [ ] Datos de Stage 1 preservados
- [ ] Datos de Stage 2 preservados al volver

---

#### TC-WIZ-005: Stage 3 - Selección de archetypes y generación de plan
| Campo | Valor |
|-------|-------|
| **Prioridad** | CRÍTICA |
| **Precondición** | Stage 2 completado |

**Pasos:**
1. En Stage 3, seleccionar archetypes:
   - [x] JWT Stateless Authentication
   - [x] Stripe Hosted Checkout
2. Click "Generate Plan"
3. Esperar generación del plan

**Resultado Esperado:**
- [ ] Loading indicator durante generación
- [ ] Plan generado con phases y tasks visibles
- [ ] Cada phase muestra estimated time
- [ ] Total estimated time calculado
- [ ] Botón "Next: Review Plan" habilitado

---

#### TC-WIZ-006: Stage 3 - Error en generación de plan
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Stage 2 completado |

**Pasos:**
1. En Stage 3, desconectar internet temporalmente
2. Click "Generate Plan"

**Resultado Esperado:**
- [ ] Mensaje de error user-friendly
- [ ] Opción de reintentar
- [ ] No crash de la aplicación

---

#### TC-WIZ-007: Stage 4 - Preview y confirmación del plan
| Campo | Valor |
|-------|-------|
| **Prioridad** | CRÍTICA |
| **Precondición** | Plan generado en Stage 3 |

**Pasos:**
1. En Stage 4, revisar el plan generado
2. Verificar que se muestran:
   - Nombre del proyecto
   - Arquitectura seleccionada
   - Lista de phases con tasks
   - Tiempo estimado total
3. Click "Start Execution"

**Resultado Esperado:**
- [ ] Proyecto creado en base de datos
- [ ] Plan asociado al proyecto
- [ ] Transición a Execution Dashboard (Stage 5)
- [ ] Ejecución iniciada

---

### 4.3 Módulo: Ejecución y Monitoreo

#### TC-EXEC-001: Iniciar ejecución de plan
| Campo | Valor |
|-------|-------|
| **Prioridad** | CRÍTICA |
| **Precondición** | Plan creado y en Stage 5 |

**Pasos:**
1. En Execution Dashboard, verificar estado inicial
2. Click "Start Execution" si no inició automáticamente
3. Observar progreso

**Resultado Esperado:**
- [ ] Status cambia a "running"
- [ ] Tasks comienzan a ejecutarse secuencialmente
- [ ] Progress bar se actualiza
- [ ] Logs aparecen en tiempo real

---

#### TC-EXEC-002: Ejecución de task automática
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Ejecución en progreso |

**Pasos:**
1. Observar una task que NO sea manual
2. Esperar a que se ejecute

**Resultado Esperado:**
- [ ] Task muestra status "in_progress"
- [ ] Después de ~2 segundos, status cambia a "completed"
- [ ] Checkmark verde aparece
- [ ] Siguiente task comienza automáticamente

---

#### TC-EXEC-003: Detección de tarea manual (Stripe)
| Campo | Valor |
|-------|-------|
| **Prioridad** | CRÍTICA |
| **Precondición** | Plan incluye integración Stripe |

**Pasos:**
1. Esperar a que ejecución llegue a task de Stripe
2. Observar comportamiento

**Resultado Esperado:**
- [ ] Ejecución se pausa automáticamente
- [ ] ManualTaskGuide se muestra
- [ ] Instrucciones paso a paso visibles
- [ ] Campos de input para API keys
- [ ] Botones "Complete & Continue" y "Skip"

---

#### TC-EXEC-004: Completar tarea manual
| Campo | Valor |
|-------|-------|
| **Prioridad** | CRÍTICA |
| **Precondición** | ManualTaskGuide visible (TC-EXEC-003) |

**Pasos:**
1. Seguir instrucciones mostradas
2. Ingresar datos requeridos (ej: Stripe API Key)
3. Click "Complete & Continue"

**Resultado Esperado:**
- [ ] Validación de inputs ejecutada
- [ ] Si válido: task marcada como completed
- [ ] Ejecución continúa automáticamente
- [ ] Si inválido: mensaje de error, no avanza

---

#### TC-EXEC-005: Saltar tarea manual
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | ManualTaskGuide visible |

**Pasos:**
1. En ManualTaskGuide, click "Skip"

**Resultado Esperado:**
- [ ] Task marcada como skipped o pending
- [ ] Ejecución continúa con siguiente task
- [ ] Warning/nota que task fue saltada

---

#### TC-EXEC-006: Quality Gate - Código válido
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Task con archivos generados (código limpio) |

**Pasos:**
1. Observar task que genera archivos
2. Esperar quality gate check

**Resultado Esperado:**
- [ ] Quality gate ejecuta checks
- [ ] Lint check: PASS
- [ ] Security check: PASS
- [ ] Task marcada como completed
- [ ] Log muestra resultado de quality gate

---

#### TC-EXEC-007: Quality Gate - Código con violaciones
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Task con código que tiene issues |

**Pasos:**
1. (Setup) Modificar generación para incluir `console.log` o secret hardcoded
2. Ejecutar task
3. Observar quality gate

**Resultado Esperado:**
- [ ] Quality gate detecta violaciones
- [ ] Task marcada como failed
- [ ] Ejecución se detiene o permite retry
- [ ] Log muestra detalles de violations

---

#### TC-EXEC-008: Pausar ejecución
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Ejecución en progreso |

**Pasos:**
1. Durante ejecución activa, click "Pause"

**Resultado Esperado:**
- [ ] Status cambia a "paused"
- [ ] Task actual se completa antes de pausar
- [ ] Botón cambia a "Resume"
- [ ] No se inician nuevas tasks

---

#### TC-EXEC-009: Reanudar ejecución
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Ejecución pausada (TC-EXEC-008) |

**Pasos:**
1. Con ejecución pausada, click "Resume"

**Resultado Esperado:**
- [ ] Status cambia a "running"
- [ ] Ejecución continúa desde donde se pausó
- [ ] Siguiente task comienza

---

#### TC-EXEC-010: Ejecución completada
| Campo | Valor |
|-------|-------|
| **Prioridad** | CRÍTICA |
| **Precondición** | Todas las tasks ejecutadas |

**Pasos:**
1. Esperar a que todas las phases y tasks se completen

**Resultado Esperado:**
- [ ] Status cambia a "completed"
- [ ] Mensaje de éxito
- [ ] Resumen de ejecución (tasks completadas, fallidas, saltadas)
- [ ] Opción de ver proyecto o crear nuevo plan

---

### 4.4 Módulo: WebSocket Real-Time

#### TC-WS-001: Conexión WebSocket
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Usuario autenticado |

**Pasos:**
1. Abrir DevTools > Network > WS
2. Navegar a Execution Dashboard
3. Observar conexión WebSocket

**Resultado Esperado:**
- [ ] Conexión establecida a `/execution` namespace
- [ ] Token JWT enviado para autenticación
- [ ] Status "connected"

---

#### TC-WS-002: Suscripción a plan
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | WebSocket conectado |

**Pasos:**
1. Iniciar ejecución de un plan
2. Observar mensajes WebSocket en DevTools

**Resultado Esperado:**
- [ ] Evento `subscribe_execution` enviado con planId
- [ ] Confirmación de suscripción recibida

---

#### TC-WS-003: Recibir eventos en tiempo real
| Campo | Valor |
|-------|-------|
| **Prioridad** | CRÍTICA |
| **Precondición** | Suscrito a plan en ejecución |

**Pasos:**
1. Observar eventos durante ejecución

**Resultado Esperado:**
- [ ] `status_update` recibido con cambios de estado
- [ ] `task_started` al iniciar cada task
- [ ] `task_completed` al completar tasks
- [ ] `phase_completed` al terminar phases
- [ ] `log` con mensajes de progreso
- [ ] UI se actualiza en tiempo real sin refresh

---

#### TC-WS-004: Desconexión y reconexión
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | WebSocket conectado |

**Pasos:**
1. Simular desconexión (desactivar red brevemente)
2. Reactivar red
3. Observar comportamiento

**Resultado Esperado:**
- [ ] Intento de reconexión automática
- [ ] Re-suscripción al plan
- [ ] Estado sincronizado después de reconexión

---

### 4.5 Módulo: Dashboard y Proyectos

#### TC-DASH-001: Dashboard vacío (primer uso)
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Usuario nuevo sin proyectos |

**Pasos:**
1. Login con usuario nuevo
2. Navegar a `/dashboard`

**Resultado Esperado:**
- [ ] Empty state visible
- [ ] Mensaje "Create Your First Project"
- [ ] Botón/CTA para crear proyecto
- [ ] Stats muestran 0

---

#### TC-DASH-002: Dashboard con proyectos
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Usuario con proyectos existentes |

**Pasos:**
1. Login con usuario que tiene proyectos
2. Navegar a `/dashboard`

**Resultado Esperado:**
- [ ] Stats actualizados (Total Projects, Plans, etc.)
- [ ] Grid/lista de proyectos visible
- [ ] Cada proyecto muestra nombre, status, fecha
- [ ] Recent plans section muestra últimos planes

---

#### TC-DASH-003: Navegar a detalle de proyecto
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Dashboard con proyectos |

**Pasos:**
1. En dashboard, click en un proyecto

**Resultado Esperado:**
- [ ] Navega a `/projects/[id]`
- [ ] Carga información del proyecto
- [ ] Tabs visibles: Overview, Plans, Settings

---

#### TC-PROJ-001: Vista Overview del proyecto
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | En página de proyecto |

**Pasos:**
1. En `/projects/[id]`, estar en tab Overview

**Resultado Esperado:**
- [ ] Stats del proyecto (Total Plans, Completed, In Progress)
- [ ] Lista de planes recientes
- [ ] Info básica del proyecto

---

#### TC-PROJ-002: Vista Plans del proyecto
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | En página de proyecto |

**Pasos:**
1. Click en tab "Plans"

**Resultado Esperado:**
- [ ] Tabla con todos los planes del proyecto
- [ ] Columnas: Plan Name, Status, Phases, Estimated Time, Created, Actions
- [ ] Click en plan muestra detalles

---

#### TC-PROJ-003: Crear nuevo plan para proyecto existente
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | En página de proyecto |

**Pasos:**
1. Click en "New Plan"

**Resultado Esperado:**
- [ ] Navega a `/new-project?projectId=[id]`
- [ ] Wizard inicia con proyecto pre-seleccionado
- [ ] Al completar, plan se asocia al proyecto existente

---

#### TC-PROJ-004: Editar settings del proyecto
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | En página de proyecto |

**Pasos:**
1. Click en tab "Settings"
2. Modificar nombre: "Updated Project Name"
3. Modificar descripción
4. Click "Save"

**Resultado Esperado:**
- [ ] Cambios guardados
- [ ] Mensaje de confirmación
- [ ] Nombre actualizado en header

---

### 4.6 Módulo: Recomendaciones

#### TC-REC-001: Obtener recomendación de base de datos
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Usuario autenticado |

**Pasos:**
1. En Stage 3 del wizard o sección de recomendaciones
2. Solicitar recomendación de DB
3. Proveer requirements (relational, scalability needs, etc.)

**Resultado Esperado:**
- [ ] Lista ranked de opciones (Neon, Supabase, PlanetScale, MongoDB Atlas)
- [ ] Score/ranking para cada opción
- [ ] Pros/cons de cada alternativa

---

#### TC-REC-002: Obtener recomendación de deploy
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Usuario autenticado |

**Pasos:**
1. Solicitar recomendación de deploy
2. Proveer stack info (Next.js frontend, NestJS backend)

**Resultado Esperado:**
- [ ] Recomendación para frontend (Vercel, Netlify)
- [ ] Recomendación para backend (Render, Railway, Fly.io)
- [ ] Match score basado en stack

---

#### TC-REC-003: Cálculo de costos
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Recomendaciones obtenidas |

**Pasos:**
1. Solicitar cálculo de costos
2. Seleccionar providers

**Resultado Esperado:**
- [ ] Costos para fase MVP (gratis o mínimo)
- [ ] Costos para fase Growth
- [ ] Costos para fase Scale
- [ ] Breakdown por servicio

---

### 4.7 Módulo: Setup Automatizado

#### TC-SETUP-001: Validar token de Neon
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Token de Neon disponible |

**Pasos:**
1. Ingresar Neon API token
2. Click "Validate"

**Resultado Esperado:**
- [ ] Token válido: checkmark verde, mensaje de éxito
- [ ] Token inválido: error message claro

---

#### TC-SETUP-002: Validar token de Vercel
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Token de Vercel disponible |

**Pasos:**
1. Ingresar Vercel API token
2. Click "Validate"

**Resultado Esperado:**
- [ ] Token válido: checkmark verde
- [ ] Token inválido: error descriptivo

---

#### TC-SETUP-003: Ejecutar setup completo
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Todos los tokens validados |

**Pasos:**
1. Configurar setup: DB (Neon) + Deploy (Vercel + Railway)
2. Click "Start Setup"
3. Observar progreso

**Resultado Esperado:**
- [ ] Setup tasks ejecutan secuencialmente
- [ ] Progress visible para cada step
- [ ] Al completar: URLs y credenciales mostradas
- [ ] Archivo .env generado

---

#### TC-SETUP-004: Rollback en caso de error
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Setup en progreso |

**Pasos:**
1. (Simular) Error durante setup (ej: token revocado mid-setup)
2. Observar comportamiento

**Resultado Esperado:**
- [ ] Error detectado
- [ ] Rollback automático iniciado
- [ ] Recursos creados son limpiados
- [ ] Mensaje de error con detalles
- [ ] Opción de reintentar

---

### 4.8 Módulo: Equipos y Colaboración

#### TC-TEAM-001: Crear equipo
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Usuario autenticado |

**Pasos:**
1. Navegar a sección de Teams
2. Click "Create Team"
3. Ingresar nombre: "Dev Team"
4. Click "Create"

**Resultado Esperado:**
- [ ] Team creado
- [ ] Usuario actual es owner
- [ ] Redirección a página del team

---

#### TC-TEAM-002: Invitar miembro
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Team creado, usuario es owner |

**Pasos:**
1. En página del team, click "Invite Member"
2. Ingresar email: `test2@vibeia.com`
3. Seleccionar rol: "Member"
4. Click "Send Invitation"

**Resultado Esperado:**
- [ ] Invitación creada
- [ ] Aparece en lista de pending invitations
- [ ] Email de invitación enviado (si configurado)

---

#### TC-TEAM-003: Aceptar invitación
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Invitación enviada (TC-TEAM-002) |

**Pasos:**
1. Login como usuario invitado (`test2@vibeia.com`)
2. Ver invitaciones pendientes
3. Click "Accept"

**Resultado Esperado:**
- [ ] Usuario agregado al team
- [ ] Invitación removida de pending
- [ ] Acceso a recursos del team

---

#### TC-TEAM-004: Cambiar rol de miembro
| Campo | Valor |
|-------|-------|
| **Prioridad** | BAJA |
| **Precondición** | Team con miembros |

**Pasos:**
1. Como owner, ir a team members
2. Seleccionar miembro
3. Cambiar rol a "Admin"
4. Guardar

**Resultado Esperado:**
- [ ] Rol actualizado
- [ ] Permisos del miembro actualizados

---

### 4.9 Módulo: Billing y Suscripciones

#### TC-BILL-001: Ver plan actual
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Usuario autenticado |

**Pasos:**
1. Navegar a sección de Billing/Subscription
2. Ver plan actual

**Resultado Esperado:**
- [ ] Plan mostrado (FREE/PRO/ENTERPRISE)
- [ ] Features incluidas listadas
- [ ] Usage actual visible

---

#### TC-BILL-002: Ver límites de uso
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Usuario con plan FREE |

**Pasos:**
1. Ver usage en billing section
2. Verificar límites

**Resultado Esperado:**
- [ ] Plans generados: X / límite
- [ ] Projects: X / límite
- [ ] Warning si cerca del límite

---

#### TC-BILL-003: Upgrade de plan (si implementado)
| Campo | Valor |
|-------|-------|
| **Prioridad** | BAJA |
| **Precondición** | Usuario en plan FREE |

**Pasos:**
1. Click "Upgrade to PRO"
2. Completar proceso de pago (test mode)

**Resultado Esperado:**
- [ ] Redirección a checkout
- [ ] Pago procesado (test)
- [ ] Plan actualizado
- [ ] Nuevos límites aplicados

---

### 4.10 Módulo: Seguridad

#### TC-SEC-001: Escaneo de secrets
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Código generado disponible |

**Pasos:**
1. Ejecutar scan de secrets en código

**Resultado Esperado:**
- [ ] Scan ejecutado
- [ ] Si hay secrets: reportados con ubicación
- [ ] Si no hay: clean report

---

#### TC-SEC-002: Rate limiting
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Usuario autenticado |

**Pasos:**
1. Hacer múltiples requests rápidos a un endpoint
2. Exceder límite

**Resultado Esperado:**
- [ ] Requests iniciales exitosos
- [ ] Al exceder límite: HTTP 429
- [ ] Mensaje indicando tiempo de espera
- [ ] Después del cooldown: requests permitidos

---

### 4.11 Módulo: Integración Git

#### TC-GIT-001: Crear feature branch automáticamente
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Plan aprobado, repositorio GitHub conectado |

**Pasos:**
1. Aprobar un plan en Stage 4
2. Iniciar ejecución

**Resultado Esperado:**
- [ ] Branch `feature/vibe-{feature}-{id}` creado automáticamente
- [ ] Branch basado en `develop` o `main`
- [ ] Verificable en GitHub

---

#### TC-GIT-002: Crear Draft PR automáticamente
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Feature branch creado |

**Pasos:**
1. Durante ejecución, verificar GitHub

**Resultado Esperado:**
- [ ] Draft PR creado con título `[Vibe] {featureName}`
- [ ] Labels: `vibe-generated`, `in-progress`
- [ ] Descripción incluye plan phases y tasks

---

#### TC-GIT-003: Commits con formato convencional
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Ejecución en progreso |

**Pasos:**
1. Completar una task
2. Verificar commit generado

**Resultado Esperado:**
- [ ] Formato: `feat(scope): descripción`
- [ ] Metadata incluye: Task-ID, Plan-ID, Phase, Coverage
- [ ] Footer: `Generated-by: Vibe Coding Platform`

---

#### TC-GIT-004: Merge de phase branch
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Phase completada |

**Pasos:**
1. Completar todas las tasks de una phase
2. Verificar merge

**Resultado Esperado:**
- [ ] Phase branch merged a feature branch
- [ ] Merge con `--no-ff` (mantiene historial)
- [ ] PR actualizado con progreso

---

#### TC-GIT-005: PR marcado como Ready for Review
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Plan completado |

**Pasos:**
1. Completar todas las phases del plan
2. Verificar estado del PR

**Resultado Esperado:**
- [ ] PR ya no es Draft
- [ ] Label cambiado a `ready-for-review`
- [ ] Resumen final en descripción

---

### 4.12 Módulo: Multi-LLM Orchestration

#### TC-LLM-001: Generación de plan con provider primario
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Anthropic API key configurada |

**Pasos:**
1. En Stage 3, click "Generate Plan"
2. Verificar en logs/metadata

**Resultado Esperado:**
- [ ] Plan generado exitosamente
- [ ] Metadata indica provider usado (Anthropic)
- [ ] Tiempo de respuesta < 30 segundos

---

#### TC-LLM-002: Fallback automático a provider secundario
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Provider primario no disponible |

**Pasos:**
1. (Setup) Invalidar API key de Anthropic temporalmente
2. Intentar generar plan

**Resultado Esperado:**
- [ ] Sistema intenta con OpenAI o Gemini
- [ ] Plan generado exitosamente
- [ ] Log indica fallback utilizado
- [ ] Usuario no ve error (proceso transparente)

---

#### TC-LLM-003: Error cuando todos los providers fallan
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Todas las API keys inválidas |

**Pasos:**
1. (Setup) Invalidar todas las API keys
2. Intentar generar plan

**Resultado Esperado:**
- [ ] Mensaje de error user-friendly
- [ ] No crash de la aplicación
- [ ] Sugerencia de verificar configuración

---

### 4.13 Módulo: Documentación Automática

#### TC-DOC-001: Generación de README
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Plan completado |

**Pasos:**
1. POST `/api/documentation/generate` con tipo "readme"
2. Verificar contenido generado

**Resultado Esperado:**
- [ ] README.md generado
- [ ] Incluye: descripción, setup, uso, API endpoints
- [ ] Formato Markdown válido

---

#### TC-DOC-002: Generación de ADR (Architecture Decision Record)
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Arquetipo seleccionado |

**Pasos:**
1. POST `/api/documentation/adr` con decisión de arquitectura

**Resultado Esperado:**
- [ ] ADR generado con formato estándar
- [ ] Incluye: Estado, Contexto, Decisión, Consecuencias, Alternativas
- [ ] Guardado en `docs/architecture/adr/`

---

#### TC-DOC-003: Generación de diagramas Mermaid
| Campo | Valor |
|-------|-------|
| **Prioridad** | BAJA |
| **Precondición** | Plan con arquitectura definida |

**Pasos:**
1. POST `/api/documentation/diagram` con tipo de diagrama

**Resultado Esperado:**
- [ ] Código Mermaid válido generado
- [ ] Diagrama renderiza correctamente
- [ ] Tipos soportados: sequence, flowchart, ERD, class

---

#### TC-DOC-004: Generación de OpenAPI docs
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | API endpoints generados |

**Pasos:**
1. POST `/api/documentation/api-docs`

**Resultado Esperado:**
- [ ] OpenAPI 3.0.3 spec generada
- [ ] Incluye todos los endpoints del proyecto
- [ ] Schemas correctamente definidos

---

### 4.14 Módulo: Proyecto Nuevo vs Existente

#### TC-PROJ-NEW-001: Setup de proyecto nuevo
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Usuario sin proyectos |

**Pasos:**
1. Click "Create New Project"
2. Seleccionar tipo: "SaaS Platform"
3. Aceptar stack recomendado
4. Configurar repositorio GitHub

**Resultado Esperado:**
- [ ] Estructura de proyecto generada
- [ ] Repositorio creado en GitHub
- [ ] Archivos base: package.json, tsconfig, etc.
- [ ] Pasa a Etapa 1 del wizard

---

#### TC-PROJ-EXIST-001: Análisis de proyecto existente
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Repositorio GitHub con código |

**Pasos:**
1. Click "Import Existing Project"
2. Conectar repositorio
3. Esperar análisis

**Resultado Esperado:**
- [ ] Stack detectado correctamente (Next.js, NestJS, etc.)
- [ ] Métricas calculadas (LOC, coverage, complexity)
- [ ] Patrones identificados (MVC, Clean Architecture)
- [ ] Issues detectados (low coverage, vulnerabilities)

---

#### TC-PROJ-EXIST-002: Recomendaciones pre-feature
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Proyecto con issues detectados |

**Pasos:**
1. Ver recomendaciones después del análisis

**Resultado Esperado:**
- [ ] Lista de issues prioritarios
- [ ] Estimación de tiempo para resolver
- [ ] Opción "Resolver issues primero" o "Continuar"

---

### 4.15 Módulo: Sistema de Arquetipos

#### TC-ARCH-001: Ver arquetipos disponibles
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Stage 3 del wizard |

**Pasos:**
1. En Stage 3, ver lista de arquetipos

**Resultado Esperado:**
- [ ] Arquetipos mostrados con pros/cons
- [ ] Uno marcado como "RECOMENDADO"
- [ ] Información de escalabilidad y complejidad

---

#### TC-ARCH-002: Seleccionar múltiples arquetipos
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Stage 3 del wizard |

**Pasos:**
1. Seleccionar: JWT Authentication + Stripe Checkout
2. Generar plan

**Resultado Esperado:**
- [ ] Ambos arquetipos aplicados al plan
- [ ] Tasks incluyen implementación de ambos
- [ ] No conflictos entre arquetipos

---

#### TC-ARCH-003: Arquetipo Event-Driven
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Notificaciones requeridas |

**Pasos:**
1. Seleccionar arquetipo "Event-Driven (Redis Pub/Sub + WebSocket)"
2. Generar plan

**Resultado Esperado:**
- [ ] Plan incluye setup de Redis
- [ ] Event producers/consumers en estructura
- [ ] WebSocket handler incluido

---

### 4.16 Módulo: Workspace Isolation

#### TC-WORK-001: Crear workspace aislado
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Plan listo para ejecución |

**Pasos:**
1. POST `/api/security/workspaces` con config

**Resultado Esperado:**
- [ ] Container Docker creado
- [ ] Recursos asignados (2 CPU, 4GB RAM)
- [ ] Network aislada
- [ ] ID de workspace retornado

---

#### TC-WORK-002: Ejecutar comando en workspace
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Workspace activo |

**Pasos:**
1. POST `/api/security/workspaces/:id/exec` con comando

**Resultado Esperado:**
- [ ] Comando ejecutado en container
- [ ] Output retornado
- [ ] Sin acceso a host

---

#### TC-WORK-003: Auto-destrucción de workspace
| Campo | Valor |
|-------|-------|
| **Prioridad** | BAJA |
| **Precondición** | Workspace creado hace > 3 horas |

**Pasos:**
1. Esperar o simular timeout
2. Verificar limpieza

**Resultado Esperado:**
- [ ] Workspace eliminado automáticamente
- [ ] Recursos liberados
- [ ] Log de cleanup

---

### 4.17 Módulo: Manejo de Credenciales

#### TC-CRED-001: Almacenar credencial encriptada
| Campo | Valor |
|-------|-------|
| **Prioridad** | ALTA |
| **Precondición** | Usuario autenticado |

**Pasos:**
1. POST `/api/security/credentials` con API key

**Resultado Esperado:**
- [ ] Credencial almacenada encriptada (AES-256)
- [ ] ID de credencial retornado
- [ ] No visible en plaintext en DB

---

#### TC-CRED-002: Rotación de credenciales
| Campo | Valor |
|-------|-------|
| **Prioridad** | MEDIA |
| **Precondición** | Credencial existente |

**Pasos:**
1. POST `/api/security/credentials/:id/rotate`

**Resultado Esperado:**
- [ ] Nueva credencial generada/solicitada
- [ ] Antigua marcada como rotada
- [ ] Timestamp de rotación registrado

---

#### TC-CRED-003: Validar si credencial necesita rotación
| Campo | Valor |
|-------|-------|
| **Prioridad** | BAJA |
| **Precondición** | Credencial antigua (>90 días) |

**Pasos:**
1. GET `/api/security/credentials/:id/should-rotate`

**Resultado Esperado:**
- [ ] `shouldRotate: true` si > 90 días
- [ ] Razón de rotación sugerida
- [ ] Fecha de última rotación

---

---

## 5. Matriz de Priorización

| Prioridad | Descripción | Casos |
|-----------|-------------|-------|
| **CRÍTICA** | Bloquean uso básico de la plataforma | TC-AUTH-001, TC-AUTH-004, TC-AUTH-007, TC-WIZ-001, TC-WIZ-005, TC-WIZ-007, TC-EXEC-001, TC-EXEC-003, TC-EXEC-004, TC-EXEC-010, TC-WS-003 |
| **ALTA** | Funcionalidad importante, workarounds posibles | TC-AUTH-002, TC-AUTH-003, TC-AUTH-005, TC-AUTH-006, TC-WIZ-002, TC-WIZ-003, TC-WIZ-006, TC-EXEC-002, TC-EXEC-006, TC-EXEC-007, TC-EXEC-008, TC-EXEC-009, TC-WS-001, TC-WS-002, TC-DASH-002, TC-DASH-003, TC-PROJ-001, TC-PROJ-002, TC-PROJ-003, TC-SETUP-001, TC-SETUP-002, TC-SETUP-003, TC-SETUP-004, TC-SEC-001, **TC-GIT-001**, **TC-GIT-002**, **TC-LLM-001**, **TC-LLM-002**, **TC-PROJ-NEW-001**, **TC-PROJ-EXIST-001**, **TC-ARCH-001**, **TC-ARCH-002**, **TC-CRED-001** |
| **MEDIA** | Mejora experiencia, no bloquea | TC-AUTH-008, TC-WIZ-004, TC-WS-004, TC-DASH-001, TC-PROJ-004, TC-REC-*, TC-TEAM-001, TC-TEAM-002, TC-TEAM-003, TC-BILL-001, TC-BILL-002, TC-SEC-002, **TC-GIT-003**, **TC-GIT-004**, **TC-GIT-005**, **TC-LLM-003**, **TC-DOC-001**, **TC-DOC-002**, **TC-DOC-004**, **TC-PROJ-EXIST-002**, **TC-ARCH-003**, **TC-WORK-001**, **TC-WORK-002**, **TC-CRED-002** |
| **BAJA** | Nice-to-have, bajo impacto | TC-TEAM-004, TC-BILL-003, **TC-DOC-003**, **TC-WORK-003**, **TC-CRED-003** |

### 5.1 Resumen de Cobertura por Módulo

| Módulo | Casos | Críticos | Altos | Medios | Bajos |
|--------|-------|----------|-------|--------|-------|
| Autenticación | 8 | 3 | 4 | 1 | 0 |
| Wizard | 7 | 3 | 3 | 1 | 0 |
| Ejecución | 10 | 4 | 6 | 0 | 0 |
| WebSocket | 4 | 1 | 2 | 1 | 0 |
| Dashboard/Proyectos | 7 | 0 | 4 | 2 | 1 |
| Recomendaciones | 3 | 0 | 0 | 3 | 0 |
| Setup Automatizado | 4 | 0 | 4 | 0 | 0 |
| Equipos | 4 | 0 | 0 | 3 | 1 |
| Billing | 3 | 0 | 0 | 2 | 1 |
| Seguridad | 2 | 0 | 1 | 1 | 0 |
| **Integración Git** | 5 | 0 | 2 | 3 | 0 |
| **Multi-LLM** | 3 | 0 | 2 | 1 | 0 |
| **Documentación** | 4 | 0 | 0 | 3 | 1 |
| **Proyecto Nuevo/Existente** | 3 | 0 | 2 | 1 | 0 |
| **Arquetipos** | 3 | 0 | 2 | 1 | 0 |
| **Workspace Isolation** | 3 | 0 | 0 | 2 | 1 |
| **Credenciales** | 3 | 0 | 1 | 1 | 1 |
| **TOTAL** | **76** | **11** | **33** | **26** | **6** |

---

## 6. Flujos de Regresión Críticos (Smoke Test)

Para una regresión rápida, ejecutar estos flujos en orden:

### Smoke Test Mínimo (15-20 minutos)

1. **Auth Flow**
   - TC-AUTH-001: Registro
   - TC-AUTH-004: Login
   - TC-AUTH-007: Ruta protegida

2. **Wizard Flow**
   - TC-WIZ-001: Stage 1
   - TC-WIZ-003: Stage 2
   - TC-WIZ-005: Stage 3 + Generación
   - TC-WIZ-007: Stage 4 + Start

3. **Execution Flow**
   - TC-EXEC-001: Iniciar
   - TC-EXEC-002: Task automática
   - TC-EXEC-010: Completar

4. **Dashboard Flow**
   - TC-DASH-002: Ver proyectos
   - TC-DASH-003: Navegar a proyecto

### Smoke Test Extendido (45-60 minutos)

Incluye todo lo anterior más:

5. **Git Integration Flow**
   - TC-GIT-001: Feature branch creado
   - TC-GIT-002: Draft PR creado

6. **LLM Flow**
   - TC-LLM-001: Generación con provider primario

7. **Arquetipos Flow**
   - TC-ARCH-001: Ver arquetipos
   - TC-ARCH-002: Seleccionar múltiples

8. **Manual Tasks Flow**
   - TC-EXEC-003: Detección de tarea manual
   - TC-EXEC-004: Completar tarea manual

9. **Quality Gates Flow**
   - TC-EXEC-006: QG con código válido

10. **Setup Flow**
    - TC-SETUP-001: Validar token Neon
    - TC-SETUP-002: Validar token Vercel

---

## 7. Checklist Pre-Release

Antes de cada release, verificar:

### 7.1 Funcionalidades Core
- [ ] Todos los casos CRÍTICOS pasan (11 casos)
- [ ] 90%+ de casos ALTA pasan (33 casos)
- [ ] No hay regresiones en funcionalidad existente

### 7.2 Auth & Security
- [ ] Auth flow completo funciona (registro, login, logout)
- [ ] Tokens se renuevan correctamente
- [ ] Rutas protegidas redirigen a login
- [ ] Credenciales se almacenan encriptadas

### 7.3 Wizard & Plan Generation
- [ ] Wizard completo funciona (4 stages)
- [ ] Arquetipos se muestran correctamente
- [ ] LLM genera planes exitosamente
- [ ] Fallback de LLM funciona si provider primario falla

### 7.4 Execution Engine
- [ ] Ejecución completa funciona
- [ ] WebSocket conecta y recibe eventos real-time
- [ ] Quality gates bloquean código con violations
- [ ] Tareas manuales pausan correctamente
- [ ] Pause/Resume funciona

### 7.5 Git Integration
- [ ] Feature branches se crean automáticamente
- [ ] Commits tienen formato convencional
- [ ] Draft PR se crea y actualiza

### 7.6 Infrastructure
- [ ] Setup automatizado funciona (Neon, Vercel, Railway)
- [ ] Rollback limpia recursos en caso de error
- [ ] Recomendaciones retornan resultados válidos

### 7.7 Documentación
- [ ] README se genera correctamente
- [ ] ADRs se generan con formato estándar
- [ ] Diagramas Mermaid son válidos

---

## 8. Reporte de Bugs

Al encontrar un bug, documentar:

```
**Bug ID**: BUG-XXX
**Caso de Prueba**: TC-XXX-XXX
**Severidad**: Crítica/Alta/Media/Baja
**Ambiente**: Local/Staging/Producción
**Pasos para Reproducir**:
1. ...
2. ...

**Resultado Esperado**: ...
**Resultado Actual**: ...
**Screenshots/Videos**: [adjuntar]
**Logs de Consola**: [adjuntar]
```

---

## 9. Historial de Ejecución

| Fecha | Versión | Ejecutor | Casos Pasados | Casos Fallidos | Notas |
|-------|---------|----------|---------------|----------------|-------|
| | | | | | |

---

**Documento creado para VibeIA v1.0**
