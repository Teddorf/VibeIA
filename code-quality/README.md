# Code Quality - VibeIA

Este directorio contiene reportes de calidad de código y planes de remediación.

## Estructura

```
code-quality/
├── README.md                    # Este archivo
├── reports/                     # Reportes de análisis
│   └── YYYY-MM-DD_quality_report.md
└── plans/                       # Planes de remediación
    └── YYYY-MM-DD_remediation_plan.md
```

## Reportes Disponibles

| Fecha | Reporte | Plan | Estado |
|-------|---------|------|--------|
| 2025-12-09 | [Quality Report](reports/2025-12-09_quality_report.md) | [Remediation Plan](plans/2025-12-09_remediation_plan.md) | En Progreso |
| 2025-12-09 | [Gaps & Issues](reports/2025-12-09_gaps_and_issues.md) | - | Referencia |
| 2025-12-09 | [Encryption Fix Walkthrough](reports/2025-12-09_encryption_fix_walkthrough.md) | [Encryption Plan](plans/2025-12-09_encryption_plan.md) | En Progreso |
| 2025-12-09 | - | [IDOR Fix Plan](plans/2025-12-09_IDOR_fix_plan.md) | En Progreso |

## Métricas Históricas

| Fecha | Rating | Críticos | Altos | Medios | Deuda Técnica |
|-------|--------|----------|-------|--------|---------------|
| 2025-12-09 | C | 4 | 18 | 25+ | 8-12 días |

## Quality Gate

Para pasar el Quality Gate, el código debe cumplir:

- [ ] Security Rating ≥ A
- [ ] Reliability Rating ≥ A
- [ ] Maintainability Rating ≥ A
- [ ] Coverage > 80%
- [ ] Duplications < 3%
- [ ] Critical Issues = 0
- [ ] Blocker Issues = 0

## Comandos Útiles

```bash
# Verificar dependencias vulnerables
cd backend && npm audit
cd frontend && npm audit

# Ejecutar tests con cobertura
cd backend && npm run test:cov
cd frontend && npm run test -- --coverage

# Linting
cd backend && npm run lint
cd frontend && npm run lint
```

## Contribuir

Al resolver issues del plan de remediación:

1. Marcar la tarea como completada en el plan
2. Agregar fecha y notas en la tabla de tracking
3. Crear PR con referencia al issue
4. Actualizar este README si cambian las métricas