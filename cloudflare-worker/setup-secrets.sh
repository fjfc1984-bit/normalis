#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# NormaLis — setup-secrets.sh
# Configura los 3 secrets del Worker para el cron de vencimientos
# Ejecutar desde la carpeta cloudflare-worker/
# ─────────────────────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     NormaLis — Configuración de Secrets del Worker   ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Verificar que wrangler está disponible ───────────────────
if ! command -v wrangler &> /dev/null && ! npx wrangler --version &> /dev/null 2>&1; then
  echo -e "${RED}✖ wrangler no encontrado.${NC}"
  echo "  Instálalo con:  npm install -g wrangler"
  echo "  Luego vuelve a ejecutar este script."
  exit 1
fi

WRANGLER="npx wrangler"

echo -e "${YELLOW}PASO 1 de 4 — Verificar login en Cloudflare${NC}"
echo "────────────────────────────────────────────"
echo "Si no estás autenticado, se abrirá el navegador ahora."
echo ""
$WRANGLER whoami || $WRANGLER login
echo ""

echo -e "${YELLOW}PASO 2 de 4 — Firebase API Key (clave pública del proyecto)${NC}"
echo "────────────────────────────────────────────"
echo "Este valor ya está en el código fuente — no es secreto real,"
echo "pero Cloudflare lo necesita como secret para el Worker."
echo ""
echo "AIzaSyArUb9rzv6lHeunq_bPgbbe0vmekysx5R4" | $WRANGLER secret put FIREBASE_API_KEY
echo -e "${GREEN}✔ FIREBASE_API_KEY configurado${NC}"
echo ""

echo -e "${YELLOW}PASO 3 de 4 — Email del usuario cron${NC}"
echo "────────────────────────────────────────────"
echo "Antes de continuar, asegúrate de haber creado el usuario"
echo "cron@normalis.co en Firebase Console:"
echo ""
echo "  https://console.firebase.google.com/project/normalis-5587d/authentication/users"
echo "  → Agregar usuario → Email: cron@normalis.co → Contraseña: (larga, anótala)"
echo ""
read -p "¿Ya creaste el usuario cron@normalis.co en Firebase? (s/n): " confirm
if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
  echo ""
  echo -e "${YELLOW}Pausa aquí. Crea el usuario en Firebase y vuelve a ejecutar este script.${NC}"
  exit 0
fi
echo ""
echo "cron@normalis.co" | $WRANGLER secret put CRON_EMAIL
echo -e "${GREEN}✔ CRON_EMAIL configurado${NC}"
echo ""

echo -e "${YELLOW}PASO 4 de 4 — Contraseña del usuario cron${NC}"
echo "────────────────────────────────────────────"
echo "Ingresa la contraseña que usaste al crear cron@normalis.co en Firebase."
echo "(No se mostrará en pantalla mientras escribes)"
echo ""
read -s -p "Contraseña de cron@normalis.co: " CRON_PASS
echo ""
if [[ -z "$CRON_PASS" ]]; then
  echo -e "${RED}✖ Contraseña vacía — abortando.${NC}"
  exit 1
fi
echo "$CRON_PASS" | $WRANGLER secret put CRON_PASSWORD
unset CRON_PASS
echo -e "${GREEN}✔ CRON_PASSWORD configurado${NC}"
echo ""

echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ✔ Los 3 secrets están configurados en Cloudflare    ║${NC}"
echo -e "${CYAN}║                                                      ║${NC}"
echo -e "${CYAN}║  El cron corre cada día a las 8am hora Colombia.     ║${NC}"
echo -e "${CYAN}║  Para verificar el Worker:                           ║${NC}"
echo -e "${CYAN}║    npx wrangler tail                                 ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
