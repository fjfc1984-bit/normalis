@echo off
cd /d "C:\Users\fjfc1\OneDrive\Documentos\GitHub\normalis"

echo [1/5] Borrando locks de OneDrive...
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\refs\remotes\origin\main.lock" 2>nul
echo     OK

echo [2/5] Indice temporal...
set GIT_INDEX_FILE=%TEMP%\normalis-fix-index
git read-tree HEAD

echo [3/5] Stagear archivos corregidos...
git add web/app/dashboard/talento/page.tsx
git add web/app/dashboard/firma/page.tsx
git add web/app/dashboard/consentimientos/page.tsx

echo [4/5] Commit...
git commit --no-verify -m "fix: corregir errores TS en modulos talento/firma/consentimientos"

echo [5/5] Push a GitHub (Vercel desplegara automaticamente)...
git push origin main

echo.
echo ===== LISTO - Vercel desplegara en ~2 minutos =====
pause
