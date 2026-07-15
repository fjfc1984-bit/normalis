#!/usr/bin/env bash
# normalis-validate.sh — Master integrity validator for NormaLis
# Exit 0 = all checks passed | Exit 1 = critical failures found
# Usage: bash normalis-validate.sh [--verbose]

set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERBOSE="${1:-}"
ERRORS=0
WARNINGS=0

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
BLU='\033[0;34m'
NC='\033[0m'

pass()  { echo -e "${GRN}✔${NC} $1"; }
fail()  { echo -e "${RED}✘ CRITICAL: $1${NC}"; ((ERRORS++)) || true; }
warn()  { echo -e "${YLW}⚠ WARNING:  $1${NC}"; ((WARNINGS++)) || true; }
info()  { [[ "$VERBOSE" == "--verbose" ]] && echo -e "${BLU}ℹ${NC} $1" || true; }
section(){ echo -e "\n${BLU}━━━ $1 ━━━${NC}"; }

# ─────────────────────────────────────────────
section "1. Existencia de archivos críticos"
# ─────────────────────────────────────────────
CRITICAL_FILES=(
  "normativa-app-v2.html"
  "normalis-chat.js"
  "normalis-data-audit.js"
  "normalis-audit-score.js"
  "normalis-docs.js"
  "normalis-pdf.js"
  "normalis-pqrs.js"
  "normalis-incidentes.js"
  "normalis-vencimientos.js"
  "normalis-simulacro.js"
  "normalis-bitacora.js"
  "normalis-firestore.js"
  "normalis-styles.css"
  "admin.html"
  "login.html"
  "registro.html"
  "index.html"
  "normalis-pilot.js"
  "normalis-tour.js"
  "normalis-utils.js"
  "normalis-auth.js"
  "normalis-pamec.js"
  "normalis-export.js"
  "normalis-users.js"
  "normalis-automations.js"
)

for f in "${CRITICAL_FILES[@]}"; do
  path="$REPO/$f"
  if [[ ! -f "$path" ]]; then
    fail "Archivo faltante: $f"
  elif [[ ! -s "$path" ]]; then
    fail "Archivo vacío: $f"
  else
    sz=$(wc -c < "$path")
    info "$f → ${sz} bytes"
    pass "$f existe (${sz} bytes)"
  fi
done

# ─────────────────────────────────────────────
section "2. Tamaño mínimo de archivos JS/CSS"
# ─────────────────────────────────────────────
declare -A MIN_SIZES=(
  ["normalis-chat.js"]=5000
  ["normalis-data-audit.js"]=50000
  ["normalis-audit-score.js"]=3000
  ["normalis-docs.js"]=15000
  ["normalis-pdf.js"]=3000
  ["normalis-pqrs.js"]=2000
  ["normalis-incidentes.js"]=2000
  ["normalis-vencimientos.js"]=2000
  ["normalis-simulacro.js"]=3000
  ["normalis-bitacora.js"]=5000
  ["normalis-firestore.js"]=10000
  ["normalis-tour.js"]=3000
  ["normalis-utils.js"]=500
  ["normalis-auth.js"]=1000
  ["normalis-pamec.js"]=5000
  ["normalis-export.js"]=2000
  ["normalis-users.js"]=500
  ["normalis-automations.js"]=3000
  ["normalis-styles.css"]=30000
  ["normativa-app-v2.html"]=400000
)

for f in "${!MIN_SIZES[@]}"; do
  path="$REPO/$f"
  if [[ -f "$path" ]]; then
    sz=$(wc -c < "$path")
    min="${MIN_SIZES[$f]}"
    if (( sz < min )); then
      fail "$f demasiado pequeño: ${sz} bytes (mínimo ${min}) — posible truncamiento"
    else
      pass "$f tamaño OK (${sz} bytes ≥ ${min})"
    fi
  fi
done

# ─────────────────────────────────────────────
section "3. Sellos de integridad (integrity seals)"
# ─────────────────────────────────────────────
declare -A SEALS=(
  ["normalis-chat.js"]="END:normalis-chat.js"
  ["normalis-data-audit.js"]="END:normalis-data-audit.js"
  ["normalis-audit-score.js"]="END:normalis-audit-score.js"
  ["normalis-docs.js"]="END:normalis-docs.js"
  ["normalis-pdf.js"]="END:normalis-pdf.js"
  ["normalis-pqrs.js"]="END:normalis-pqrs.js"
  ["normalis-incidentes.js"]="END:normalis-incidentes.js"
  ["normalis-vencimientos.js"]="END:normalis-vencimientos.js"
  ["normalis-simulacro.js"]="END:normalis-simulacro.js"
  ["normalis-bitacora.js"]="END:normalis-bitacora.js"
  ["normalis-firestore.js"]="END:normalis-firestore.js"
  ["normalis-tour.js"]="END:normalis-tour.js"
  ["normalis-utils.js"]="END:normalis-utils.js"
  ["normalis-auth.js"]="END:normalis-auth.js"
  ["normalis-pamec.js"]="END:normalis-pamec.js"
  ["normalis-export.js"]="END:normalis-export.js"
  ["normalis-users.js"]="END:normalis-users.js"
  ["normalis-automations.js"]="END:normalis-automations.js"
  ["normalis-styles.css"]="END:normalis-styles.css"
)

