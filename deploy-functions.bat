@echo off
echo ============================================
echo  NormaLis - Deploy Firebase Functions
echo ============================================
echo.

cd /d "%~dp0functions"

echo [1/4] Instalando dependencias npm...
call npm install 2>nul
echo OK.

echo.
echo [2/4] Verificando autenticacion Firebase...
call npx firebase-tools@latest projects:list --project normalis-5587d 2>&1 | findstr /i "normalis\|error\|login"
if errorlevel 1 (
  echo.
  echo NECESITAS AUTENTICARTE. Ejecutando firebase login...
  echo Se abrira el navegador. Inicia sesion con tu cuenta Google.
  echo.
  call npx firebase-tools@latest login
)

echo.
echo [3/4] Configurando API key de Gemini...
echo INSTRUCCION: pega tu clave de https://aistudio.google.com/app/apikey
echo Ejecuta manualmente: npx firebase-tools@latest functions:config:set gemini.api_key="TU_CLAVE_AQUI" --project normalis-5587d
echo (Clave removida del script por seguridad — nunca hardcodear API keys en archivos)
echo Config establecida.

echo.
echo [4/4] Desplegando Firebase Functions...
call npx firebase-tools@latest deploy --only functions --project normalis-5587d

echo.
echo ============================================
if errorlevel 1 (
  echo  ERROR en el deploy. Ver mensajes arriba.
) else (
  echo  EXITO!
  echo  Proxy: https://us-central1-normalis-5587d.cloudfunctions.net/geminiProxy
)
echo ============================================
echo.
pause
