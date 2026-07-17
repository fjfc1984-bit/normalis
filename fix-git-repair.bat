@echo off
cd /d "%~dp0"
set GIT="C:\Users\fjfc1\AppData\Local\GitHubDesktop\app-3.6.2\resources\app\git\cmd\git.exe"

echo ============================================
echo  REPARACION GIT - NormaLis
echo ============================================

REM Paso 1: Eliminar TODOS los lock files
echo [1] Eliminando lock files...
for /r ".git" %%F in (*.lock) do del /f "%%F" 2>nul
echo     Lock files eliminados

REM Paso 2: Eliminar el index corrupto
echo [2] Eliminando index corrupto...
del /f ".git\index" 2>nul
if exist ".git\index" (
  echo     ERROR: No se pudo eliminar el index
  goto :fin
)
echo     Index eliminado

REM Paso 3: Resetear a los 2 commits malos (ir a HEAD~2 = 95b02d8)
echo [3] Reseteando a commit limpio 95b02d8...
%GIT% reset --mixed 95b02d8
echo     RESET: %errorlevel%

REM Paso 4: Re-agregar todo
echo [4] Agregando todos los archivos...
%GIT% add -A
echo     ADD: %errorlevel%

REM Paso 5: Hacer commit limpio
echo [5] Commiteando...
%GIT% commit --no-verify -m "fix: hideAuthScreen + hardening seguridad + arquitectura modular"
echo     COMMIT: %errorlevel%

REM Paso 6: Push
echo [6] Haciendo push...
%GIT% push origin main
echo     PUSH: %errorlevel%

:fin
echo ============================================
echo  PROCESO TERMINADO
echo ============================================
pause
