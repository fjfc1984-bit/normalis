@echo off
title Deploy Worker NormaLis
cd /d "C:\Users\fjfc1\OneDrive\Documentos\GitHub\normalis\cloudflare-worker"
echo.
echo ==========================================
echo  DEPLOYING NormaLis Cloudflare Worker
echo  Removing google_search - free tier fix
echo ==========================================
echo.
npx wrangler deploy
echo.
echo ==========================================
if %errorlevel% == 0 (
  echo  DEPLOY EXITOSO
  echo  Worker: https://normalis.fjfc1984.workers.dev
) else (
  echo  ERROR en deploy - ver output arriba
)
echo ==========================================
pause
