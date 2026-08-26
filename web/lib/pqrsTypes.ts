/**
 * web/lib/pqrsTypes.ts
 * Tipos y constantes del módulo PQRS
 * Base legal: Res. 13437/1991 (derechos del paciente) · Res. 1732/2026 Est. 5 (reemplaza Res. 3100/2019)
 */

// ── Tipos base ────────────────────────────────────────────────────────────────
export type PQRSTipo =
  | 'Petición'
  | 'Queja'
  | 'Reclamo'
  | 'Sugerencia'
  | 'Felicitación';

export type PQRSEstado = 'Pendiente' | 'En Proceso' | 'Cerrada';

// Origen del registro: escrito por el staff, o enviado por el paciente
// mismo desde el formulario público (app.normalis.co/pqrs/{uid})
export type PQRSOrigen = 'interno' | 'publico';

// Prioridad / nivel de riesgo del caso — determina el plazo de respuesta
// según la Circular Externa 2023151000000010-5 de 2023 (SuperSalud).
// Los registros creados ANTES de este campo no tienen `prioridad` guardada
// en Firestore — se tratan como 'General' (el plazo supletorio más amplio,
// nunca el más estricto) para no marcar como "vencidos" casos antiguos que
// nunca se clasificaron con estos niveles.
export type PQRSPrioridad = 'Vital' | 'Priorizada' | 'Simple' | 'General';

export interface PQRSItem {
  id:             string;         // Firestore doc ID
  tipo:           PQRSTipo;
  nombre:         string;         // Nombre del paciente / solicitante
  desc:           string;         // Descripción del caso
  area:           string;         // Área o servicio involucrado (opcional)
  estado:         PQRSEstado;
  prioridad?:     PQRSPrioridad;  // ausente en registros antiguos → tratar como 'General'
  fecha:          string;         // Fecha legible es-CO
  creadoEn:       number;         // timestamp ms para ordenar
  email?:         string;         // Contacto del solicitante (permite responderle)
  telefono?:      string;
  origen?:        PQRSOrigen;
  respuesta?:     string;         // Respuesta enviada al solicitante
  respuestaFecha?: string;
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

// ── Prioridad / SLA (Circular Externa 2023151000000010-5 de 2023, SuperSalud) ──
export interface PQRSSLAInfo {
  label:        string;
  horas?:       number;        // plazo en horas corridas (Vital/Priorizada/Simple)
  diasHabiles?: number;        // plazo en días hábiles (General)
  descripcion:  string;
}

export const PQRS_SLA: Record<PQRSPrioridad, PQRSSLAInfo> = {
  Vital:      { label: 'Vital',       horas: 24,       descripcion: 'Riesgo de vida o afectación grave e inminente — atención inmediata' },
  Priorizada: { label: 'Priorizada',  horas: 48,       descripcion: 'Requiere atención prioritaria por el riesgo o gravedad del caso' },
  Simple:     { label: 'Simple',      horas: 72,       descripcion: 'Queja o reclamo sin riesgo inminente identificado' },
  General:    { label: 'General',     diasHabiles: 15, descripcion: 'Petición general — plazo supletorio (Ley 1755/2015, Art. 14)' },
};

export const PQRS_PRIORIDADES: PQRSPrioridad[] = ['Vital', 'Priorizada', 'Simple', 'General'];

export const PRIORIDAD_COLOR: Record<PQRSPrioridad, { bg: string; text: string; dot: string }> = {
  Vital:      { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
  Priorizada: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  Simple:     { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  General:    { bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400'  },
};

/**
 * Calcula el timestamp (ms) del vencimiento de respuesta según la prioridad.
 *
 * VACÍO LEGAL: el conteo de "días hábiles" aquí excluye únicamente sábados
 * y domingos — NO existe en la app un calendario de festivos colombianos,
 * así que el plazo de 'General' (15 días hábiles) puede quedar subestimado
 * si hay festivos en el rango. Validar el plazo exacto contra el calendario
 * oficial de festivos cuando el caso esté cerca del límite.
 */
export function calcularVencimientoPQRS(creadoEn: number, prioridad: PQRSPrioridad = 'General'): number {
  const sla = PQRS_SLA[prioridad] ?? PQRS_SLA.General;
  if (sla.horas) return creadoEn + sla.horas * 60 * 60 * 1000;
  let restantes = sla.diasHabiles ?? 15;
  const fecha = new Date(creadoEn);
  while (restantes > 0) {
    fecha.setDate(fecha.getDate() + 1);
    const dow = fecha.getDay();
    if (dow !== 0 && dow !== 6) restantes--;
  }
  return fecha.getTime();
}

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
