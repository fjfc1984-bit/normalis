// web/lib/criteriosFallidos.ts
// Utilidad compartida: arma el texto de acción correctiva de una CAPA a
// partir de los criterios del checklist que quedaron en "no cumple" o
// "parcial" — citando cuáles, no una instrucción genérica de "corregir lo
// que no cumple" sin decir qué. La usan las CAPA automáticas de
// Infraestructura, Medicamentos (verificación), Historia Clínica e
// Interdependencia (verificación).

export function textoCriteriosFallidos(
  criterios: { id: string; texto: string }[],
  respuestas: Record<string, string>,
): string {
  const fallidos = criterios.filter(c => respuestas[c.id] === 'no' || respuestas[c.id] === 'parcial');
  if (fallidos.length === 0) {
    return 'Revisar y documentar la evidencia de los criterios evaluados.';
  }
  return fallidos
    .map(c => `${respuestas[c.id] === 'no' ? '✗ No cumple' : '△ Parcial'} — ${c.texto}`)
    .join('\n');
}
