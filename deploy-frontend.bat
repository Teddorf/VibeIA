@echo off
echo ==========================================
echo   VibeIA - Deploy Frontend a Vercel
echo ==========================================
echo.

:: Check if Vercel CLI is installed
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Instalando Vercel CLI...
    npm install -g vercel
)

echo.
echo Cambiando a directorio frontend...
cd frontend

echo.
echo Iniciando login en Vercel...
echo (Se abrira el navegador para autenticar)
call vercel login

echo.
echo Desplegando a produccion...
call vercel --prod -e NEXT_PUBLIC_API_URL=https://vibeia-backend.onrender.com --yes

echo.
echo ==========================================
echo   Frontend desplegado!
echo ==========================================
echo.
echo Ahora configura el backend en Render:
echo https://render.com
echo.
echo Variables de entorno para Render:
echo   NODE_ENV=production
echo   PORT=3001
echo   MONGO_URI=mongodb+srv://VibeIA_db:AdminAdmin1@cluster0.31tgodn.mongodb.net/vibecoding
echo   JWT_SECRET=vibeia-jwt-secret-key-prod-2024-secure
echo   JWT_REFRESH_SECRET=vibeia-refresh-secret-key-prod-2024-secure
echo   FRONTEND_URL=(tu URL de Vercel)
echo.
pause