for f in "${!SEALS[@]}"; do
  path="$REPO/$f"
  seal="${SEALS[$f]}"
  if [[ -f "$path" ]]; then
    if grep -q "$seal" "$path"; then
      pass "$f sello de integridad presente"
    else
      fail "$f sin sello de integridad — archivo posiblemente truncado"
    fi
  fi
done

# ─────────────────────────────────────────────
section "4. normativa-app-v2.html — estructura HTML"
# ─────────────────────────────────────────────
APP="$REPO/normativa-app-v2.html"
if [[ -f "$APP" ]]; then
  # File must end with </html>
  if tail -5 "$APP" | grep -q '</html>'; then
    pass "normativa-app-v2.html cierra con </html>"
  else
    fail "normativa-app-v2.html NO termina con </html> — truncamiento activo"
  fi

  if tail -5 "$APP" | grep -q '</body>'; then
    pass "normativa-app-v2.html cierra con </body>"
  else
    fail "normativa-app-v2.html NO termina con </body>"
  fi

  # Script tag balance
  OPEN=$(grep -c '<script' "$APP" || true)
  CLOSE=$(grep -c '</script>' "$APP" || true)
  if [[ "$OPEN" -eq "$CLOSE" ]]; then
    pass "normativa-app-v2.html: <script> balanceados ($OPEN apertura = $CLOSE cierre)"
  else
    fail "normativa-app-v2.html: <script> DESBALANCEADOS ($OPEN apertura ≠ $CLOSE cierre)"
  fi

  # Must reference all 12 module scripts
  MODULES=(
    "normalis-data-audit.js"
    "normalis-chat.js"
    "normalis-audit-score.js"
    "normalis-docs.js"
    "normalis-pdf.js"
    "normalis-pqrs.js"
    "normalis-incidentes.js"
    "normalis-vencimientos.js"
    "normalis-simulacro.js"
    "normalis-bitacora.js"
    "normalis-firestore.js"
    "normalis-tour.js"
    "normalis-styles.css"
  )
  for mod in "${MODULES[@]}"; do
    if grep -q "src=\"$mod\"\|href=\"$mod\"" "$APP"; then
      pass "normativa-app-v2.html referencia $mod"
    else
      fail "normativa-app-v2.html NO referencia $mod"
    fi
  done
fi

# ─────────────────────────────────────────────
section "5. Funciones críticas en módulos JS"
# ─────────────────────────────────────────────
declare -A CRITICAL_FUNCTIONS=(
  # chat
  ["getAnswer"]="normalis-chat.js"
  ["normAnswers"]="normalis-chat.js"
  # audit data
  ["areasDB"]="normalis-data-audit.js"
  ["renderAreaCards"]="normalis-data-audit.js"
  ["renderAuditQ"]="normalis-data-audit.js"
  ["setAns"]="normalis-data-audit.js"
  # audit score
  ["calcAuditScore"]="normalis-audit-score.js"
  ["showResults"]="normalis-audit-score.js"
  ["logAuditCompleted"]="normalis-audit-score.js"
  # docs
  ["openDocViewer"]="normalis-docs.js"
  ["openDocPreview"]="normalis-docs.js"
  # pdf
  ["printAuditReport"]="normalis-pdf.js"
  # pqrs
  ["savePQRS"]="normalis-pqrs.js"
  ["renderPQRS"]="normalis-pqrs.js"
  # incidentes
  ["saveIncidente"]="normalis-incidentes.js"
  ["renderIncidentes"]="normalis-incidentes.js"
  # vencimientos
  ["saveVenc"]="normalis-vencimientos.js"
  ["renderVencimientos"]="normalis-vencimientos.js"
  # simulacro
  ["renderSimulacro"]="normalis-simulacro.js"
  ["toggleSimItem"]="normalis-simulacro.js"
  # bitacora
  ["logAction"]="normalis-bitacora.js"
  ["renderBitacora"]="normalis-bitacora.js"
  # firestore
  ["buildUserContext"]="normalis-firestore.js"
  ["mostrarOnboarding"]="normalis-firestore.js"
  ["renderROI"]="normalis-firestore.js"
  ["xaiResponder"]="normalis-firestore.js"
  # tour
  ["startNormalisTour"]="normalis-tour.js"
)

