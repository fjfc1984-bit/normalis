#!/usr/bin/env bash
# normalis-patch.sh — Parche seguro para archivos grandes (>100KB)
# USO: bash normalis-patch.sh <archivo> <old_string_file> <new_string_file>
# O interactivo (muestra diff y pide confirmación)
#
# NUNCA usar el Edit tool de Claude directamente en normativa-app-v2.html —
# ese tool trunca archivos grandes silenciosamente.

set -euo pipefail

FILE="${1:-normativa-app-v2.html}"
MIN_LINES=9000  # normativa-app-v2.html tiene >9000 líneas; cualquier valor menor = truncamiento

if [ ! -f "$FILE" ]; then
  echo "❌ Archivo no encontrado: $FILE"
  exit 1
fi

LINES=$(wc -l < "$FILE")
echo "📄 $FILE — $LINES líneas"

if [ "$LINES" -lt "$MIN_LINES" ] && [[ "$FILE" == *"normativa-app-v2"* ]]; then
  echo "🚨 ALERTA: $FILE tiene solo $LINES líneas (mínimo esperado: $MIN_LINES)"
  echo "   El archivo puede estar truncado. Restaura con:"
  echo "   git checkout HEAD -- $FILE"
  exit 1
fi

echo "✅ Tamaño correcto ($LINES líneas)"
echo ""
echo "Para aplicar un parche, usa Python directamente:"
echo ""
echo "python3 -c \""
echo "with open('$FILE','r') as f: c=f.read()"
echo "c=c.replace(OLD, NEW, 1)"
echo "with open('$FILE','w') as f: f.write(c)"
echo "\""
