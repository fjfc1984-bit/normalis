@echo off
echo Checking firebase... > "%~dp0firebase-check.log"
where firebase >> "%~dp0firebase-check.log" 2>&1
echo APPDATA npm: >> "%~dp0firebase-check.log"
dir "%APPDATA%\npm\firebase*" >> "%~dp0firebase-check.log" 2>&1
echo Done.