for fn in "${!CRITICAL_FUNCTIONS[@]}"; do
  file="${CRITICAL_FUNCTIONS[$fn]}"
  path="$REPO/$file"
  if [[ -f "$path" ]]; then
    if grep -q "$fn" "$path"; then
      pass "$file contiene $fn()"
    else
      fail "$file NO contiene $fn() — función crítica faltante"
    fi
  fi
done

# ─────────────────────────────────────────────
section "6. admin.html — 9 reglas de integridad"
# ─────────────────────────────────────────────
ADMIN="$REPO/admin.html"
if [[ -f "$ADMIN" ]]; then

  # Rule 1: Exactly 2 inline script blocks
  INLINE_SCRIPTS=$(grep -c '^<script>' "$ADMIN" || true)
  # also count <script> not followed by src=
  INLINE_SCRIPTS2=$(grep -c '<script>' "$ADMIN" || true)
  if [[ "$INLINE_SCRIPTS2" -eq 2 ]]; then
    pass "admin.html: exactamente 2 bloques <script> inline"
  else
    warn "admin.html: $INLINE_SCRIPTS2 bloques <script> inline (esperados: 2)"
  fi

  # Rule 2: Toast div in HTML (not inside script)
  if grep -q 'id="toast"' "$ADMIN"; then
    pass "admin.html: toast div presente"
  else
    fail "admin.html: toast div FALTANTE"
  fi

  # Rule 3: crearIPS uses rol: 'piloto' (allow multiple spaces between : and value)
  if grep -qE "rol:[[:space:]]+'piloto'" "$ADMIN"; then
    pass "admin.html: crearIPS usa rol: 'piloto'"
  else
    fail "admin.html: crearIPS NO usa rol: 'piloto' — verificar manualmente"
  fi

  # Rule 4: No token.claims
  if grep -q 'token\.claims' "$ADMIN"; then
    fail "admin.html: contiene token.claims — Custom Claims prohibidos"
  else
    pass "admin.html: sin referencias a token.claims"
  fi

  # Rule 5: Exactly 1 active onAuthStateChanged listener (not counting comment lines)
  AUTH_COUNT=$(grep -v '^\s*//' "$ADMIN" | grep -c 'onAuthStateChanged' || true)
  if [[ "$AUTH_COUNT" -eq 1 ]]; then
    pass "admin.html: exactamente 1 onAuthStateChanged (activo)"
  else
    fail "admin.html: $AUTH_COUNT listeners de onAuthStateChanged fuera de comentarios (debe ser 1)"
  fi

  # Rule 6: initApp defined exactly once
  INITAPP_COUNT=$(grep -c 'function initApp' "$ADMIN" || true)
  if [[ "$INITAPP_COUNT" -eq 1 ]]; then
    pass "admin.html: initApp() definida exactamente 1 vez"
  else
    fail "admin.html: initApp() definida $INITAPP_COUNT veces (debe ser 1)"
  fi

  # Rule 7: 8 critical functions present
  ADMIN_FUNCTIONS=("doLogin" "crearIPS" "cargarSolicitudes" "cargarLeads" "showToast" "escucharProspectos" "cargarPilotos" "cargarAnalytics")
  for fn in "${ADMIN_FUNCTIONS[@]}"; do
    if grep -q "function $fn\|$fn = function" "$ADMIN"; then
      pass "admin.html: $fn() presente"
    else
      fail "admin.html: $fn() FALTANTE — función crítica"
    fi
  done

  # Rule 8: File ends with </body> and </html>
  if tail -3 "$ADMIN" | grep -q '</html>'; then
    pass "admin.html: cierra con </html>"
  else
    fail "admin.html: NO termina con </html> — truncamiento detectado"
  fi

  # Rule 9: crearIPS uses datos.nombre for IPS name
  if grep -q 'datos\.nombre' "$ADMIN"; then
    pass "admin.html: crearIPS usa datos.nombre (nombre de IPS)"
  else
    warn "admin.html: no se encontró datos.nombre en crearIPS — verificar manualmente"
  fi
fi

# ─────────────────────────────────────────────
section "7. Consistencia de Firebase config"
# ─────────────────────────────────────────────
FIREBASE_PROJECT="normalis-5587d"
FILES_WITH_FIREBASE=("normativa-app-v2.html" "admin.html" "login.html" "registro.html" "index.html")

