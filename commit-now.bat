@echo off
cd /d "%~dp0"

set GIT="C:\Users\fjfc1\AppData\Local\GitHubDesktop\app-3.6.2\resources\app\git\cmd\git.exe"

REM Eliminar TODOS los lock files
for /r ".git" %%F in (*.lock) do del /f "%%F" 2>nul
echo Locks eliminados

REM Commit archivos pendientes
%GIT% add -A
%GIT% commit --no-verify -m "chore: scripts auxiliares y archivos de trabajo"
echo COMMIT2: %errorlevel%

REM Push todo a GitHub
%GIT% push origin main
echo PUSH: %errorlevel%
pause
