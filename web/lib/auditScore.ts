// web/lib/auditScore.ts
// Lógica de scoring para auditorías de habilitación
// Portado desde normalis-audit-score.js

import type {
  AuditArea,
  AuditAnswers,
  AuditScore,
  AuditAreaScore,
  FlatQuestion,
  NonConformity,
} from './auditTypes';
import { preguntaTexto, preguntaPeso, preguntaObligatoria } from './auditTypes';

/**
 * Aplana todas las preguntas de todas las áreas en un array indexado.
 * El índice global (q0, q1, ...) es la clave en AuditAnswers.
 */
export function buildFlatQuestions(areas: AuditArea[]): FlatQuestion[] {
  const flat: FlatQuestion[] = [];
  let idx = 0;
  for (const area of areas) {
    for (let qi = 0; qi < area.q.length; qi++) {
      const q = area.q[qi];
      flat.push({
        globalIdx: idx,
        areaId: area.id,
        areaName: area.name,
        icon: area.icon,
        norm: area.norm,
        question: preguntaTexto(q),
        qInArea: qi,
        peso: preguntaPeso(q),
        obligatorio: preguntaObligatoria(q),
      });
      idx++;
    }
  }
  return flat;
}

/**
 * Calcula el score global del segmento.
 * Fórmula ponderada: ((Σ peso·si + Σ peso·parcial·0.5) / Σ peso efectivo) * 100
 * donde "efectivo" excluye preguntas respondidas 'na'. Con peso=1 en todas
 * las preguntas (el caso de los 21 segmentos aún no revisados) esto da
 * exactamente el mismo resultado que el promedio simple de antes — es una
 * generalización, no un cambio de comportamiento por defecto.
 *
 * obligatorioIncumplido: true si algún criterio marcado `obligatorio`
 * quedó en 'no' o 'parcial' — se usa en scoreLabel() para no dejar que un
 * score alto tape un hallazgo que en una visita real cierra el servicio.
 */
export function calcAuditScore(
  flatQuestions: FlatQuestion[],
  answers: AuditAnswers
): AuditScore {
  const total = flatQuestions.length;
  if (!total) return { score: 0, si: 0, no: 0, parcial: 0, na: 0, total: 0, effective: 0, obligatorioIncumplido: false };

  let si = 0, no = 0, parcial = 0, na = 0;
  let pesoEfectivo = 0, pesoLogrado = 0;
  let obligatorioIncumplido = false;

  for (const fq of flatQuestions) {
    const v = answers[`q${fq.globalIdx}`];
    if (v === 'si') si++;
    else if (v === 'no') no++;
    else if (v === 'parcial') parcial++;
    else if (v === 'na') na++;

    if (v === 'no' || v === 'parcial') {
      if (fq.obligatorio) obligatorioIncumplido = true;
    }

    if (v !== 'na') {
      pesoEfectivo += fq.peso;
      if (v === 'si') pesoLogrado += fq.peso;
      else if (v === 'parcial') pesoLogrado += fq.peso * 0.5;
    }
  }

  const effective = total - na;
  const score = pesoEfectivo > 0 ? Math.round((pesoLogrado / pesoEfectivo) * 100) : 0;
  return { score, si, no, parcial, na, total, effective, obligatorioIncumplido };
}

/**
 * Calcula el score por área individual (misma fórmula ponderada que
 * calcAuditScore, aplicada solo a las preguntas de esa área).
 */
export function calcAreaScores(
  areas: AuditArea[],
  answers: AuditAnswers
): AuditAreaScore[] {
  const scores: AuditAreaScore[] = [];
  let offset = 0;

  for (const area of areas) {
    const qLen = area.q.length;
    let si = 0, no = 0, parcial = 0, na = 0;
    let pesoEfectivo = 0, pesoLogrado = 0;
    let obligatorioIncumplido = false;

    for (let qi = 0; qi < qLen; qi++) {
      const q = area.q[qi];
      const peso = preguntaPeso(q);
      const v = answers[`q${offset + qi}`];
      if (v === 'si') si++;
      else if (v === 'no') no++;
      else if (v === 'parcial') parcial++;
      else if (v === 'na') na++;

      if ((v === 'no' || v === 'parcial') && preguntaObligatoria(q)) obligatorioIncumplido = true;

      // Sin responder cuenta como "efectiva sin crédito" (igual que 'no'),
      // igual que el motor anterior — solo 'na' se excluye del denominador.
      if (v !== 'na') {
        pesoEfectivo += peso;
        if (v === 'si') pesoLogrado += peso;
        else if (v === 'parcial') pesoLogrado += peso * 0.5;
      }
    }

    const score = pesoEfectivo > 0 ? Math.round((pesoLogrado / pesoEfectivo) * 100) : 100;

    scores.push({
      areaId: area.id,
      areaName: area.name,
      icon: area.icon,
      score,
      si, no, parcial, na,
      total: qLen,
      obligatorioIncumplido,
    });

    offset += qLen;
  }

  return scores;
}

/**
 * Extrae todas las no conformidades (respuestas 'no' o 'parcial').
 */
export function getNonConformities(
  flatQuestions: FlatQuestion[],
  answers: AuditAnswers
): NonConformity[] {
  return flatQuestions
    .filter(fq => answers[`q${fq.globalIdx}`] === 'no' || answers[`q${fq.globalIdx}`] === 'parcial')
    .map(fq => ({
      globalIdx: fq.globalIdx,
      qKey:      `q${fq.globalIdx}`,
      areaId:    fq.areaId,
      areaName:  fq.areaName,
      icon:      fq.icon,
      question:  fq.question,
      answer:    answers[`q${fq.globalIdx}`] as 'no' | 'parcial',
      obligatorio: fq.obligatorio,
    }));
}

/**
 * Progreso de respuestas (0-100%).
 */
export function calcProgress(flatQuestions: FlatQuestion[], answers: AuditAnswers): number {
  if (!flatQuestions.length) return 0;
  const answered = flatQuestions.filter(fq => answers[`q${fq.globalIdx}`] !== undefined).length;
  return Math.round((answered / flatQuestions.length) * 100);
}

/**
 * Color según score. Un hallazgo `obligatorio` incumplido fuerza rojo,
 * igual que scoreLabel() fuerza "Riesgo alto" — así el color nunca
 * contradice el texto (score alto en verde junto a "Riesgo alto" sería
 * confuso).
 */
export function scoreColor(score: number, obligatorioIncumplido = false): string {
  if (obligatorioIncumplido) return '#ef4444'; // red
  if (score >= 85) return '#10b981'; // green
  if (score >= 70) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

/**
 * Etiqueta de riesgo según score. Si algún criterio marcado `obligatorio`
 * quedó incumplido, fuerza "Riesgo alto" sin importar el score — un solo
 * hallazgo crítico (bioseguridad, evacuación, personal sin habilitación)
 * puede hundir una visita real aunque todo lo demás esté en verde.
 */
export function scoreLabel(score: number, obligatorioIncumplido = false): string {
  if (obligatorioIncumplido) return 'Riesgo alto — hallazgo crítico sin resolver';
  if (score >= 85) return 'Habilitación probable';
  if (score >= 70) return 'Riesgo moderado';
  return 'Riesgo alto';
}
