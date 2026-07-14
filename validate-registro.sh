#!/usr/bin/env bash
# validate-registro.sh - Validacion pre-commit para registro.html (NormaLis)

FILE="${1:-$(dirname "$0")/registro.html}"
ERRORS=0
WARNINGS=0

RED='\033[0;31m'; YEL='\033[1;33m'; GRN='\033[0;32m'; NC='\033[0m'
ok()   { echo -e "${GRN}  [OK] $1${NC}"; }
warn() { echo -e "${YEL}  [!!] $1${NC}"; WARNINGS=$((WARNINGS+1)); }
fail() { echo -e "${RED}  [XX] $1${NC}"; ERRORS=$((ERRORS+1)); }

[ ! -f "$FILE" ] && echo -e "${RED}ERROR: No se encontro $FILE${NC}" && exit 1

echo ""; echo "============================================================"
echo "  VALIDACION registro.html - NormaLis"
echo "============================================================"

# 1. Documento Firestore creado con rol pendiente
if grep -qP "rol:\s*['\"]pendiente['\"]" "$FILE"; then
    ok "Rol inicial: 'pendiente' correcto para auto-registro"
else
    fail "Rol inicial: no se encontro rol:'pendiente' - nuevos usuarios podrian tener acceso sin aprobacion"
fi

# 2. nombre = IPS name (no persona)
# La key 'nombre' en el documento Firestore debe ser el nombre de la IPS
if grep -qP "^\s+nombre:\s*" "$FILE"; then
    # Verifica que no sea el nombre del responsable
    if grep -qP "^\s+nombre:\s*.*[Rr]esponsable" "$FILE"; then
        fail "Campo nombre: podria estar usando nombre del responsable en vez del nombre IPS"
    else
        ok "Campo nombre: presente (verificar manualmente que sea nombre IPS)"
    fi
else
    warn "Campo nombre: no encontrado en estructura Firestore"
fi

# 3. nombreContacto para la persona
if grep -qP 'nombreContacto' "$FILE"; then
    ok "nombreContacto: presente para datos de la persona de contacto"
else
    warn "nombreContacto: no encontrado - login.html puede no mostrar nombre de contacto correcto"
fi

# 4. Rollback: elimina usuario Auth si Firestore falla
if grep -qP 'delete\(\)|\.delete' "$FILE"; then
    ok "Rollback: eliminacion de usuario Auth en caso de error Firestore"
else
    warn "Rollback: no se encontro eliminacion de usuario - registro incompleto puede dejar usuarios Auth huerfanos"
fi

# 5. fechaSolicitud con serverTimestamp
if grep -qP 'serverTimestamp|fechaSolicitud' "$FILE"; then
    ok "fechaSolicitud: timestamp del servidor presente"
else
    warn "fechaSolicitud: no encontrado - solicitudes pueden no tener fecha en el panel admin"
fi

# 6. Validacion de campos en frontend
if grep -qP 'required|validate|invalid' "$FILE"; then
    ok "Validacion frontend: presente"
else
    warn "Validacion frontend: no detectada - formulario puede enviar datos incompletos"
fi

# 7. Firebase inicializado
if grep -qP 'firebase\.initializeApp|initializeApp' "$FILE"; then
    ok "Firebase: inicializado en registro.html"
else
    fail "Firebase: no inicializado - el registro no podra guardar datos"
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
