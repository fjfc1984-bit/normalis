@echo off
cd /d "%~dp0"
set GIT="C:\Users\fjfc1\AppData\Local\GitHubDesktop\app-3.6.2\resources\app\git\cmd\git.exe"

echo ============================================
echo  FIX CRLF + GITIGNORE - NormaLis
echo ============================================

REM Eliminar lock files
for /r ".git" %%F in (*.lock) do del /f "%%F" 2>nul
echo [1] Locks eliminados

REM Agregar .gitattributes y .gitignore
%GIT% add .gitattributes .gitignore
echo [2] gitattributes + gitignore staged

REM Commit esos 2 archivos
%GIT% commit --no-verify -m "chore: agregar .gitattributes (LF) y .gitignore"
echo [3] COMMIT: %errorlevel%

REM Renormalizar TODOS los archivos tracked (aplica eol=lf)
echo [4] Renormalizando line endings...
%GIT% add --renormalize .
echo     Renormalizacion OK

REM Ver cuantos archivos cambiaron
%GIT% diff --cached --stat | findstr "changed"

REM Commit solo si hay cambios
%GIT% diff --cached --quiet
if %errorlevel% neq 0 (
  %GIT% commit --no-verify -m "chore: normalizar line endings a LF en todo el repo"
  echo [5] COMMIT normalizacion: %errorlevel%
) else (
  echo [5] Sin cambios de line endings que commitear
)

echo ============================================
echo  COMMITS LISTOS - usa GitHub Desktop para Push origin
echo ============================================
pause
