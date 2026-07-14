#!/usr/bin/env bash
# validate-login.sh - Validacion pre-commit para login.html (NormaLis)

FILE="${1:-$(dirname "$0")/login.html}"
ERRORS=0
WARNINGS=0

RED='\033[0;31m'; YEL='\033[1;33m'; GRN='\033[0;32m'; NC='\033[0m'
ok()   { echo -e "${GRN}  [OK] $1${NC}"; }
warn() { echo -e "${YEL}  [!!] $1${NC}"; WARNINGS=$((WARNINGS+1)); }
fail() { echo -e "${RED}  [XX] $1${NC}"; ERRORS=$((ERRORS+1)); }

[ ! -f "$FILE" ] && echo -e "${RED}ERROR: No se encontro $FILE${NC}" && exit 1

echo ""; echo "============================================================"
echo "  VALIDACION login.html - NormaLis"
echo "============================================================"

# 1. Funciones criticas presentes
for FN in routeUser prefillAppData; do
    if grep -qP "function $FN\s*\(|const $FN\s*=" "$FILE" || grep -qP "$FN\s*=" "$FILE"; then
        ok "Funcion $FN: presente"
    else
        fail "Funcion $FN: NO encontrada"
    fi
done

# 1b. Submit handler de login presente
if grep -qP "signInWithEmailAndPassword" "$FILE"; then
    ok "Login handler: signInWithEmailAndPassword presente"
else
    fail "Login handler: signInWithEmailAndPassword no encontrado - el login no funciona"
fi

# 2. Routing lee Firestore (no Custom Claims)
if grep -qP 'token\.claims' "$FILE"; then
    fail "Custom Claims: token.claims encontrado - siempre falla"
else
    ok "Custom Claims: sin referencias a token.claims"
fi

# 3. routeUser maneja rol piloto
if grep -qP "piloto" "$FILE"; then
    ok "Rol piloto: manejo presente en login.html"
else
    fail "Rol piloto: no se encontro manejo del rol piloto - usuarios piloto quedaran sin ruta"
fi

# 4. routeUser maneja rol cliente
if grep -qP "cliente" "$FILE"; then
    ok "Rol cliente: manejo presente en login.html"
else
    fail "Rol cliente: no se encontra manejo del rol cliente"
fi

# 5. routeUser maneja rol admin
if grep -qP "admin" "$FILE"; then
    ok "Rol admin: manejo presente en login.html"
else
    fail "Rol admin: no se encontra manejo del rol admin"
fi

# 6. prefillAppData usa data.nombre (IPS name, no person name)
if grep -qP 'data\.nombre\b' "$FILE"; then
    ok "prefillAppData: usa data.nombre (IPS name)"
else
    warn "prefillAppData: no se encontro data.nombre - verificar que se lea el nombre de la IPS"
fi

# 7. normalis_onboarding_done se setea antes de redirigir
if grep -qP 'normalis_onboarding_done' "$FILE"; then
    ok "Onboarding flag: normalis_onboarding_done presente"
else
    fail "Onboarding flag: normalis_onboarding_done no encontrado - wizard aparecera en cada login"
fi

# 8. expiresAt verificado para rol piloto
if grep -qP 'expiresAt' "$FILE"; then
    ok "Expiry check: expiresAt verificado para pilotos"
else
    warn "Expiry check: expiresAt no encontrado - pilotos vencidos podrian seguir entrando"
fi

# 9. Redireccion a normativa-app-v2.html presente
if grep -qP 'normativa-app-v2\.html' "$FILE"; then
    ok "Redireccion a app: normativa-app-v2.html presente"
else
    fail "Redireccion a app: no se encontro redireccion a normativa-app-v2.html"
fi

# 10. Redireccion a admin.html presente
if grep -qP 'admin\.html' "$FILE"; then
    ok "Redireccion a admin: admin.html presente"
else
    fail "Redireccion a admin: no se encontro redireccion a admin.html"
fi

echo ""; echo "============================================================"
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GRN}  RESULTADO: LISTO PARA COMMIT${NC}"
elif [ "$ERRORS" -eq 0 ]; then
    echo -e "${YEL}  RESULTADO: LISTO (con $WARNINGS advertencia(s))${NC}"
else
    echo -e "${RED}  RESULTADO: NO COMMITEAR - $ERRORS error(es) critico(s)${NC}"
fi
echo "============================================================"; echo ""
exit $ERRORS
