FROM node:20-alpine

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# Verificar que el build existe
RUN ls -la dist/src/ && test -f dist/src/main.js

# Exponer puerto (Render usa el puerto que defines, no el 10000 por defecto)
EXPOSE 10000

# Variables de entorno
ENV NODE_ENV=production

# Ejecutar en modo producción
CMD ["node", "dist/src/main.js"]
