#!/usr/bin/env bash
# normalis-validate.sh — Validador de integridad NormaLis (arquitectura Next.js)
# Arquitectura actual: Next.js 15 + Firebase v11 + Vercel — sin archivos HTML/JS legacy
# Exit 0 = OK | Exit 1 = errores críticos
# Uso: bash normalis-validate.sh [--verbose]

set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB="$REPO/web"
VERBOSE="${1:-}"
ERRORS=0
WARNINGS=0

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
BLU='\033[0;34m'
NC='\033[0m'

pass()   { echo -e "${GRN}✔${NC} $1"; }
fail()   { echo -e "${RED}✘ CRITICAL: $1${NC}"; ((ERRORS++)) || true; }
warn()   { echo -e "${YLW}⚠ WARNING:  $1${NC}"; ((WARNINGS++)) || true; }
info()   { [[ "$VERBOSE" == "--verbose" ]] && echo -e "${BLU}ℹ${NC} $1" || true; }
section(){ echo -e "\n${BLU}━━━ $1 ━━━${NC}"; }

echo ""
echo "============================================================"
echo "  NormaLis — Validación pre-commit (Next.js)"
echo "============================================================"

# ─────────────────────────────────────────────
section "1. Archivos críticos del proyecto Next.js"
# ─────────────────────────────────────────────
NEXTJS_FILES=(
  "web/package.json"
  "web/next.config.ts"
  "web/tailwind.config.ts"
  "web/tsconfig.json"
  "web/lib/firebase.ts"
  "web/app/layout.tsx"
  "web/app/page.tsx"
  "web/app/login/page.tsx"
  "web/app/registro/page.tsx"
  "web/app/dashboard/page.tsx"
  "web/app/admin/page.tsx"
  "web/app/success/page.tsx"
  "web/app/demo/page.tsx"
  "web/app/demo/DemoPlayer.tsx"
  "firestore.rules"
)

for f in "${NEXTJS_FILES[@]}"; do
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
section "2. Archivos HTML legacy — NO deben existir en raíz"
# ─────────────────────────────────────────────
LEGACY_FILES=(
  "index.html"
  "login.html"
  "registro.html"
  "admin.html"
  "normativa-app-v2.html"
  "success.html"
  "normalis-main.js"
  "normalis-styles.css"
)

for f in "${LEGACY_FILES[@]}"; do
  path="$REPO/$f"
  if [[ -f "$path" ]]; then
    fail "Archivo legacy presente en raíz: $f — debe eliminarse (ya migrado a Next.js)"
  else
    pass "$f no existe en raíz (correcto)"
  fi
done

# ─────────────────────────────────────────────
section "3. /web/public/ — sin HTML de la app"
# ─────────────────────────────────────────────
PUBLIC_HTML_FILES=(
  "web/public/normativa-app-v2.html"
  "web/public/normalis-demo-video.html"
  "web/public/pricing.html"
  "web/public/success.html"
)

for f in "${PUBLIC_HTML_FILES[@]}"; do
  path="$REPO/$f"
  if [[ -f "$path" ]]; then
    fail "HTML de app en /web/public/: $f — debe eliminarse o migrar a Next.js"
  else
    pass "$f no está en /web/public/ (correcto)"
  fi
done

# ─────────────────────────────────────────────
section "4. Firebase config — consistencia"
# ─────────────────────────────────────────────
FIREBASE_LIB="$REPO/web/lib/firebase.ts"
EXPECTED_PROJECT="normalis-5587d"
EXPECTED_KEY="AIzaSyArUb9rzv6lHeunq_bPgbbe0vmekysx5R4"

if [[ -f "$FIREBASE_LIB" ]]; then
  # firebase.ts usa variables de entorno NEXT_PUBLIC_* — verificar que las referencias existen
  if grep -q 'NEXT_PUBLIC_FIREBASE_PROJECT_ID\|'"$EXPECTED_PROJECT" "$FIREBASE_LIB"; then
    pass "firebase.ts: projectId o variable de entorno presente"
  else
    fail "firebase.ts: projectId faltante"
  fi

  if grep -q 'NEXT_PUBLIC_FIREBASE_API_KEY\|'"$EXPECTED_KEY" "$FIREBASE_LIB"; then
    pass "firebase.ts: apiKey o variable de entorno presente"
  else
    fail "firebase.ts: apiKey faltante"
  fi

  # Debe exportar auth y db
  if grep -q 'export.*auth\|export const auth' "$FIREBASE_LIB"; then
    pass "firebase.ts: exporta auth"
  else
    fail "firebase.ts: no exporta auth"
  fi

  if grep -q 'export.*db\|export const db' "$FIREBASE_LIB"; then
    pass "firebase.ts: exporta db (Firestore)"
  else
    fail "firebase.ts: no exporta db"
  fi
fi

# ─────────────────────────────────────────────
section "5. next.config.ts — redirects HTML legacy"
# ─────────────────────────────────────────────
NEXT_CFG="$REPO/web/next.config.ts"
if [[ -f "$NEXT_CFG" ]]; then
  REQUIRED_REDIRECTS=("login.html" "registro.html" "admin.html" "normativa-app-v2.html" "success.html")
  for r in "${REQUIRED_REDIRECTS[@]}"; do
    if grep -q "$r" "$NEXT_CFG"; then
      pass "next.config.ts: redirect para $r presente"
    else
      warn "next.config.ts: redirect para $r faltante (usuarios con bookmarks recibirán 404)"
    fi
  done
