// web/lib/auditTypes.ts
// Tipos TypeScript para el módulo de auditoría de habilitación

/**
 * Una pregunta puede seguir siendo un string plano (peso=1, no obligatoria
 * — comportamiento idéntico al motor anterior, sin ponderación) o un
 * objeto con `peso`/`obligatorio` cuando esa clasificación de criticidad
 * ya fue revisada. Es una unión, no un reemplazo total: los 22 segmentos
 * de data/auditData.ts pueden migrar criterio por criterio, sin tener que
 * tocar los que todavía no se revisaron. Ver preguntaTexto/Peso/Obligatoria.
 */
export type AuditQuestion = string | {
  texto: string;
  /** Peso relativo dentro del área. Por defecto 1 (todas las preguntas
   *  pesan igual) — un peso mayor pondera más en el score del área. */
  peso?: number;
  /** Si es true y la respuesta es 'no' o 'parcial', el hallazgo fuerza el
   *  resultado global a "Riesgo alto" sin importar el score numérico —
   *  modela que un solo incumplimiento crítico (ej. bioseguridad, salidas
   *  de emergencia, personal sin habilitación) puede hundir una auditoría
   *  con score alto en todo lo demás, tal como pasa en una visita real. */
  obligatorio?: boolean;
};

export function preguntaTexto(q: AuditQuestion): string {
  return typeof q === 'string' ? q : q.texto;
}

export function preguntaPeso(q: AuditQuestion): number {
  return typeof q === 'string' ? 1 : (q.peso ?? 1);
}

export function preguntaObligatoria(q: AuditQuestion): boolean {
  return typeof q === 'string' ? false : (q.obligatorio ?? false);
}

export interface AuditArea {
  id: string;
  icon: string;
  name: string;
  norm: string;
  q: AuditQuestion[];
}

export interface AuditSegmentData {
  areas: AuditArea[];
}

export type AuditAnswer = 'si' | 'no' | 'parcial' | 'na';

export interface AuditAnswers {
  [key: string]: AuditAnswer; // key = "q0", "q1", ...
}

export interface AuditScore {
  score: number;       // 0-100, ponderado por peso de cada pregunta
  si: number;
  no: number;
  parcial: number;
  na: number;
  total: number;
  effective: number;
  /** true si algún criterio marcado `obligatorio` quedó en 'no'/'parcial'.
   *  scoreLabel() usa esto para forzar "Riesgo alto" pase lo que pase con
   *  el score numérico. */
  obligatorioIncumplido: boolean;
}

export interface AuditAreaScore {
  areaId: string;
  areaName: string;
  icon: string;
  score: number;
  si: number;
  no: number;
  parcial: number;
  na: number;
  total: number;
  obligatorioIncumplido: boolean;
}

export interface FlatQuestion {
  globalIdx: number;
  areaId: string;
  areaName: string;
  icon: string;
  norm: string;
  question: string;
  qInArea: number; // index within the area
  peso: number;
  obligatorio: boolean;
}

export interface NonConformity {
  globalIdx: number;
  qKey:     string;
  areaId:   string;
  areaName: string;
  icon: string;
  question: string;
  answer: 'no' | 'parcial';
  obligatorio: boolean;
}

// Firestore document structure for saved audits
export interface SavedAudit {
  uid: string;
  segmento: string;
  answers: AuditAnswers;
  score: number;
  completedAt: Date | null;
  updatedAt: Date | null;
}
