// web/lib/historiaClinicaTypes.ts
// Tipos para el módulo de Auditoría de Historia Clínica (por muestreo)
// Base legal: Res. 1732/2026 — Estándar de Historia Clínica (equivalente al
// Estándar 6 de la derogada Res. 3100/2019), Res. 1995/1999, Res. 839/2017,
// Ley 1581/2012 (Habeas Data).
//
// NormaLis no administra el contenido clínico de los pacientes — eso vive en
// el sistema de HC de cada IPS. Lo que este módulo digitaliza es la
// AUDITORÍA PERIÓDICA de completitud/calidad por muestreo, que es la
// práctica real con la que un comité de historias clínicas evidencia
// cumplimiento ante una visita de verificación: se toma una muestra de N
// expedientes, se evalúan contra un checklist, y el resultado agregado
// queda documentado con fecha, auditor y hallazgos.
//
// El checklist de 8 criterios se toma TAL CUAL de web/data/auditData.ts
// (areasDB.general → "historiaclinica"), el mismo que ya usa el módulo de
// Auditoría — fuente única, sin duplicar texto.
//
// NOTA REGULATORIA: la cita "norm" de esos 8 criterios en auditData.ts sigue
// referenciando la derogada Res. 3100/2019 Est. 6. No tengo el texto
// completo del Tomo correspondiente de la Res. 1732/2026 para confirmar la
// numeración exacta que lo reemplaza.

import type { Timestamp } from 'firebase/firestore';
import { areasDB } from '@/data/auditData';

const HC_AREA = areasDB.general.find(a => a.id === 'historiaclinica');

export interface CriterioHC {
  id:    string;
  texto: string;
}

export const CRITERIOS_HC: CriterioHC[] = (HC_AREA?.q ?? []).map((texto, i) => ({ id: `c${i}`, texto }));

export const NORMA_HC = HC_AREA?.norm ?? 'Res. 1732/2026 — Estándar de Historia Clínica';

export type RespuestaCriterio = 'si' | 'no' | 'parcial' | 'na';

export const RESPUESTA_LABEL: Record<RespuestaCriterio, string> = {
  si: 'Cumple', no: 'No cumple', parcial: 'Parcial', na: 'No aplica',
};

export type EstadoAuditoriaHC = 'cumple' | 'parcial' | 'no_cumple';

export const ESTADO_HC_CFG: Record<EstadoAuditoriaHC, { label: string; color: string; bg: string }> = {
  cumple:     { label: 'Cumple',               color: 'text-emerald-700', bg: 'bg-emerald-100' },
  parcial:    { label: 'Cumplimiento parcial',  color: 'text-amber-700',   bg: 'bg-amber-100'    },
  no_cumple:  { label: 'No cumple',             color: 'text-red-700',     bg: 'bg-red-100'      },
};

export type RespuestasHC = Record<string, RespuestaCriterio>;

export interface AuditoriaHC {
  id:            string;
  uid:           string;
  nit:           string;
  fecha:         string;
  auditor:       string;
  servicio:      string;         // servicio/segmento del que se tomó la muestra
  tamanoMuestra: number;         // número de expedientes revisados
  respuestas:    RespuestasHC;
  hallazgos:     string;
  score:         number;
  capaId:        string | null;
  fechaCreacion: Timestamp | null;
}

export interface AuditoriaHCFormData {
  fecha: string;
  auditor: string;
  servicio: string;
  tamanoMuestra: number;
  respuestas: RespuestasHC;
  hallazgos: string;
}

export const AUDITORIA_HC_EMPTY_FORM: AuditoriaHCFormData = {
  fecha: '', auditor: '', servicio: '', tamanoMuestra: 10, respuestas: {}, hallazgos: '',
};

// Misma fórmula que auditScore.ts / infraestructuraTypes.ts / medicamentosTypes.ts
export function calcScoreHC(respuestas: RespuestasHC): number {
  const valores = CRITERIOS_HC.map(c => respuestas[c.id]).filter(Boolean);
  const si = valores.filter(v => v === 'si').length;
  const parcial = valores.filter(v => v === 'parcial').length;
  const na = valores.filter(v => v === 'na').length;
  const effective = valores.length - na;
  if (effective <= 0) return 100;
  return Math.round(((si + parcial * 0.5) / effective) * 100);
}

export function calcEstadoHC(score: number, respuestas: RespuestasHC): EstadoAuditoriaHC {
  const tieneNoCumple = Object.values(respuestas).includes('no');
  if (score >= 85 && !tieneNoCumple) return 'cumple';
  if (score >= 70) return 'parcial';
  return 'no_cumple';
}
