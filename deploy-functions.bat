@echo off
echo ============================================
echo  NormaLis - Deploy Firebase Cloud Functions
echo ============================================
echo.

cd /d C:\dev\normalis\functions

echo [1/2] Instalando dependencias npm...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR en npm install. Revisa la conexion a internet.
    pause
    exit /b 1
)

echo.
echo [2/2] Deployando Cloud Function a Firebase...
call firebase deploy --only functions
if %ERRORLEVEL% NEQ 0 (
    echo ERROR en firebase deploy. Verifica que estes logueado (firebase login).
    pause
    exit /b 1
)

echo.
echo ============================================
echo  DEPLOY EXITOSO
echo  La funcion nuevoLead esta activa en Firebase
echo ============================================
pause
