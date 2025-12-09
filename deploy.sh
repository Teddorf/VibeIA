#!/bin/bash

# ============================================
# VibeIA - Deployment Script
# ============================================
# Este script te guía paso a paso para deploy
# ============================================

echo "=========================================="
echo "  VibeIA - Deployment Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Instalando Vercel CLI...${NC}"
    npm install -g vercel
fi

echo ""
echo -e "${GREEN}=== PASO 1: MongoDB Atlas ===${NC}"
echo "Tu URI de MongoDB:"
echo "mongodb+srv://VibeIA_db:AdminAdmin1@cluster0.31tgodn.mongodb.net/vibecoding"
echo ""
echo -e "${YELLOW}Asegúrate de que en MongoDB Atlas:${NC}"
echo "  1. Network Access → 0.0.0.0/0 (Allow from anywhere)"
echo "  2. Database Access → Usuario VibeIA_db existe"
echo ""
read -p "Presiona Enter cuando MongoDB esté listo..."

echo ""
echo -e "${GREEN}=== PASO 2: Deploy Frontend a Vercel ===${NC}"
echo ""

cd frontend

# Login to Vercel if needed
echo "Iniciando sesión en Vercel..."
vercel login

# Deploy
echo ""
echo "Desplegando frontend..."
vercel --prod \
  -e NEXT_PUBLIC_API_URL=https://vibeia-backend.onrender.com \
  --yes

VERCEL_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^ ]*')
echo ""
echo -e "${GREEN}Frontend desplegado en: ${VERCEL_URL}${NC}"

cd ..

echo ""
echo -e "${GREEN}=== PASO 3: Backend en Render ===${NC}"
echo ""
echo -e "${YELLOW}Para el backend, ve a render.com y configura manualmente:${NC}"
echo ""
echo "1. New → Web Service → Connect GitHub"
echo "2. Root Directory: backend"
echo "3. Build Command: npm install && npm run build"
echo "4. Start Command: npm run start:prod"
echo "5. Environment Variables:"
echo ""
echo "   NODE_ENV=production"
echo "   PORT=3001"
echo "   MONGO_URI=mongodb+srv://VibeIA_db:AdminAdmin1@cluster0.31tgodn.mongodb.net/vibecoding"
echo "   JWT_SECRET=vibeia-jwt-secret-key-prod-2024-secure"
echo "   JWT_REFRESH_SECRET=vibeia-refresh-secret-key-prod-2024-secure"
echo "   FRONTEND_URL=${VERCEL_URL}"
echo ""
echo -e "${GREEN}=========================================="
echo "  Deployment completado!"
echo "==========================================${NC}"
