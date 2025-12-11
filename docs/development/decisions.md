# Decisiones Arquitectonicas - VibeIA

Registro de ADRs (Architecture Decision Records).

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

