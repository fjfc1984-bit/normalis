@echo off
chcp 65001 >nul
echo ============================================================
echo  NormaLis — Desplegar Cloudflare Worker
echo ============================================================
echo.

cd /d "%~dp0"

where wrangler >nul 2>&1
if errorlevel 1 (
    echo [!] wrangler no encontrado. Instalando...
    npm install -g wrangler
    if errorlevel 1 (
        echo ERROR: No se pudo instalar wrangler.
        echo Instala Node.js desde https://nodejs.org y vuelve a intentar.
        pause
        exit /b 1
    )
)

echo Desplegando Worker...
echo.
wrangler deploy

if errorlevel 1 (
    echo.
    echo ERROR en el deploy. Posibles causas:
    echo  - No estas autenticado: corre "wrangler login" primero
    echo  - Falta wrangler.toml en esta carpeta
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Worker desplegado en: https://normalis.fjfc1984.workers.dev
echo ============================================================
echo.
pause
