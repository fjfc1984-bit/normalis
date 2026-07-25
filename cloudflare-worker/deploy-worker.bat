@echo off
chcp 65001 >nul
title NormaLis — Deploy Cloudflare Worker

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║        NormaLis — Deploy Cloudflare Worker               ║
echo ║  Chat IA (Groq) + Emails (Resend) + Cron vencimientos    ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js no instalado. Descarga en https://nodejs.org
  pause
  exit /b 1
)

:: Verificar/instalar wrangler
npx wrangler --version >nul 2>&1
if %errorlevel% neq 0 (
  echo [INFO] Instalando Wrangler...
  npm install -g wrangler
  if %errorlevel% neq 0 (
    echo [ERROR] No se pudo instalar wrangler
    pause
    exit /b 1
  )
)

echo [1/4] Autenticando con Cloudflare...
echo       (Se abrira el navegador — inicia sesion en Cloudflare)
echo.
npx wrangler login
if %errorlevel% neq 0 (
  echo [ERROR] Autenticacion fallida
  pause
  exit /b 1
)

echo.
echo [2/4] Configurar GROQ_API_KEY (Chat IA — OBLIGATORIO)
echo       Obtener gratis en: https://console.groq.com/keys
echo       La key empieza con: gsk_...
echo.
npx wrangler secret put GROQ_API_KEY --name normalis
if %errorlevel% neq 0 (
  echo [WARN] GROQ_API_KEY no configurada. El chat IA no funcionara.
)

echo.
echo [3/4] Configurar RESEND_API_KEY (Emails — OPCIONAL)
echo       Obtener gratis en: https://resend.com/api-keys
echo       Presiona ENTER para saltar si aun no tienes la key.
echo.
set /p RESEND_SKIP="Configurar RESEND_API_KEY ahora? (s/n): "
if /i "%RESEND_SKIP%"=="s" (
  npx wrangler secret put RESEND_API_KEY --name normalis
)

echo.
echo [4/4] Desplegando Worker...
npx wrangler deploy worker.js --name normalis --compatibility-date 2024-09-23
if %errorlevel% neq 0 (
  echo [ERROR] Deploy fallido. Revisa el log arriba.
  pause
  exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  ✅  DEPLOY EXITOSO                                      ║
echo ║                                                          ║
echo ║  Worker URL: https://normalis.fjfc1984.workers.dev      ║
echo ║                                                          ║
echo ║  Ahora haz push en GitHub Desktop para que el sitio     ║
echo ║  principal también se actualice en normalis.co          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
pause
