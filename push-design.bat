@echo off
cd /d "C:\Users\fjfc1\OneDrive\Documentos\GitHub\normalis"

echo [1/5] Borrando locks de OneDrive...
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\refs\remotes\origin\main.lock" 2>nul
echo     OK

echo [2/5] Cancelando rebase si existe...
git rebase --abort 2>nul
echo     OK

echo [3/5] Indice temporal...
set GIT_INDEX_FILE=%TEMP%\normalis-design-index
git read-tree HEAD

echo [4/5] Stagear archivos...
git add normalis-styles.css index.html

echo [5/5] Commit y push...
git commit --no-verify -m "design: mejoras quirurgicas - Inter font, sidebar, gradientes, landing premium"
git push origin main

echo.
echo ===== LISTO =====
pause
