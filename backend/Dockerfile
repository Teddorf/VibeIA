FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar TODAS las dependencias para el build
RUN npm ci

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Copiar el build desde el stage anterior
COPY --from=builder /app/dist ./dist

# Exponer puerto
EXPOSE 3001

# Limitar memoria para free tier de Render (512MB)
ENV NODE_OPTIONS="--max-old-space-size=450"
ENV NODE_ENV=production
ENV PORT=3001

# Ejecutar en modo producción
CMD ["node", "dist/main.js"]
