@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ████████████████████████████████████████████████████████████████
echo   NormaLis — Setup completo de infraestructura
echo   Firebase Functions + Bold.co webhook pipeline
echo ████████████████████████████████████████████████████████████████
echo.

:: ──────────────────────────────────────────────────────────────────
:: PASO 1: Verificar dependencias
:: ──────────────────────────────────────────────────────────────────
echo [1/6] Verificando dependencias...

where firebase >nul 2>&1
if errorlevel 1 (
    echo   ❌ Firebase CLI no instalada.
    echo      Instalar con: npm install -g firebase-tools
    echo      Luego: firebase login
    pause & exit /b 1
)
echo   ✅ Firebase CLI encontrada

where node >nul 2>&1
if errorlevel 1 (
    echo   ❌ Node.js no instalado. Descargar desde https://nodejs.org
    pause & exit /b 1
)
echo   ✅ Node.js encontrado

echo.

:: ──────────────────────────────────────────────────────────────────
:: PASO 2: Instalar dependencias de functions/
:: ──────────────────────────────────────────────────────────────────
echo [2/6] Instalando dependencias de Firebase Functions...
cd functions
call npm install
if errorlevel 1 (
    echo   ❌ Error en npm install
    cd ..
    pause & exit /b 1
)
cd ..
echo   ✅ Dependencias instaladas
echo.

:: ──────────────────────────────────────────────────────────────────
:: PASO 3: Pedir el Webhook Secret de Bold.co
:: ──────────────────────────────────────────────────────────────────
echo [3/6] Configurar Bold.co Webhook Secret
echo.
echo   ┌─────────────────────────────────────────────────────────┐
echo   │ INSTRUCCIONES:                                           │
echo   │                                                          │
echo   │ 1. Ir a Bold.co → Configuración → Webhooks              │
echo   │ 2. Agregar URL:                                          │
echo   │    https://us-central1-normalis-5587d.cloudfunctions.net/boldWebhook
echo   │ 3. Copiar el "Webhook Secret" que genera Bold            │
echo   └─────────────────────────────────────────────────────────┘
echo.

set /p BOLD_SECRET="   Pegar el Webhook Secret de Bold.co (o Enter para omitir): "

if not "!BOLD_SECRET!"=="" (
    echo.
    echo   Configurando firebase functions:config...
    call firebase functions:config:set bold.webhook_secret="!BOLD_SECRET!" --project normalis-5587d
    if errorlevel 1 (
        echo   ⚠️  Error al guardar config — continuar de todas formas
    ) else (
        echo   ✅ bold.webhook_secret configurado
    )
) else (
    echo   ⚠️  Omitido — el webhook operará sin verificación de firma
    echo       IMPORTANTE: configurar antes de ir a producción:
    echo       firebase functions:config:set bold.webhook_secret="TU_SECRET" --project normalis-5587d
)
echo.

:: ──────────────────────────────────────────────────────────────────
:: PASO 4: Deploy de Firebase Functions
:: ──────────────────────────────────────────────────────────────────
echo [4/6] Desplegando Firebase Functions...
echo.
call firebase deploy --only functions --project normalis-5587d
if errorlevel 1 (
    echo.
    echo   ❌ Deploy falló. Verificar:
    echo      - Estar autenticado: firebase login
    echo      - Tener permisos en normalis-5587d
    echo      - Revisar errores arriba
    pause & exit /b 1
)

echo.
echo   ✅ Functions desplegadas exitosamente
echo.
echo   URLs disponibles:
echo   ┌─────────────────────────────────────────────────────────────────────┐
echo   │  geminiProxy:                                                         │
echo   │  https://us-central1-normalis-5587d.cloudfunctions.net/geminiProxy   │
echo   │                                                                       │
echo   │  boldWebhook:                                                         │
echo   │  https://us-central1-normalis-5587d.cloudfunctions.net/boldWebhook   │
echo   └─────────────────────────────────────────────────────────────────────┘
echo.

:: ──────────────────────────────────────────────────────────────────
:: PASO 5: Checklist Bold.co (manual)
:: ──────────────────────────────────────────────────────────────────
echo [5/6] Checklist Bold.co — pasos manuales restantes
echo.
echo   Verificar en el dashboard de Bold.co que cada link de pago tenga:
echo.
echo   ✓ URL de éxito = https://normalis.co/success.html
echo   ✓ Webhook URL  = https://us-central1-normalis-5587d.cloudfunctions.net/boldWebhook
echo.
echo   Links configurados:
echo   ┌───────────────────┬──────────────┬───────────────────────────┐
echo   │ Link ID           │ Plan         │ Descripción               │
echo   ├───────────────────┼──────────────┼───────────────────────────┤
echo   │ LNK_4JND4JELJ4   │ Esencial     │ Mensual                   │
echo   │ LNK_QX9QJBBLWW   │ Esencial     │ Anual                     │
echo   │ LNK_LRR5ZCRUMB   │ Profesional  │ Mensual                   │
echo   │ LNK_RG2A6L92PU   │ Profesional  │ Anual                     │
echo   └───────────────────┴──────────────┴───────────────────────────┘
echo.

:: ──────────────────────────────────────────────────────────────────
:: PASO 6: Verificar Firestore Rules
:: ──────────────────────────────────────────────────────────────────
echo [6/6] Verificar Firestore Security Rules
echo.
echo   Las reglas de Firestore deben permitir al admin SDK (sin auth) leer
echo   y escribir en 'usuarios' y 'webhook_sin_usuario'.
echo   Las reglas del Admin SDK bypass las reglas de cliente — no se necesita
echo   cambio si se usa Firebase Admin (que es el caso en boldWebhook).
echo.
echo   Si quieres verificar: https://console.firebase.google.com/project/normalis-5587d/firestore/rules
echo.

:: ──────────────────────────────────────────────────────────────────
:: RESUMEN FINAL
:: ──────────────────────────────────────────────────────────────────
echo ████████████████████████████████████████████████████████████████
echo   ✅ Setup completo
echo.
echo   Pipeline de pagos activo:
echo   Bold.co pago → Webhook → boldWebhook (Firebase) → Firestore
echo   → Usuario con plan activo → success.html (polling) → App
echo ████████████████████████████████████████████████████████████████
echo.

pause
