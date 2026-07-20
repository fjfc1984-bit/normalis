@echo off
set LOG=C:\Users\fjfc1\OneDrive\Documentos\GitHub\normalis\deploy-v3.log
set FIRE=C:\Users\fjfc1\AppData\Roaming\npm\firebase.cmd
set ROOT=C:\Users\fjfc1\OneDrive\Documentos\GitHub\normalis

echo === NormaLis Deploy v4 === > "%LOG%"
echo Fecha: %DATE% %TIME% >> "%LOG%"

echo [0/3] Enable legacy config commands... >> "%LOG%"
cd /d "%ROOT%"
call "%FIRE%" experiments:enable legacyRuntimeConfigCommands --project normalis-5587d >> "%LOG%" 2>&1

echo [1/3] Config Gemini key... >> "%LOG%"
rem SEGURIDAD: API key removida — usar variable de entorno o configurar manualmente
rem call "%FIRE%" functions:config:set gemini.api_key="TU_CLAVE_AQUI" --project normalis-5587d >> "%LOG%" 2>&1
echo Config exit: %errorlevel% >> "%LOG%"

echo [2/3] Deploying functions... >> "%LOG%"
call "%FIRE%" deploy --only functions --project normalis-5587d >> "%LOG%" 2>&1

if %errorlevel%==0 (
  echo === EXITO === >> "%LOG%"
) else (
  echo === ERROR %errorlevel% === >> "%LOG%"
)
