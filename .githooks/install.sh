#!/usr/bin/env bash
# Instalar hooks de NormaLis (correr una sola vez por clon del repo)
# Uso: bash .githooks/install.sh

git config core.hooksPath .githooks
echo "[OK] Hooks instalados. Cada commit validara automaticamente los archivos modificados."
echo "     Para forzar validacion completa en un commit: NORMALIS_FULL_CHECK=1 git commit -m 'mensaje'"