fi

# ─────────────────────────────────────────────
section "6. demo/page.tsx — sin iframe a HTML legacy"
# ─────────────────────────────────────────────
DEMO_PAGE="$REPO/web/app/demo/page.tsx"
if [[ -f "$DEMO_PAGE" ]]; then
  if grep -q 'normalis-demo-video.html' "$DEMO_PAGE"; then
    fail "demo/page.tsx: todavía referencia normalis-demo-video.html via iframe — usar DemoPlayer"
  else
    pass "demo/page.tsx: sin referencia a HTML legacy"
  fi

  if grep -q 'DemoPlayer' "$DEMO_PAGE"; then
    pass "demo/page.tsx: importa DemoPlayer (componente React nativo)"
  else
    warn "demo/page.tsx: no importa DemoPlayer — verificar si usa componente React"
  fi
fi

# ─────────────────────────────────────────────
section "7. DemoPlayer.tsx — integridad"
# ─────────────────────────────────────────────
DEMO_PLAYER="$REPO/web/app/demo/DemoPlayer.tsx"
if [[ -f "$DEMO_PLAYER" ]]; then
  sz=$(wc -c < "$DEMO_PLAYER")
  if (( sz < 10000 )); then
    fail "DemoPlayer.tsx demasiado pequeño: ${sz} bytes — posible truncamiento"
  else
    pass "DemoPlayer.tsx tamaño OK (${sz} bytes)"
  fi

  if grep -q 'useEffect' "$DEMO_PLAYER" && grep -q 'useState' "$DEMO_PLAYER"; then
    pass "DemoPlayer.tsx: hooks React presentes"
  else
    fail "DemoPlayer.tsx: hooks React faltantes"
  fi

  if grep -q 'requestAnimationFrame' "$DEMO_PLAYER"; then
    pass "DemoPlayer.tsx: secuenciador rAF presente"
  else
    warn "DemoPlayer.tsx: requestAnimationFrame no encontrado"
  fi
fi

# ─────────────────────────────────────────────
section "8. firestore.rules — colecciones críticas"
# ─────────────────────────────────────────────
RULES="$REPO/firestore.rules"
if [[ -f "$RULES" ]]; then
  REQUIRED_COLLECTIONS=("usuarios" "capas" "vencimientos" "indicadores" "auditorias" "personal" "capacitaciones" "simulacros" "pamec" "leads" "pilotos" "prospectos")
  for col in "${REQUIRED_COLLECTIONS[@]}"; do
    if grep -q "match /${col}" "$RULES"; then
      pass "firestore.rules: colección /$col presente"
    else
      fail "firestore.rules: colección /$col FALTANTE — acceso denegado en producción"
    fi
  done

  # No debe tener token.claims
  if grep -q 'token\.claims' "$RULES"; then
    fail "firestore.rules: contiene token.claims — no se usan Custom Claims en NormaLis"
  else
    pass "firestore.rules: sin token.claims"
  fi

  # Debe tener regla de denegación al final
  if grep -q 'allow read, write: if false' "$RULES"; then
    pass "firestore.rules: regla de denegación catch-all presente"
  else
    warn "firestore.rules: no se encontró regla de denegación catch-all — verificar"
  fi
fi

# ─────────────────────────────────────────────
section "9. success/page.tsx — sin links rotos"
# ─────────────────────────────────────────────
SUCCESS_PAGE="$REPO/web/app/success/page.tsx"
if [[ -f "$SUCCESS_PAGE" ]]; then
  if grep -q 'normativa-app-v2.html' "$SUCCESS_PAGE"; then
    fail "success/page.tsx: link roto a normativa-app-v2.html — usar /dashboard"
  else
    pass "success/page.tsx: sin links a HTML legacy"
  fi

  if grep -q 'href="/dashboard"' "$SUCCESS_PAGE"; then
    pass "success/page.tsx: link a /dashboard correcto"
  else
    warn "success/page.tsx: no se encontró link a /dashboard — verificar"
  fi
fi

# ─────────────────────────────────────────────
section "10. Archivos de marketing de video — presencia opcional"
# ─────────────────────────────────────────────
VIDEO_FILES=("web/public/normalis-video.html" "web/public/normalis-video-60s.html" "web/public/normalis-video-90s.html")
for f in "${VIDEO_FILES[@]}"; do
  path="$REPO/$f"
  if [[ -f "$path" ]]; then
    info "$f presente (herramienta de marketing — OK si es intencional)"
    pass "$f: presente (video marketing)"
  else
    info "$f no existe (puede haberse eliminado)"
  fi
done

# ─────────────────────────────────────────────
echo ""
echo -e "${BLU}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
  echo -e "${GRN}✔ VALIDACIÓN COMPLETA — 0 errores, 0 advertencias${NC}"
  echo -e "${GRN}  NormaLis Next.js está íntegro. Seguro para commit/deploy.${NC}"
  exit 0
elif [[ $ERRORS -eq 0 ]]; then
  echo -e "${YLW}⚠ VALIDACIÓN CON ADVERTENCIAS — 0 errores críticos, $WARNINGS advertencias${NC}"
  echo -e "${YLW}  Seguro para commit, pero revisar advertencias.${NC}"
  exit 0
else
  echo -e "${RED}✘ VALIDACIÓN FALLIDA — $ERRORS errores críticos, $WARNINGS advertencias${NC}"
  echo -e "${RED}  Corregir errores críticos antes de hacer commit.${NC}"
  exit 1
fi
