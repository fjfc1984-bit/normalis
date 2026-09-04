// web/lib/infraestructuraTypes.ts
// Tipos para el módulo de Gestión de Infraestructura Física
// Base legal: Res. 1732/2026 — Estándar de Infraestructura (equivalente al
// Estándar 2 de la derogada Res. 3100/2019).
//
// El checklist de 11 criterios NO se redactó de nuevo aquí — se toma
// directamente de web/data/auditData.ts (areasDB.general → área
// "infraestructura"), que es el mismo checklist que ya usan las auditorías
// de habilitación en NormaLis. Así se evita duplicar/desincronizar el texto
// de los criterios entre el módulo de Auditoría y este módulo de gestión.
//
// NOTA REGULATORIA: la cita "norm" de esos criterios en auditData.ts sigue
// referenciando la derogada Res. 3100/2019 Est. 2 (con las actualizaciones
// puntuales de la Res. 465/2025 ya incorporadas en el texto de cada
// pregunta). No tengo el texto completo del Tomo I de la Res. 1732/2026
// para confirmar la numeración exacta de artículos que reemplaza al
// Estándar 2 — verificar con la Secretaría de Salud territorial o con el
// texto oficial si necesitas citar el artículo específico en un informe.

import type { Timestamp } from 'firebase/firestore';
import { areasDB, SEGMENT_META } from '@/data/auditData';
import { preguntaTexto } from '@/lib/auditTypes';

// ── Criterios — fuente única: auditData.ts ──────────────────────────────────

const INFRA_AREA = areasDB.general.find(a => a.id === 'infraestructura');

export interface CriterioInfraestructura {
  id:    string;
  texto: string;
}

export const CRITERIOS_INFRAESTRUCTURA: CriterioInfraestructura[] =
  (INFRA_AREA?.q ?? []).map((q, i) => ({ id: `c${i}`, texto: preguntaTexto(q) }));

export const NORMA_INFRAESTRUCTURA = INFRA_AREA?.norm ?? 'Res. 1732/2026 — Estándar de Infraestructura';

// ── Respuesta por criterio — mismo vocabulario que Auditoría (auditTypes.ts) ─

export type RespuestaCriterio = 'si' | 'no' | 'parcial' | 'na';

export const RESPUESTA_LABEL: Record<RespuestaCriterio, string> = {
  si: 'Cumple', no: 'No cumple', parcial: 'Parcial', na: 'No aplica',
};

// ── Área física registrada ───────────────────────────────────────────────────

export type EstadoArea = 'cumple' | 'parcial' | 'no_cumple' | 'sin_inspeccionar';

export const ESTADO_AREA_CFG: Record<EstadoArea, { label: string; color: string; bg: string }> = {
  cumple:            { label: 'Cumple',                color: 'text-emerald-700', bg: 'bg-emerald-100' },
  parcial:           { label: 'Cumplimiento parcial',  color: 'text-amber-700',   bg: 'bg-amber-100'   },
  no_cumple:         { label: 'No cumple',              color: 'text-red-700',     bg: 'bg-red-100'     },
  sin_inspeccionar:  { label: 'Sin inspeccionar',        color: 'text-gray-500',    bg: 'bg-gray-100'    },
};

// Reutiliza la misma taxonomía de servicios habilitados que ya usa el resto
// de la app (auditData.ts SEGMENT_META, cada uno con su propia cita
// normativa — ver dmsServiciosCatalogo.ts para el mismo patrón) en vez de
// inventar una segunda lista de "tipos de área" aparte. Los últimos 4
// valores son zonas físicas reales que se inspeccionan bajo el Estándar de
// Infraestructura pero que no son un "servicio habilitado" con cita propia
// en SEGMENT_META — se dejan explícitamente así, sin inventarles una cita.
export const TIPOS_AREA: string[] = [
  ...Object.entries(SEGMENT_META)
    .filter(([id]) => id !== 'general' && id !== 'profesional_independiente')
    .map(([, meta]) => meta.label)
    .sort((a, b) => a.localeCompare(b, 'es')),
  'Servicio Farmacéutico', 'Central de Esterilización', 'Áreas comunes / administrativas', 'Otro',
];

export interface AreaFisica {
  id:      string;
  uid:     string;
  nit:     string;
  nombre:  string;               // "Consultorio 3", "Sala de Urgencias"
  tipoArea: string;
  responsable: string;
  frecuenciaInspeccionMeses: number;
  // Denormalizado desde la última inspección (evita N+1 queries en la lista)
  ultimaInspeccionFecha: string | null;
  ultimaInspeccionScore: number | null;
  proximaInspeccion:     string | null;
  estado:  EstadoArea;
  capaId:  string | null;        // CAPA vinculada a hallazgos de la última inspección
  fechaCreacion: Timestamp | null;
  fechaActualizacion: Timestamp | null;
  // computed client-side
  _inspeccionVencida?: boolean;
}

export interface AreaFisicaFormData {
  nombre: string;
  tipoArea: string;
  responsable: string;
  frecuenciaInspeccionMeses: number;
}

export const AREA_EMPTY_FORM: AreaFisicaFormData = {
  nombre: '', tipoArea: '', responsable: '', frecuenciaInspeccionMeses: 6,
};

// ── Inspecciones (subcolección infraestructura_areas/{id}/inspecciones) ─────

export type RespuestasInspeccion = Record<string, RespuestaCriterio>; // criterioId -> respuesta

export interface Inspeccion {
  id:         string;
  fecha:      string;
  inspector:  string;
  respuestas: RespuestasInspeccion;
  hallazgos:  string;
  score:      number;
  fechaCreacion: Timestamp | null;
  registradoPor: string;
  capaId?: string | null;
}

export interface InspeccionFormData {
  fecha:      string;
  inspector:  string;
  respuestas: RespuestasInspeccion;
  hallazgos:  string;
}

// ── Scoring — misma fórmula que auditScore.ts: ((si + parcial*0.5)/effective)*100 ──

export function calcScoreInspeccion(respuestas: RespuestasInspeccion): number {
  const valores = CRITERIOS_INFRAESTRUCTURA.map(c => respuestas[c.id]).filter(Boolean);
  const si = valores.filter(v => v === 'si').length;
  const parcial = valores.filter(v => v === 'parcial').length;
  const na = valores.filter(v => v === 'na').length;
  const effective = valores.length - na;
  if (effective <= 0) return 100;
  return Math.round(((si + parcial * 0.5) / effective) * 100);
}

export function calcEstadoDesdeScore(score: number, respuestas: RespuestasInspeccion): EstadoArea {
  const tieneNoCumple = Object.values(respuestas).includes('no');
  if (score >= 85 && !tieneNoCumple) return 'cumple';
  if (score >= 70) return 'parcial';
  return 'no_cumple';
}
