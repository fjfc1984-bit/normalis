/**
 * web/lib/pqrsTypes.ts
 * Tipos y constantes del módulo PQRS
 * Base legal: Res. 13437/1991 (derechos del paciente) · Res. 3100/2019 Est. 5
 */

// ── Tipos base ────────────────────────────────────────────────────────────────
export type PQRSTipo =
  | 'Petición'
  | 'Queja'
  | 'Reclamo'
  | 'Sugerencia'
  | 'Felicitación';

export type PQRSEstado = 'Pendiente' | 'En Proceso' | 'Cerrada';

export interface PQRSItem {
  id:       string;         // Firestore doc ID
  tipo:     PQRSTipo;
  nombre:   string;         // Nombre del paciente / solicitante
  desc:     string;         // Descripción del caso
  area:     string;         // Área o servicio involucrado (opcional)
  estado:   PQRSEstado;
  fecha:    string;         // Fecha legible es-CO
  creadoEn: number;         // timestamp ms para ordenar
}

// ── Catálogos ─────────────────────────────────────────────────────────────────
export const PQRS_TIPOS: PQRSTipo[] = [
  'Petición', 'Queja', 'Reclamo', 'Sugerencia', 'Felicitación',
];

export const PQRS_ESTADOS: PQRSEstado[] = [
  'Pendiente', 'En Proceso', 'Cerrada',
];

export const PQRS_AREAS: string[] = [
  'Consulta Externa',
  'Urgencias',
  'Hospitalización',
  'Laboratorio',
  'Farmacia',
  'Facturación',
  'Atención al Usuario',
  'Otra',
];

// ── Colores por tipo ──────────────────────────────────────────────────────────
export const TIPO_COLOR: Record<PQRSTipo, { bg: string; text: string; dot: string }> = {
  'Petición':    { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  'Queja':       { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
  'Reclamo':     { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  'Sugerencia':  { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  'Felicitación':{ bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-500'},
};

// ── Colores por estado ────────────────────────────────────────────────────────
export const ESTADO_COLOR: Record<PQRSEstado, { bg: string; text: string }> = {
  'Pendiente':  { bg: 'bg-amber-100',   text: 'text-amber-700'  },
  'En Proceso': { bg: 'bg-blue-100',    text: 'text-blue-700'   },
  'Cerrada':    { bg: 'bg-emerald-100', text: 'text-emerald-700'},
};
