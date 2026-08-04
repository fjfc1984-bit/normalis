@echo off
cd /d C:\dev\normalis\functions
echo Iniciando firebase deploy... > C:\dev\normalis\deploy-output.log
firebase deploy --only functions >> C:\dev\normalis\deploy-output.log 2>&1
echo EXIT CODE: %ERRORLEVEL% >> C:\dev\normalis\deploy-output.log
echo. >> C:\dev\normalis\deploy-output.log
echo DEPLOY TERMINADO - Revisa deploy-output.log
