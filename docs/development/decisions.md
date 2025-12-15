# Decisiones Arquitectonicas - VibeIA

Registro de ADRs (Architecture Decision Records).

---

## ADR-003: OAuth Popup Flow con postMessage

**Fecha:** 2025-12-15
**Estado:** Aceptado

### Contexto
OAuth requeria UX donde el popup de autorizacion no reemplazara la pagina de login, permitiendo feedback visual al usuario y redireccion desde la ventana principal.

### Decision
Implementar flujo con popup que comunica resultado via `window.postMessage()`:
1. Login page abre popup con URL de OAuth provider
2. Backend redirige a `/oauth/callback/[provider]` con tokens
3. Callback page muestra mensaje de exito y envia postMessage
4. Login page escucha mensaje y redirige a dashboard

### Alternativas consideradas
1. **Redirect directo** - Rechazado porque pierde contexto de la pagina
2. **localStorage polling** - Considerado pero postMessage es mas eficiente
3. **WebSocket** - Sobreingenieria para flujo one-time
4. **postMessage** - Elegido por ser nativo, seguro (origin check) y sincrono

### Consecuencias
- (+) UX mejorada con feedback visual en popup
- (+) Seguro con validacion de origin
- (+) Funciona si usuario navega directamente a callback (fallback a redirect)
- (-) Popup blockers pueden interferir

---

## ADR-002: Sistema Centralizado de Errores HTTP

**Fecha:** 2025-12-11
**Estado:** Aceptado

### Contexto
Necesidad de manejo consistente de errores HTTP en todo el frontend con feedback al usuario y resiliencia ante fallos de red.

### Decision
Implementar sistema de 4 capas: ApiError class, useApiError hook, ToastProvider, ErrorBoundary.

### Alternativas consideradas
1. **Try/catch manual en cada componente** - Rechazado por inconsistencia y duplicacion
2. **Axios interceptor solo** - Insuficiente, no provee UI feedback
3. **React Query** - Considerado pero agrega dependencia innecesaria para MVP
4. **Sistema centralizado custom** - Elegido por control total y cero dependencias extra

### Consecuencias
- (+) UX consistente en toda la app
- (+) Retry automatico reduce errores percibidos
- (+) Logging centralizado facilita debugging
- (+) Accesible por defecto (WCAG 2.1 AA)
- (-) ~1,200 LOC adicionales de codigo

---

## ADR-001: Patron Strategy para Setup Executors

**Fecha:** 2025-12-10
**Estado:** Aceptado

### Contexto
Necesidad de reducir complejidad en SetupOrchestratorService que manejaba multiples proveedores cloud.

### Decision
Usar patron Strategy con interface `ISetupExecutor` e inyeccion de dependencias.

### Alternativas consideradas
1. **Switch/case monolitico** - Rechazado por alta complejidad ciclomatica
2. **Factory pattern** - Considerado pero Strategy es mas apropiado para comportamiento intercambiable
3. **Plugin system** - Sobreingenieria para el caso de uso actual

### Consecuencias
- (+) Tests unitarios aislados por proveedor
- (+) Facil extension con nuevos proveedores
- (+) Codigo mas mantenible
- (-) Mas archivos en el proyecto

---

