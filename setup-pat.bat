@echo off
REM ============================================================
REM  NormaLis SETUP PAT — configurar token GitHub una sola vez
REM  Después de esto, auto-push.bat funciona sin diálogos
REM ============================================================
cd /d "%~dp0"
set GIT="C:\Users\fjfc1\AppData\Local\GitHubDesktop\app-3.6.2\resources\app\git\cmd\git.exe"

echo ============================================================
echo  CONFIGURACION PAT - NormaLis
echo ============================================================
echo.
echo Pasos previos:
echo   1. Ve a https://github.com/settings/tokens/new
echo   2. Nombre: normalis-push
echo   3. Scope: repo (solo ese)
echo   4. Sin expiración (No expiration)
echo   5. Clic Generate token
echo   6. Copia el token (empieza con ghp_...)
echo.
set /p PAT="Pega tu GitHub Personal Access Token aqui: "

if "%PAT%"=="" (
  echo Token vacío — cancelando.
  pause
  exit /b 1
)

REM Guardar credenciales en Windows Credential Manager
cmdkey /generic:git:https://github.com /user:fjfc1984-bit /pass:%PAT%

REM Configurar remote con token embebido
%GIT% remote set-url origin https://fjfc1984-bit:%PAT%@github.com/fjfc1984-bit/normalis.git

REM Verificar
%GIT% remote -v

echo.
echo ============================================================
echo  Listo! Desde ahora auto-push.bat funciona sin diálogos.
echo  Prueba con: auto-push.bat
echo ============================================================
pause
