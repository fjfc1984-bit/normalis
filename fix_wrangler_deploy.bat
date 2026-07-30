@echo off
echo === Paso 1: Guardar ruta actual (localizada) ===
set "OLD_LOCALAPPDATA=%LOCALAPPDATA%"
echo OLD_LOCALAPPDATA=%OLD_LOCALAPPDATA%

echo === Paso 2: Fix registro LOCALAPPDATA ===
reg add "HKCU\Environment" /v "LOCALAPPDATA" /t REG_EXPAND_SZ /d "%%USERPROFILE%%\AppData\Local" /f
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders" /v "Local AppData" /t REG_SZ /d "C:\Users\fjfc1\AppData\Local" /f
reg add "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders" /v "Local AppData" /t REG_EXPAND_SZ /d "%%USERPROFILE%%\AppData\Local" /f

echo === Paso 3: Migrar config wrangler desde ruta localizada ===
set "NEW_LOCAL=C:\Users\fjfc1\AppData\Local"
if exist "%OLD_LOCALAPPDATA%\.wrangler\config\default.toml" (
    mkdir "%NEW_LOCAL%\.wrangler\config" 2>nul
    copy "%OLD_LOCALAPPDATA%\.wrangler\config\default.toml" "%NEW_LOCAL%\.wrangler\config\default.toml" /y
    echo OK - Config wrangler migrado
) else (
    echo AVISO - No se encontro config en: %OLD_LOCALAPPDATA%\.wrangler\config\default.toml
    echo ACCION REQUERIDA: Agregar CLOUDFLARE_API_TOKEN al bat o correr 'wrangler login' primero
)

echo === Paso 4: Deploy ===
cd /d "C:\Users\fjfc1\OneDrive\Documentos\GitHub\normalis"
set LOCALAPPDATA=%NEW_LOCAL%
set APPDATA=C:\Users\fjfc1\AppData\Roaming
set TEMP=%NEW_LOCAL%\Temp
set TMP=%NEW_LOCAL%\Temp
echo LOCALAPPDATA=%LOCALAPPDATA%
echo === Ejecutando wrangler deploy ===
wrangler deploy > "C:\Users\fjfc1\OneDrive\Documentos\GitHub\normalis\wrangler_output.txt" 2>&1
set EXIT_CODE=%ERRORLEVEL%
echo.
echo === FIN - exit code: %EXIT_CODE% ===
type "C:\Users\fjfc1\OneDrive\Documentos\GitHub\normalis\wrangler_output.txt"
echo.
pause
