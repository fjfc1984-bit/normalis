// web/lib/informeAuditoriaTypes.ts
// Tipos para el módulo de Informes de Auditoría — documento formal que
// resume cualquier auditoría o eventualidad (habilitación, incidente,
// vigilancia sanitaria, u otra registrada manualmente) en las secciones
// estándar de un informe de auditoría.

import type { Timestamp } from 'firebase/firestore';

export type FuenteInforme = 'auditoria' | 'incidente' | 'vigilancia' | 'manual';

export const FUENTE_LABELS: Record<FuenteInforme, string> = {
  auditoria:  '🔍 Auditoría de habilitación',
  incidente:  '🛡️ Incidente / evento adverso',
  vigilancia: '⚠️ Vigilancia sanitaria',
  manual:     '✏️ Manual / otra eventualidad',
};

export interface InformeSecciones {
  introduccion: string;
  justificacion: string;
  objetivos: string;
  metodologia: string;
  alcance: string;
  hallazgos: string;
  conclusiones: string;
  recomendaciones: string;
  salvedad: string;
}

export const SECCION_LABELS: Record<keyof InformeSecciones, string> = {
  introduccion:     'Introducción',
  justificacion:    'Justificación',
  objetivos:        'Objetivos',
  metodologia:      'Metodología',
  alcance:          'Alcance',
  hallazgos:        'Hallazgos',
  conclusiones:     'Conclusiones',
  recomendaciones:  'Recomendaciones',
  salvedad:         'Salvedad',
};

export const SECCION_ORDEN: (keyof InformeSecciones)[] = [
  'introduccion', 'justificacion', 'objetivos', 'metodologia', 'alcance',
  'hallazgos', 'conclusiones', 'recomendaciones', 'salvedad',
];

export const SECCIONES_VACIAS: InformeSecciones = {
  introduccion: '', justificacion: '', objetivos: '', metodologia: '',
  alcance: '', hallazgos: '', conclusiones: '', recomendaciones: '', salvedad: '',
};

export interface InformeAuditoria {
  id: string;
  uid: string;
  nit: string;
  titulo: string;
  fuente: FuenteInforme;
  fuenteRefId: string | null;
  fuenteLabel: string;
  secciones: InformeSecciones;
  elaboradoPor: string;
  cargoElaborador: string;
  fechaInforme: string; // "YYYY-MM-DD"
  fechaCreacion: Timestamp | null;
  fechaActualizacion: Timestamp | null;
}

export interface InformeFormData {
  titulo: string;
  fuente: FuenteInforme;
  fuenteRefId: string | null;
  fuenteLabel: string;
  secciones: InformeSecciones;
  elaboradoPor: string;
  cargoElaborador: string;
  fechaInforme: string;
}
