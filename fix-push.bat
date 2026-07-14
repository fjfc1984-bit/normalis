@echo off
cd /d "%~dp0"
echo Eliminando lock files...
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
echo Haciendo commit...
git add normativa-app-v2.html
git commit -m "Fix onboarding: skip dark-blue wizard si normalis_onboarding_done esta activo"
echo Haciendo push...
git push origin main
echo.
echo LISTO. Puedes cerrar esta ventana.
pause
