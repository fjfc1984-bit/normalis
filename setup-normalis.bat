@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ================================================================
echo   NormaLis - Setup completo de infraestructura
echo   Firebase Functions + Bold.co webhook pipeline
echo ================================================================
echo.

:: ----------------------------------------------------------------
:: PASO 1: Verificar dependencias
:: ----------------------------------------------------------------
echo [1/6] Verificando dependencias...

where firebase >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Firebase CLI no instalada.
    echo   Instalar con: npm install -g firebase-tools
    echo   Luego autenticarse: firebase login
    pause & exit /b 1
)
echo   OK: Firebase CLI encontrada

where node >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js no instalado. Descargar desde https://nodejs.org
    pause & exit /b 1
)
echo   OK: Node.js encontrado
echo.

:: ----------------------------------------------------------------
:: PASO 2: Instalar dependencias de functions/
:: ----------------------------------------------------------------
echo [2/6] Instalando dependencias de Firebase Functions...
cd functions
call npm install
if errorlevel 1 (
    echo   ERROR: npm install fallo
    cd ..
    pause & exit /b 1
)
cd ..
echo   OK: Dependencias instaladas
echo.

:: ----------------------------------------------------------------
:: PASO 3: Pedir el Webhook Secret de Bold.co
:: ----------------------------------------------------------------
echo [3/6] Configurar Bold.co Webhook Secret
echo.
echo   INSTRUCCIONES:
echo   1. Ir a Bold.co - Configuracion - Webhooks
echo   2. Agregar URL:
echo      https://us-central1-normalis-5587d.cloudfunctions.net/boldWebhook
echo   3. Copiar el "Webhook Secret" que genera Bold
echo.

set /p BOLD_SECRET="   Pegar el Webhook Secret de Bold.co (o Enter para omitir): "

if not "!BOLD_SECRET!"=="" (
    echo.
    echo   Configurando firebase functions:config...
    call firebase functions:config:set bold.webhook_secret="!BOLD_SECRET!" --project normalis-5587d
    if errorlevel 1 (
        echo   AVISO: Error al guardar config - continuar de todas formas
    ) else (
        echo   OK: bold.webhook_secret configurado
    )
) else (
    echo   OMITIDO - el webhook operara sin verificacion de firma
    echo   IMPORTANTE: configurar antes de ir a produccion:
    echo   firebase functions:config:set bold.webhook_secret="TU_SECRET" --project normalis-5587d
)
echo.

:: ----------------------------------------------------------------
:: PASO 4: Deploy de Firebase Functions
:: ----------------------------------------------------------------
echo [4/6] Desplegando Firebase Functions...
echo.
call firebase deploy --only functions --project normalis-5587d
if errorlevel 1 (
    echo.
    echo   ERROR: Deploy fallo. Verificar:
    echo   - Autenticado: firebase login
    echo   - Permisos en normalis-5587d
    pause & exit /b 1
)

echo.
echo   OK: Functions desplegadas exitosamente
echo.
echo   URLs disponibles:
echo   geminiProxy:
echo   https://us-central1-normalis-5587d.cloudfunctions.net/geminiProxy
echo.
echo   boldWebhook:
echo   https://us-central1-normalis-5587d.cloudfunctions.net/boldWebhook
echo.

:: ----------------------------------------------------------------
:: PASO 5: Checklist Bold.co (manual)
:: ----------------------------------------------------------------
echo [5/6] Checklist Bold.co - pasos manuales restantes
echo.
echo   Verificar en Bold.co que cada link de pago tenga:
echo   - URL de exito = https://normalis.co/success.html
echo   - Webhook URL  = https://us-central1-normalis-5587d.cloudfunctions.net/boldWebhook
echo.
echo   Links configurados:
echo   LNK_4JND4JELJ4  -  Esencial mensual
echo   LNK_QX9QJBBLWW  -  Esencial anual
echo   LNK_LRR5ZCRUMB  -  Profesional mensual
echo   LNK_RG2A6L92PU  -  Profesional anual
echo.

:: ----------------------------------------------------------------
:: PASO 6: Firestore Rules
:: ----------------------------------------------------------------
echo [6/6] Verificar Firestore Security Rules
echo.
echo   El Admin SDK bypasea las reglas de cliente - no se necesita
echo   cambio si se usa Firebase Admin (que es el caso en boldWebhook).
echo.
echo   Para verificar:
echo   https://console.firebase.google.com/project/normalis-5587d/firestore/rules
echo.

:: ----------------------------------------------------------------
:: RESUMEN FINAL
:: ----------------------------------------------------------------
echo ================================================================
echo   Setup completo
echo.
echo   Pipeline de pagos activo:
echo   Bold.co pago - Webhook - boldWebhook - Firestore - App
echo ================================================================
echo.

pause
