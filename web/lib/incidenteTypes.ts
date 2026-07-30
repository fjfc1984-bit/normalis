/**
 * web/lib/incidenteTypes.ts
 * Tipos y constantes del módulo de Incidentes y Eventos Adversos
 * Base legal: Res. 3100/2019 Est. 5 · Política Nacional de Seguridad del Paciente
 */

// ── Tipos base ────────────────────────────────────────────────────────────────
export type IncidenteTipo =
  | 'Evento adverso'
  | 'Incidente sin daño'
  | 'Casi-evento (near miss)'
  | 'Complicación'
  | 'Accidente de trabajo'
  | 'Otro';

export type IncidenteSeveridad = 'critico' | 'moderado' | 'leve';

export type IncidenteEstado = 'Abierto' | 'En seguimiento' | 'Cerrado';

export interface IncidenteItem {
  id:          string;
  tipo:        IncidenteTipo;
  severidad:   IncidenteSeveridad;
  desc:        string;   // Descripción del evento
  accion:      string;   // Acción inmediata tomada
  responsable: string;   // Responsable del seguimiento
  estado:      IncidenteEstado;
  fecha:       string;   // Fecha legible es-CO
  creadoEn:    number;   // timestamp ms
}

// ── Catálogos ─────────────────────────────────────────────────────────────────
export const INCIDENTE_TIPOS: IncidenteTipo[] = [
  'Evento adverso',
  'Incidente sin daño',
  'Casi-evento (near miss)',
  'Complicación',
  'Accidente de trabajo',
  'Otro',
];

export const INCIDENTE_SEVERIDADES: IncidenteSeveridad[] = [
  'critico', 'moderado', 'leve',
];

export const INCIDENTE_ESTADOS: IncidenteEstado[] = [
  'Abierto', 'En seguimiento', 'Cerrado',
];

// ── Colores por severidad ─────────────────────────────────────────────────────
export const SEVERIDAD_COLOR: Record<IncidenteSeveridad, {
  bg: string; text: string; border: string; dot: string; label: string;
}> = {
  critico:  { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-500',    dot: 'bg-red-500',    label: '🔴 Crítico'  },
  moderado: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-400',  dot: 'bg-amber-400',  label: '🟡 Moderado' },
  leve:     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-400',   dot: 'bg-blue-400',   label: '🔵 Leve'     },
};

// ── Colores por estado ────────────────────────────────────────────────────────
export const ESTADO_INC_COLOR: Record<IncidenteEstado, { bg: string; text: string }> = {
  'Abierto':        { bg: 'bg-red-100',    text: 'text-red-700'    },
  'En seguimiento': { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  'Cerrado':        { bg: 'bg-emerald-100',text: 'text-emerald-700'},
};
