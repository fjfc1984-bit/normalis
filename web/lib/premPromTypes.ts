/**
 * web/lib/premPromTypes.ts
 * Módulo PREM/PROM — Medidas de Experiencia (PREM) y Desenlaces (PROM)
 * reportados por el paciente.
 *
 * VACÍO LEGAL (ago 2026): ni la Res. 1732/2026 (habilitación) ni el Sistema
 * Único de Acreditación de ICONTEC exigen explícitamente un instrumento
 * PREM/PROM — es buena práctica de calidad, no un requisito normativo. Las
 * 6 preguntas de este catálogo son un instrumento propio de NormaLis (no un
 * cuestionario validado internacionalmente como EQ-5D o HCAHPS); sirven como
 * punto de partida ajustable por cada IPS, no como equivalente certificado
 * de ningún estándar externo. Los ejes de "Seguridad del Paciente" y
 * "Humanización de la Atención" de ICONTEC sí son la motivación conceptual,
 * pero ICONTEC no publica este cuestionario ni exige uno específico.
 */

export type PremPromTipo = 'prem' | 'prom';

export interface PremPromPregunta {
  id:     string;
  texto:  string;
  tipo:   PremPromTipo; // 'prem' = experiencia, 'prom' = desenlace percibido
}

// Escala Likert 1-5 para todas las preguntas, mismo criterio para toda la app.
export const PREM_PROM_ESCALA = [
  { valor: 1, label: 'Muy en desacuerdo' },
  { valor: 2, label: 'En desacuerdo' },
  { valor: 3, label: 'Neutral' },
  { valor: 4, label: 'De acuerdo' },
  { valor: 5, label: 'Muy de acuerdo' },
] as const;

export const PREM_PROM_PREGUNTAS: PremPromPregunta[] = [
  { id: 'trato',         texto: 'El trato del personal fue respetuoso y amable.',                tipo: 'prem' },
  { id: 'informacion',   texto: 'Me explicaron con claridad mi diagnóstico y/o tratamiento.',     tipo: 'prem' },
  { id: 'tiempos',       texto: 'El tiempo de espera fue razonable.',                             tipo: 'prem' },
  { id: 'instalaciones', texto: 'Las instalaciones estaban limpias y en buen estado.',            tipo: 'prem' },
  { id: 'resultado',     texto: 'Mi problema de salud mejoró después de la atención recibida.',   tipo: 'prom' },
  { id: 'recomendaria',  texto: 'Recomendaría esta IPS a un familiar o amigo.',                   tipo: 'prem' },
];

export type PremPromRespuestas = Partial<Record<string, 1 | 2 | 3 | 4 | 5>>;

export interface PremPromItem {
  id:          string;
  servicioId:  string;          // clave de SEGMENT_META (data/auditData.ts)
  respuestas:  PremPromRespuestas;
  comentario?: string;
  fecha:       string;          // fecha legible es-CO, generada por el worker al recibir
  creadoEn:    number;          // epoch ms, para ordenar
  origen:      'publico';
}

/** Promedio simple de una pregunta sobre un conjunto de respuestas (null si no hay datos). */
export function promedioPregunta(items: PremPromItem[], preguntaId: string): number | null {
  const valores = items.map(i => i.respuestas[preguntaId]).filter((v): v is 1|2|3|4|5 => typeof v === 'number');
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** Índice global: promedio de todas las respuestas de todas las preguntas. */
export function indiceGlobal(items: PremPromItem[]): number | null {
  const todos = items.flatMap(i => Object.values(i.respuestas)).filter((v): v is 1|2|3|4|5 => typeof v === 'number');
  if (todos.length === 0) return null;
  return todos.reduce((a, b) => a + b, 0) / todos.length;
}
