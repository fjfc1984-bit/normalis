#!/usr/bin/env bash
# validate-admin.sh - Validacion pre-commit para admin.html (NormaLis)
# Uso desde Cowork/bash:
#   bash /sessions/.../mnt/normalis/validate-admin.sh
# O con ruta explicita:
#   bash validate-admin.sh path/to/admin.html

FILE="${1:-$(dirname "$0")/admin.html}"
ERRORS=0
WARNINGS=0

RED='\033[0;31m'
YEL='\033[1;33m'
GRN='\033[0;32m'
NC='\033[0m'

ok()   { echo -e "${GRN}  [OK] $1${NC}"; }
warn() { echo -e "${YEL}  [!!] $1${NC}"; WARNINGS=$((WARNINGS+1)); }
fail() { echo -e "${RED}  [XX] $1${NC}"; ERRORS=$((ERRORS+1)); }

if [ ! -f "$FILE" ]; then
    echo -e "${RED}ERROR: No se encontro $FILE${NC}"; exit 1
fi

echo ""
echo "============================================================"
echo "  VALIDACION admin.html - NormaLis"
echo "============================================================"

# 1. Bloques <script> propios - exactamente 2
# Excluye los <script src=...></script> de CDN
OPEN_INLINE=$(grep -cP '^<script>\s*$' "$FILE" || true)
CLOSE_STANDALONE=$(grep -cP '^</script>\s*$' "$FILE" || true)

if [ "$OPEN_INLINE" -eq 2 ] && [ "$CLOSE_STANDALONE" -eq 2 ]; then
    ok "Script blocks: 2 bloques inline propios, correctamente cerrados"
else
    fail "Script blocks: esperados 2/2 inline, encontrados $OPEN_INLINE abiertos / $CLOSE_STANDALONE cerrados"
fi

# 2. Toast div en HTML entre los dos bloques
TOAST_LINE=$(grep -nP 'id="toast"' "$FILE" | head -1 | cut -d: -f1)
SCRIPT1_END=$(grep -nP '^</script>\s*$' "$FILE" | head -1 | cut -d: -f1)
SCRIPT2_START=$(grep -nP '^<script>\s*$' "$FILE" | tail -1 | cut -d: -f1)

if [ -z "$TOAST_LINE" ]; then
    fail "Toast div: no encontrado - falta div id=toast"
elif [ -n "$SCRIPT1_END" ] && [ -n "$SCRIPT2_START" ]; then
    if [ "$TOAST_LINE" -gt "$SCRIPT1_END" ] && [ "$TOAST_LINE" -lt "$SCRIPT2_START" ]; then
        ok "Toast div: posicion correcta entre bloques script (linea $TOAST_LINE)"
    else
        fail "Toast div: fuera del HTML entre scripts (linea $TOAST_LINE, script1 cierra $SCRIPT1_END, script2 abre $SCRIPT2_START)"
    fi
else
    warn "Toast div encontrado (linea $TOAST_LINE) pero no se pudo verificar posicion"
fi

# 3. crearIPS: rol piloto, no admin_ips
if grep -qP "rol:\s*['\"]admin_ips['\"]" "$FILE"; then
    fail "crearIPS: usa rol admin_ips - login.html no lo maneja, usuario quedara bloqueado"
else
    ok "crearIPS: no usa rol admin_ips"
fi

if grep -qP "rol:\s*['\"]piloto['\"]" "$FILE"; then
    ok "crearIPS: rol piloto presente"
else
    warn "crearIPS: no se encontro rol piloto - verificar asignacion en crearIPS"
fi

# 4. Sin Firebase Custom Claims
if grep -qP 'token\.claims' "$FILE"; then
    fail "Custom Claims: token.claims encontrado - siempre falla, usar Firestore rol check"
else
    ok "Custom Claims: sin referencias a token.claims"
fi

# 5. onAuthStateChanged - exactamente 1 llamada real (excluye comentarios)
COUNT=$(grep -P 'onAuthStateChanged' "$FILE" | grep -v '^\s*//' | grep -v '// ' | wc -l)
if [ "$COUNT" -eq 1 ]; then
    ok "onAuthStateChanged: exactamente 1 listener activo"
elif [ "$COUNT" -eq 0 ]; then
    fail "onAuthStateChanged: no encontrado - auth guard no funciona"
else
    fail "onAuthStateChanged: $COUNT llamadas activas (debe ser 1)"
fi

# 6. initApp - definida exactamente 1 vez
COUNT=$(grep -cP 'function initApp\s*\(' "$FILE" || true)
if [ "$COUNT" -eq 1 ]; then
    ok "initApp: definida exactamente 1 vez"
elif [ "$COUNT" -eq 0 ]; then
    fail "initApp: no encontrada - el panel admin no inicializa"
else
    fail "initApp: definida $COUNT veces (debe ser 1)"
fi

# 7. Funciones criticas presentes
for FN in doLogin crearIPS cargarSolicitudes cargarLeads showToast escucharProspectos cargarPilotos cargarAnalytics; do
    if grep -qP "function $FN\s*\(" "$FILE"; then
        ok "Funcion $FN: presente"
    else
        fail "Funcion $FN: NO encontrada"
    fi
done

# 8. Cierre correcto del archivo (ultimas 10 lineas)
TAIL=$(tail -10 "$FILE")
if echo "$TAIL" | grep -q '</body>' && echo "$TAIL" | grep -q '</html>'; then
    ok "Cierre del archivo: /body y /html presentes"
else
    fail "Cierre del archivo: falta /body o /html - archivo puede estar truncado"
fi

# 9. campo nombre en crearIPS = IPS name (no persona)
if grep -qP '^\s+nombre:\s*datos\.nombre_responsable' "$FILE"; then
    fail "crearIPS campo nombre: usa datos.nombre_responsable (persona) - debe ser datos.nombre (IPS)"
else
    ok "crearIPS campo nombre: correcto (no usa datos.nombre_responsable)"
fi

# RESULTADO FINAL
echo ""
echo "============================================================"
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GRN}  RESULTADO: LISTO PARA COMMIT${NC}"
elif [ "$ERRORS" -eq 0 ]; then
    echo -e "${YEL}  RESULTADO: LISTO (con $WARNINGS advertencia(s))${NC}"
else
    echo -e "${RED}  RESULTADO: NO COMMITEAR - $ERRORS error(es) critico(s)${NC}"
fi
echo "============================================================"
echo ""

exit $ERRORS
