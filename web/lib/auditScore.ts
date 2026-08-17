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

/**
 * Aplana todas las preguntas de todas las áreas en un array indexado.
 * El índice global (q0, q1, ...) es la clave en AuditAnswers.
 */
export function buildFlatQuestions(areas: AuditArea[]): FlatQuestion[] {
  const flat: FlatQuestion[] = [];
  let idx = 0;
  for (const area of areas) {
    for (let qi = 0; qi < area.q.length; qi++) {
      flat.push({
        globalIdx: idx,
        areaId: area.id,
        areaName: area.name,
        icon: area.icon,
        norm: area.norm,
        question: area.q[qi],
        qInArea: qi,
      });
      idx++;
    }
  }
  return flat;
}

/**
 * Calcula el score global del segmento.
 * Fórmula: ((si + parcial*0.5) / effective) * 100
 * donde effective = total - na
 */
export function calcAuditScore(
  flatQuestions: FlatQuestion[],
  answers: AuditAnswers
): AuditScore {
  const total = flatQuestions.length;
  if (!total) return { score: 0, si: 0, no: 0, parcial: 0, na: 0, total: 0, effective: 0 };

  let si = 0, no = 0, parcial = 0, na = 0;
  for (let i = 0; i < total; i++) {
    const v = answers[`q${i}`];
    if (v === 'si') si++;
    else if (v === 'no') no++;
    else if (v === 'parcial') parcial++;
    else if (v === 'na') na++;
  }

  const effective = total - na;
  const score = effective > 0 ? Math.round(((si + parcial * 0.5) / effective) * 100) : 0;
  return { score, si, no, parcial, na, total, effective };
}

/**
 * Calcula el score por área individual.
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

    for (let qi = 0; qi < qLen; qi++) {
      const v = answers[`q${offset + qi}`];
      if (v === 'si') si++;
      else if (v === 'no') no++;
      else if (v === 'parcial') parcial++;
      else if (v === 'na') na++;
    }

    const effective = qLen - na;
    const score = effective > 0 ? Math.round(((si + parcial * 0.5) / effective) * 100) : 100;

    scores.push({
      areaId: area.id,
      areaName: area.name,
      icon: area.icon,
      score,
      si, no, parcial, na,
      total: qLen,
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
 * Color según score.
 */
export function scoreColor(score: number): string {
  if (score >= 85) return '#10b981'; // green
  if (score >= 70) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

/**
 * Etiqueta de riesgo según score.
 */
export function scoreLabel(score: number): string {
  if (score >= 85) return 'Habilitación probable';
  if (score >= 70) return 'Riesgo moderado';
  return 'Riesgo alto';
}
