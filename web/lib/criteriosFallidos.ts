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

/**
 * Misma idea que textoCriteriosFallidos, pero para el módulo de Auditoría
 * (auditoria/page.tsx y auditoria/[segmento]/page.tsx), donde las
 * no-conformidades ya vienen resueltas como { question, answer } en vez de
 * un mapa de respuestas por id — no hay necesidad de filtrar, ya están
 * filtradas por getNonConformities().
 */
export function textoNoConformidadesAuditoria(
  items: { question: string; answer: 'no' | 'parcial' }[],
): string {
  if (items.length === 0) {
    return 'Revisar y documentar la evidencia de los criterios evaluados.';
  }
  return items
    .map(i => `${i.answer === 'no' ? '✗ No cumple' : '△ Parcial'} — ${i.question}`)
    .join('\n');
}
