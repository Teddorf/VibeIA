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

# Limpiar devDependencies para reducir tamaño
RUN npm prune --production

# Exponer puerto
EXPOSE 3001

# Limitar memoria para free tier de Render
ENV NODE_OPTIONS="--max-old-space-size=450"
ENV NODE_ENV=production
ENV PORT=3001

# Ejecutar en modo producción
CMD ["node", "dist/main.js"]
