#!/usr/bin/env bash
# normalis-repair.sh — Orquestador validate → repair → re-validate
# ================================================================
# Uso:
#   bash normalis-repair.sh           # modo normal
#   bash normalis-repair.sh --check   # solo reporta, sin modificar
#   bash normalis-repair.sh --verbose # detalles de cada check
#
# Flujo:
#   1. Corre normalis-validate.sh
#   2. Si falla → ejecuta normalis-repair.py
#   3. Re-corre normalis-validate.sh
#   4. Si aún falla → exit 1 (requiere intervención manual)
#   5. Si pasa → exit 0

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATOR="$SCRIPT_DIR/normalis-validate.sh"
REPAIR_PY="$SCRIPT_DIR/normalis-repair.py"

CHECK_ONLY=false
VERBOSE=false
for arg in "$@"; do
  [[ "$arg" == "--check"   ]] && CHECK_ONLY=true
  [[ "$arg" == "--verbose" ]] && VERBOSE=true
done

# ── Colores ──────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━ NormaLis Auto-Repair ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── PASO 1: Validación inicial ────────────────────────────────────
echo -e "\n${CYAN}[1/3] Validación inicial...${NC}"
if bash "$VALIDATOR" "$@" > /tmp/normalis_validate_out.txt 2>&1; then
  echo -e "${GREEN}✔ Codebase íntegro — ninguna reparación necesaria.${NC}"
  exit 0
fi

# Mostrar errores encontrados
echo -e "${YELLOW}⚠ Se detectaron problemas:${NC}"
grep -E '(✗|❌|ERROR|WARN)' /tmp/normalis_validate_out.txt || true

if $CHECK_ONLY; then
  echo -e "\n${YELLOW}[MODO CHECK] No se aplican reparaciones.${NC}"
  exit 1
fi

# ── PASO 2: Reparación ───────────────────────────────────────────
echo -e "\n${CYAN}[2/3] Ejecutando reparaciones automáticas...${NC}"
if $VERBOSE; then
  python3 "$REPAIR_PY" --verbose
else
  python3 "$REPAIR_PY"
fi
REPAIR_EXIT=$?

if [ $REPAIR_EXIT -ne 0 ]; then
  echo -e "${RED}✗ normalis-repair.py terminó con error $REPAIR_EXIT${NC}"
  exit 1
fi

# ── PASO 3: Re-validación ─────────────────────────────────────────
echo -e "\n${CYAN}[3/3] Re-validando tras reparación...${NC}"
if bash "$VALIDATOR"; then
  echo -e "\n${GREEN}✔ REPARACIÓN EXITOSA — codebase en estado íntegro.${NC}"
  echo -e "${GREEN}  Puedes hacer commit de los cambios reparados.${NC}"
  exit 0
else
  echo -e "\n${RED}✗ La re-validación falló. Requiere intervención manual.${NC}"
  echo -e "${RED}  Revisa los errores arriba y corrige manualmente.${NC}"
  exit 1
fi
