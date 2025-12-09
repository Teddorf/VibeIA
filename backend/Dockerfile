FROM node:20-alpine

WORKDIR /app

# Copiar package.json primero para aprovechar cache de Docker
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# Exponer puerto
EXPOSE 3001

# Limitar memoria para free tier de Render (512MB)
ENV NODE_OPTIONS="--max-old-space-size=450"

# Ejecutar en modo producción
CMD ["node", "dist/main.js"]
