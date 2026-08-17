// web/lib/capaTypes.ts
// Tipos TypeScript para el módulo CAPA (Acciones Correctivas y Preventivas)
// Base legal: Dec. 1011/2006 Art. 34, Res. 256/2016, ciclo PAMEC

import type { Timestamp } from 'firebase/firestore';

export type CapaEstado = 'abierta' | 'en_progreso' | 'cerrada';
export type CapaOrigen = 'auditoria' | 'manual' | 'queja' | 'indicador' | 'supervision' | 'brecha_1732' | 'incidente' | 'riesgo';

export interface Capa {
  id: string;
  uid: string;
  nit: string;
  numero: string;              // "CAPA-001"
  descripcion: string;         // No conformidad / hallazgo
  causaRaiz: string;
  accionCorrectiva: string;
  responsable: string;
  area: string;
  fechaLimite: string;         // ISO date string "YYYY-MM-DD"
  origen: CapaOrigen | string;
  evidencia: string;
  estado: CapaEstado;
  fechaCreacion:    Timestamp | null;
  fechaActualizacion: Timestamp | null;
  fechaInicio:      Timestamp | null;
  fechaCierre:      Timestamp | null;
  // computed client-side
  _vencida?: boolean;
  _diasRestantes?: number | null;
}

export interface CapaFormData {
  descripcion: string;
  causaRaiz: string;
  accionCorrectiva: string;
  responsable: string;
  area: string;
  fechaLimite: string;
  origen: string;
  evidencia: string;
}

export const CAPA_ESTADO_CFG: Record<CapaEstado, { label: string; color: string; bg: string; ringColor: string }> = {
  abierta:     { label: 'Abierta',      color: 'text-amber-700',  bg: 'bg-amber-100',  ringColor: 'ring-amber-300'  },
  en_progreso: { label: 'En Progreso',  color: 'text-blue-700',   bg: 'bg-blue-100',   ringColor: 'ring-blue-300'   },
  cerrada:     { label: 'Cerrada',      color: 'text-emerald-700', bg: 'bg-emerald-100', ringColor: 'ring-emerald-300' },
};

export const CAPA_ORIGEN_LABELS: Record<string, string> = {
  auditoria:   '🔍 Auditoría',
  manual:      '✏️ Manual',
  queja:       '📣 Queja/PQRS',
  indicador:   '📊 Indicador',
  supervision: '👁 Supervisión',
  brecha_1732: '⚡ Brecha Res. 1732/2026',
  incidente:   '🛡️ Análisis de incidente (IA)',
  riesgo:      '⚠️ Riesgo ISO 31000',
};

export const CAPA_EMPTY_FORM: CapaFormData = {
  descripcion: '',
  causaRaiz: '',
  accionCorrectiva: '',
  responsable: '',
  area: '',
  fechaLimite: '',
  origen: 'manual',
  evidencia: '',
};