for f in "${FILES_WITH_FIREBASE[@]}"; do
  path="$REPO/$f"
  if [[ -f "$path" ]]; then
    if grep -q 'firebase' "$path"; then
      if grep -q "$FIREBASE_PROJECT" "$path"; then
        pass "$f: Firebase project ID correcto ($FIREBASE_PROJECT)"
      else
        # might not initialize firebase directly
        info "$f: no contiene Firebase project ID (puede ser normal)"
      fi
    else
      info "$f: no usa Firebase"
    fi
  fi
done

# Verify apiKey is consistent
EXPECTED_KEY="AIzaSyArUb9rzv6lHeunq_bPgbbe0vmekysx5R4"
for f in "${FILES_WITH_FIREBASE[@]}"; do
  path="$REPO/$f"
  if [[ -f "$path" ]] && grep -q 'apiKey' "$path"; then
    if grep -q "$EXPECTED_KEY" "$path"; then
      pass "$f: Firebase apiKey correcto"
    else
      fail "$f: Firebase apiKey DIFERENTE — posible config incorrecta"
    fi
  fi
done

# ─────────────────────────────────────────────
section "8. login.html — funciones críticas"
# ─────────────────────────────────────────────
LOGIN="$REPO/login.html"
if [[ -f "$LOGIN" ]]; then
  LOGIN_FUNCTIONS=("prefillAppData" "normalis_onboarding_done" "normalis_cfg")
  for fn in "${LOGIN_FUNCTIONS[@]}"; do
    if grep -q "$fn" "$LOGIN"; then
      pass "login.html: $fn presente"
    else
      fail "login.html: $fn FALTANTE"
    fi
  done

  # Routing: clientes y pilotos van a normativa-app-v2.html
  if grep -q 'normativa-app-v2.html' "$LOGIN"; then
    pass "login.html: routing a normativa-app-v2.html presente"
  else
    fail "login.html: NO redirige a normativa-app-v2.html"
  fi

  # No custom claims
  if grep -q 'token\.claims' "$LOGIN"; then
    fail "login.html: contiene token.claims — prohibido"
  else
    pass "login.html: sin token.claims"
  fi
fi

# ─────────────────────────────────────────────
section "9. Módulos JS — sin etiquetas <script> duplicadas"
# ─────────────────────────────────────────────
APP="$REPO/normativa-app-v2.html"
if [[ -f "$APP" ]]; then
  # Check only actual <script src="..."> tags, not comments
  MODULES_TO_CHECK=("normalis-data-audit.js" "normalis-chat.js" "normalis-audit-score.js"
    "normalis-docs.js" "normalis-pdf.js" "normalis-pqrs.js" "normalis-incidentes.js"
    "normalis-vencimientos.js" "normalis-simulacro.js" "normalis-bitacora.js" "normalis-firestore.js" "normalis-tour.js"
  "normalis-utils.js" "normalis-auth.js" "normalis-pamec.js" "normalis-export.js" "normalis-users.js" "normalis-automations.js")
  for mod in "${MODULES_TO_CHECK[@]}"; do
    TAG_COUNT=$(grep -c "<script src=\"$mod\"" "$APP" || true)
    if [[ "$TAG_COUNT" -gt 1 ]]; then
      fail "normativa-app-v2.html: <script src=\"$mod\"> duplicado ($TAG_COUNT veces)"
    elif [[ "$TAG_COUNT" -eq 1 ]]; then
      pass "normativa-app-v2.html: $mod sin duplicados"
    fi
  done
fi

# ─────────────────────────────────────────────
section "10. registro.html — rol pendiente"
# ─────────────────────────────────────────────
REG="$REPO/registro.html"
if [[ -f "$REG" ]]; then
  if grep -q "rol.*pendiente\|pendiente.*rol" "$REG"; then    pass "registro.html: asigna rol 'pendiente' en registro"
  else
    fail "registro.html: NO asigna rol 'pendiente' — flujo de aprobación roto"
  fi
fi

# ─────────────────────────────────────────────
echo ""
echo -e "${BLU}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [[ $ERRORS -eq 0 ]]; then
  echo -e "${GRN}✔ VALIDACIÓN COMPLETA — $ERRORS errores críticos, $WARNINGS advertencias${NC}"
  echo -e "${GRN}  NormaLis está en estado íntegro. Seguro para commit/deploy.${NC}"
  exit 0
else  echo -e "${RED}✘ VALIDACIÓN FALLIDA — $ERRORS errores críticos, $WARNINGS advertencias${NC}"
  echo -e "${RED}  Corregir errores críticos antes de hacer commit.${NC}"
  exit 1
fi


