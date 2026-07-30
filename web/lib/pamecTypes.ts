/**
 * pamecTypes.ts
 * Tipos para el módulo PAMEC — Programa de Auditoría para el Mejoramiento
 * de la Calidad de la Atención en Salud (Res. 1446/2006, Res. 256/2016)
 */

export type PamecFase = 'autoeval' | 'priorizacion' | 'plan' | 'seguimiento';

export interface PamecItem {
  id:       string;
  proceso:  string;    // ej: "Atención de urgencias"
  indicador: string;   // ej: "Tasa de reingreso a urgencias en 72h"
  meta:     string;    // ej: "< 5%"
  resultado?: string;  // resultado medido
  brecha?:  string;    // análisis de brecha
  prioridad?: 'alta' | 'media' | 'baja';
  estado:   'pendiente' | 'en_curso' | 'cerrado';
  creadoEn: string;    // ISO date
}

export interface PamecAccion {
  id:           string;
  itemId:       string;
  descripcion:  string;
  responsable:  string;
  fechaLimite:  string;   // YYYY-MM-DD
  fechaCierre?: string;
  estado:       'pendiente' | 'en_curso' | 'completada';
  evidencia?:   string;
}

export interface PamecDoc {
  nit:       string;
  fase:      PamecFase;
  items:     PamecItem[];
  acciones:  PamecAccion[];
  updatedAt: string;
}

// ── Fases PAMEC ────────────────────────────────────────────────────────────
export const PAMEC_FASES: { id: PamecFase; label: string; desc: string }[] = [
  { id: 'autoeval',      label: 'Autoevaluación',     desc: 'Identificar procesos y medir indicadores actuales' },
  { id: 'priorizacion',  label: 'Priorización',        desc: 'Identificar brechas y priorizar oportunidades de mejora' },
  { id: 'plan',          label: 'Plan de mejora',      desc: 'Definir acciones correctivas con responsables y plazos' },
  { id: 'seguimiento',   label: 'Seguimiento',         desc: 'Verificar el cumplimiento y medir el impacto' },
];

// ── Procesos sugeridos (Res. 256/2016) ─────────────────────────────────────
export const PROCESOS_SUGERIDOS = [
  'Atención de urgencias',
  'Atención de partos',
  'Atención hospitalaria',
  'Cirugía',
  'Consulta externa',
  'Dispensación de medicamentos',
  'Esterilización',
  'Laboratorio clínico',
  'Imágenes diagnósticas',
  'Transfusiones',
  'Gestión de residuos hospitalarios',
  'Seguridad del paciente',
  'Infecciones asociadas a la atención',
];
