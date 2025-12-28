# Changesets

Este directorio contiene los changesets del proyecto.

## Uso

```bash
# Crear un nuevo changeset
npm run changeset

# Ver changesets pendientes
npx changeset status

# Aplicar changesets (bump versions)
npx changeset version

# Publicar (si aplica)
npx changeset publish
```

## Tipos de cambio

- **major**: Cambios breaking (incompatibles con versiones anteriores)
- **minor**: Nueva funcionalidad (compatible hacia atrás)
- **patch**: Bug fixes y mejoras menores
