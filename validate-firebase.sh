#!/usr/bin/env bash
# validate-firebase.sh - Verifica que la config Firebase sea identica en todos los archivos
# Una sola key distinta = auth roto silenciosamente en ese archivo

REPO="${1:-$(dirname "$0")}"
ERRORS=0
WARNINGS=0

RED='\033[0;31m'; YEL='\033[1;33m'; GRN='\033[0;32m'; NC='\033[0m'
ok()   { echo -e "${GRN}  [OK] $1${NC}"; }
warn() { echo -e "${YEL}  [!!] $1${NC}"; WARNINGS=$((WARNINGS+1)); }
fail() { echo -e "${RED}  [XX] $1${NC}"; ERRORS=$((ERRORS+1)); }

HTML_FILES=("admin.html" "login.html" "registro.html" "normativa-app-v2.html" "index.html")

echo ""; echo "============================================================"
echo "  VALIDACION Firebase Config - NormaLis"
echo "============================================================"

# Config de referencia (de admin.html como fuente de verdad)
REF_FILE="$REPO/admin.html"
if [ ! -f "$REF_FILE" ]; then
    fail "Archivo de referencia admin.html no encontrado"
    exit 1
fi

# Extraer valores de referencia
REF_API_KEY=$(grep -oP "apiKey:\s*['\"]\\K[^'\"]*" "$REF_FILE" | head -1)
REF_PROJECT_ID=$(grep -oP "projectId:\s*['\"]\\K[^'\"]*" "$REF_FILE" | head -1)
REF_APP_ID=$(grep -oP "appId:\s*['\"]\\K[^'\"]*" "$REF_FILE" | head -1)
REF_AUTH_DOMAIN=$(grep -oP "authDomain:\s*['\"]\\K[^'\"]*" "$REF_FILE" | head -1)

echo "  Config de referencia (admin.html):"
echo "    projectId:  $REF_PROJECT_ID"
echo "    authDomain: $REF_AUTH_DOMAIN"
echo ""

# Verificar cada archivo
for FNAME in "${HTML_FILES[@]}"; do
    FPATH="$REPO/$FNAME"
    [ ! -f "$FPATH" ] && continue

    # Solo verificar archivos que inicialicen Firebase
    if ! grep -qP 'firebase\.initializeApp|initializeApp|firebaseConfig' "$FPATH"; then
        echo "  $FNAME: no inicializa Firebase, saltando"
        continue
    fi

    FILE_API_KEY=$(grep -oP "apiKey:\s*['\"]\\K[^'\"]*" "$FPATH" | head -1)
    FILE_PROJECT_ID=$(grep -oP "projectId:\s*['\"]\\K[^'\"]*" "$FPATH" | head -1)
    FILE_APP_ID=$(grep -oP "appId:\s*['\"]\\K[^'\"]*" "$FPATH" | head -1)
    FILE_AUTH_DOMAIN=$(grep -oP "authDomain:\s*['\"]\\K[^'\"]*" "$FPATH" | head -1)

    FILE_ERRORS=0

    if [ -n "$FILE_API_KEY" ] && [ "$FILE_API_KEY" != "$REF_API_KEY" ]; then
        fail "$FNAME: apiKey DIFERENTE ($FILE_API_KEY)"
        FILE_ERRORS=$((FILE_ERRORS+1))
    fi
    if [ -n "$FILE_PROJECT_ID" ] && [ "$FILE_PROJECT_ID" != "$REF_PROJECT_ID" ]; then
        fail "$FNAME: projectId DIFERENTE ($FILE_PROJECT_ID)"
        FILE_ERRORS=$((FILE_ERRORS+1))
    fi
    if [ -n "$FILE_APP_ID" ] && [ "$FILE_APP_ID" != "$REF_APP_ID" ]; then
        fail "$FNAME: appId DIFERENTE ($FILE_APP_ID)"
        FILE_ERRORS=$((FILE_ERRORS+1))
    fi
    if [ -n "$FILE_AUTH_DOMAIN" ] && [ "$FILE_AUTH_DOMAIN" != "$REF_AUTH_DOMAIN" ]; then
        fail "$FNAME: authDomain DIFERENTE ($FILE_AUTH_DOMAIN)"
        FILE_ERRORS=$((FILE_ERRORS+1))
    fi

    if [ "$FILE_ERRORS" -eq 0 ]; then
        ok "$FNAME: config Firebase identica a referencia"
    fi
    ERRORS=$((ERRORS+FILE_ERRORS))
done

echo ""; echo "============================================================"
if [ "$ERRORS" -eq 0 ]; then
    echo -e "${GRN}  RESULTADO: Config Firebase consistente en todos los archivos${NC}"
else
    echo -e "${RED}  RESULTADO: $ERRORS diferencia(s) encontradas - NO COMMITEAR${NC}"
fi
echo "============================================================"; echo ""
exit $ERRORS
