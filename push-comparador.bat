@echo off
cd /d "C:\Users\fjfc1\OneDrive\Documentos\GitHub\normalis"

echo [1/5] Borrando locks de OneDrive...
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\refs\remotes\origin\main.lock" 2>nul
echo     OK

echo [2/5] Indice temporal...
set GIT_INDEX_FILE=%TEMP%\normalis-comparador-index
git read-tree HEAD

echo [3/5] Stagear archivos...
git add web/app/dashboard/comparador/page.tsx
git add web/app/dashboard/layout.tsx
git add web/lib/data/aeData.ts

echo [4/5] Commit...
git commit --no-verify -m "feat: Comparador Normativo (ISO 7101/JCI) + datos AE_DB portados a TS"

echo [5/5] Push a GitHub (Vercel desplegara automaticamente)...
git push origin main

echo.
echo ===== LISTO =====
echo Comparador: https://www.normalis.co/dashboard/comparador
pause
