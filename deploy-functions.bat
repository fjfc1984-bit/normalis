@echo off
REM ══════════════════════════════════════════════════════════════════════
REM  NormaLis — Deploy Firebase Functions
REM  Incluye: geminiProxy + boldWebhook
REM
REM  ANTES DE CORRER POR PRIMERA VEZ:
REM  1. Instalar Firebase CLI: npm install -g firebase-tools
REM  2. Login: firebase login
REM  3. Configurar secrets (UNA SOLA VEZ):
REM     cd functions && npm install
REM     firebase functions:config:set gemini.api_key="TU_GEMINI_KEY"
REM     firebase functions:config:set bold.webhook_secret="TU_BOLD_SECRET"
REM  4. En Bold.co dashboard:
REM     - Webhook URL: https://us-central1-normalis-5587d.cloudfunctions.net/boldWebhook
REM     - Success URL: https://normalis.co/success.html
REM ══════════════════════════════════════════════════════════════════════

echo.
echo Desplegando Firebase Functions NormaLis...
echo.

cd /d "%~dp0"

echo [1/3] Instalando dependencias de functions...
cd functions
call npm install
if errorlevel 1 ( echo ERROR: npm install fallo & pause & exit /b 1 )
cd ..

echo.
echo [2/3] Desplegando funciones a Firebase...
call firebase deploy --only functions --project normalis-5587d
if errorlevel 1 ( echo ERROR: Deploy fallo & pause & exit /b 1 )

echo.
echo [3/3] URLs publicadas:
echo   geminiProxy:  https://us-central1-normalis-5587d.cloudfunctions.net/geminiProxy
echo   boldWebhook:  https://us-central1-normalis-5587d.cloudfunctions.net/boldWebhook
echo.
echo PROXIMOS PASOS si es el primer deploy de boldWebhook:
echo   1. Bold.co Dashboard - Webhooks - Agregar URL del boldWebhook
echo   2. Copiar Webhook Secret de Bold.co
echo   3. firebase functions:config:set bold.webhook_secret="EL_SECRET"
echo   4. firebase deploy --only functions
echo   5. En cada link de Bold.co: Success URL = https://normalis.co/success.html
echo.
pause
