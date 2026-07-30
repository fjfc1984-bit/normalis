/**
 * web/lib/bitacoraTypes.ts
 * Tipos y constantes del módulo Bitácora de Gobernanza
 */

export type BitacoraModulo =
  | 'PQRS'
  | 'Incidentes'
  | 'Vencimientos'
  | 'CAPAs'
  | 'Indicadores'
  | 'SG-SST'
  | 'Documentos'
  | 'Auditoría'
  | 'Sistema'
  | 'Otro';

export interface BitacoraEntry {
  id:      string;
  ts:      string;       // ISO string
  usuario: string;
  modulo:  BitacoraModulo;
  accion:  string;
  detalle: string;
  creadoEn: number;      // ms para ordenar
}

export const BITACORA_MODULOS: BitacoraModulo[] = [
  'PQRS', 'Incidentes', 'Vencimientos', 'CAPAs', 'Indicadores',
  'SG-SST', 'Documentos', 'Auditoría', 'Sistema', 'Otro',
];

// Colores Tailwind por módulo (bg + text)
export const MODULO_COLOR: Record<BitacoraModulo, { bg: string; text: string }> = {
  'PQRS':         { bg: 'bg-indigo-100',  text: 'text-indigo-700'  },
  'Incidentes':   { bg: 'bg-red-100',     text: 'text-red-700'     },
  'Vencimientos': { bg: 'bg-purple-100',  text: 'text-purple-700'  },
  'CAPAs':        { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'Indicadores':  { bg: 'bg-blue-100',    text: 'text-blue-700'    },
  'SG-SST':       { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  'Documentos':   { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  'Auditoría':    { bg: 'bg-teal-100',    text: 'text-teal-700'    },
  'Sistema':      { bg: 'bg-gray-100',    text: 'text-gray-600'    },
  'Otro':         { bg: 'bg-gray-100',    text: 'text-gray-600'    },
};

export const PAGE_SIZE = 20;
