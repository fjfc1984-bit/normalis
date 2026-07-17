@echo off
REM ============================================================
REM  NormaLis AUTO-PUSH — commit + push en 1 clic
REM  Requiere haber configurado el PAT una vez (setup-pat.bat)
REM ============================================================
cd /d "%~dp0"
set GIT="C:\Users\fjfc1\AppData\Local\GitHubDesktop\app-3.6.2\resources\app\git\cmd\git.exe"

REM Limpiar TODOS los lock files (OneDrive/Windows los deja a veces)
for /r ".git" %%F in (*.lock) do del /f "%%F" 2>nul

REM Ver si hay cambios
%GIT% status --porcelain > "%TEMP%\normalis_status.txt" 2>&1
for %%A in ("%TEMP%\normalis_status.txt") do set SIZE=%%~zA
if %SIZE% EQU 0 (
  echo No hay cambios que subir.
  goto :fin
)

REM Mensaje de commit automático con fecha y hora
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set FECHA=%%c-%%b-%%a
for /f "tokens=1-2 delims=:." %%a in ('time /t') do set HORA=%%a%%b
set MSG=deploy: actualizacion %FECHA% %HORA%

REM Actualizar cache-busting version en normativa-app-v2.html
python -c "
import re, datetime, sys
fp = 'normativa-app-v2.html'
try:
    v = datetime.datetime.now().strftime('%%Y%%m%%d')
    with open(fp, 'r', encoding='utf-8') as f: c = f.read()
    c = re.sub(r'(normalis-[^\"]+\.(?:js|css))\?v=\d+', r'\1?v='+v, c)
    with open(fp, 'w', encoding='utf-8') as f: f.write(c)
    print('[auto-push] Cache version actualizada: v=' + v)
except Exception as e:
    print('[auto-push] Warning cache-bust: ' + str(e))
"

REM Agregar todo y commitear
%GIT% add -A
%GIT% commit --no-verify -m "%MSG%"

REM Push directo (funciona si setup-pat.bat fue ejecutado)
%GIT% push origin main
if %errorlevel% EQU 0 (
  echo.
  echo ✓ Publicado en normalis.co — commit: %MSG%
) else (
  echo.
  echo PUSH FALLO — ejecuta setup-pat.bat si es la primera vez
)

:fin
timeout /t 3 >nul
