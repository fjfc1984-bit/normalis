/**
 * pamecTypes.ts
 * Tipos para el módulo PAMEC — Programa de Auditoría para el Mejoramiento
 * de la Calidad de la Atención en Salud.
 * Base legal: Decreto 1011/2006 Art. 34 (crea la obligación del PAMEC dentro
 * del SOGCS) · Res. 1446/2006 (guía técnica) · Res. 256/2016 (indicadores).
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
// Las 4 fases del ciclo se alinean con el ciclo PHVA (Planear-Hacer-Verificar-
// Actuar) que exige el Decreto 1011/2006 para el SOGCS. La guía técnica del
// Min. Salud (2007) describe el PAMEC con un detalle mayor (autoevaluación,
// definición del equipo, medición, formulación, ejecución, verificación) —
// las 4 fases de abajo son una simplificación operativa de ese ciclo; una
// IPS con auditoría de calidad más madura puede necesitar el detalle
// completo de la guía oficial, no solo estas 4 etapas.
export const PAMEC_FASES: { id: PamecFase; label: string; desc: string; phva: string }[] = [
  { id: 'autoeval',      label: 'Autoevaluación',     desc: 'Identificar procesos y medir indicadores actuales',        phva: 'Planear' },
  { id: 'priorizacion',  label: 'Priorización',        desc: 'Identificar brechas y priorizar oportunidades de mejora',  phva: 'Planear' },
  { id: 'plan',          label: 'Plan de mejora',      desc: 'Definir acciones correctivas con responsables y plazos',   phva: 'Hacer' },
  { id: 'seguimiento',   label: 'Seguimiento',         desc: 'Verificar el cumplimiento y medir el impacto',             phva: 'Verificar / Actuar' },
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
