// web/lib/medicamentosTypes.ts
// Tipos para el módulo de Gestión de Medicamentos y Dispositivos Médicos
// Base legal: Res. 1732/2026 — Estándar de Medicamentos y Dispositivos
// Médicos (equivalente al Estándar 4 de la derogada Res. 3100/2019).
//
// Dos piezas, igual que separa la propia norma:
//   1) Inventario de lotes — control de vencimiento, alto riesgo, controlados
//      y cadena de frío (distinto del módulo genérico de Vencimientos: aquí
//      cada lote sabe si es de alto riesgo/controlado y si requiere cadena
//      de frío, y las alertas usan la ventana real de 3 meses del criterio).
//   2) Verificación del Servicio Farmacéutico — checklist periódico, tomado
//      TAL CUAL de web/data/auditData.ts (areasDB.general → "insumos"), el
//      mismo que ya usa el módulo de Auditoría. Fuente única, sin duplicar
//      texto ni arriesgar que se desactualice.
//
// NOTA REGULATORIA: igual que en infraestructuraTypes.ts, la cita "norm" de
// esos 8 criterios en auditData.ts sigue referenciando la derogada
// Res. 3100/2019 Est. 4. No tengo el texto completo del Tomo correspondiente
// de la Res. 1732/2026 para confirmar la numeración exacta que lo reemplaza.

import type { Timestamp } from 'firebase/firestore';
import { areasDB } from '@/data/auditData';
import { preguntaTexto } from '@/lib/auditTypes';

// ── Lotes de medicamentos/dispositivos ───────────────────────────────────────

export type TipoMedicamento = 'regular' | 'alto_riesgo' | 'controlado';

export const TIPO_MEDICAMENTO_CFG: Record<TipoMedicamento, { label: string; color: string; bg: string }> = {
  regular:     { label: 'Regular',                   color: 'text-gray-600',  bg: 'bg-gray-100'   },
  alto_riesgo: { label: 'Alto riesgo',                color: 'text-orange-700', bg: 'bg-orange-100' },
  controlado:  { label: 'Controlado (bajo llave)',    color: 'text-purple-700', bg: 'bg-purple-100' },
};

export type EstadoLote = 'activo' | 'por_vencer' | 'vencido' | 'retirado';

export const ESTADO_LOTE_CFG: Record<EstadoLote, { label: string; color: string; bg: string }> = {
  activo:     { label: 'Vigente',      color: 'text-emerald-700', bg: 'bg-emerald-100' },
  por_vencer: { label: 'Por vencer',   color: 'text-amber-700',   bg: 'bg-amber-100'    },
  vencido:    { label: 'Vencido',      color: 'text-red-700',     bg: 'bg-red-100'      },
  retirado:   { label: 'Retirado/destruido', color: 'text-gray-500', bg: 'bg-gray-100'  },
};

// Ventana de "próximo a vencer" del criterio real (auditData.ts "insumos" q1):
// "…medicamentos próximos a vencer (menos de 3 meses) están identificados"
export const DIAS_ALERTA_VENCIMIENTO = 90;

export interface LoteMedicamento {
  id:      string;
  uid:     string;
  nit:     string;
  nombre:  string;
  lote:    string;
  tipo:    TipoMedicamento;
  cantidad: number;
  unidadMedida: string;          // "unidades", "cajas", "frascos", "ampollas"…
  fechaVencimiento: string;      // ISO date
  requiereCadenaFrio: boolean;
  ubicacion: string;             // "Farmacia central", "Botiquín Urgencias"…
  estadoManual: 'activo' | 'retirado'; // el usuario solo controla esto; vencido/por_vencer se calculan
  fechaCreacion: Timestamp | null;
  fechaActualizacion: Timestamp | null;
  // computed client-side
  _estado?: EstadoLote;
  _diasParaVencer?: number;
}

export interface LoteFormData {
  nombre: string;
  lote: string;
  tipo: TipoMedicamento;
  cantidad: number;
  unidadMedida: string;
  fechaVencimiento: string;
  requiereCadenaFrio: boolean;
  ubicacion: string;
}

export const LOTE_EMPTY_FORM: LoteFormData = {
  nombre: '', lote: '', tipo: 'regular', cantidad: 1, unidadMedida: 'unidades',
  fechaVencimiento: '', requiereCadenaFrio: false, ubicacion: '',
};

export function calcEstadoLote(fechaVencimiento: string, estadoManual: 'activo' | 'retirado'): { estado: EstadoLote; diasParaVencer: number } {
  if (estadoManual === 'retirado') return { estado: 'retirado', diasParaVencer: 0 };
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento + 'T00:00:00');
  const dias = Math.round((venc.getTime() - hoy.getTime()) / 86_400_000);
  if (dias < 0) return { estado: 'vencido', diasParaVencer: dias };
  if (dias <= DIAS_ALERTA_VENCIMIENTO) return { estado: 'por_vencer', diasParaVencer: dias };
  return { estado: 'activo', diasParaVencer: dias };
}

// ── Verificación del Servicio Farmacéutico — checklist real, fuente única ──

const FARMACIA_AREA = areasDB.general.find(a => a.id === 'insumos');

export interface CriterioFarmacia {
  id:    string;
  texto: string;
}

export const CRITERIOS_FARMACIA: CriterioFarmacia[] =
  (FARMACIA_AREA?.q ?? []).map((q, i) => ({ id: `c${i}`, texto: preguntaTexto(q) }));

export const NORMA_FARMACIA = FARMACIA_AREA?.norm ?? 'Res. 1732/2026 — Estándar de Medicamentos y Dispositivos Médicos';

export type RespuestaCriterio = 'si' | 'no' | 'parcial' | 'na';

export const RESPUESTA_LABEL: Record<RespuestaCriterio, string> = {
  si: 'Cumple', no: 'No cumple', parcial: 'Parcial', na: 'No aplica',
};

export type EstadoVerificacion = 'cumple' | 'parcial' | 'no_cumple';

export const ESTADO_VERIFICACION_CFG: Record<EstadoVerificacion, { label: string; color: string; bg: string }> = {
  cumple:     { label: 'Cumple',               color: 'text-emerald-700', bg: 'bg-emerald-100' },
  parcial:    { label: 'Cumplimiento parcial',  color: 'text-amber-700',   bg: 'bg-amber-100'    },
  no_cumple:  { label: 'No cumple',             color: 'text-red-700',     bg: 'bg-red-100'      },
};

export type RespuestasVerificacion = Record<string, RespuestaCriterio>;

export interface VerificacionFarmacia {
  id:         string;
  uid:        string;
  nit:        string;
  fecha:      string;
  responsable: string;
  respuestas: RespuestasVerificacion;
  hallazgos:  string;
  score:      number;
  capaId:     string | null;
  fechaCreacion: Timestamp | null;
}

export interface VerificacionFormData {
  fecha: string;
  responsable: string;
  respuestas: RespuestasVerificacion;
  hallazgos: string;
}

// Misma fórmula que auditScore.ts / infraestructuraTypes.ts
export function calcScoreVerificacion(respuestas: RespuestasVerificacion): number {
  const valores = CRITERIOS_FARMACIA.map(c => respuestas[c.id]).filter(Boolean);
  const si = valores.filter(v => v === 'si').length;
  const parcial = valores.filter(v => v === 'parcial').length;
  const na = valores.filter(v => v === 'na').length;
  const effective = valores.length - na;
  if (effective <= 0) return 100;
  return Math.round(((si + parcial * 0.5) / effective) * 100);
}

export function calcEstadoVerificacion(score: number, respuestas: RespuestasVerificacion): EstadoVerificacion {
  const tieneNoCumple = Object.values(respuestas).includes('no');
  if (score >= 85 && !tieneNoCumple) return 'cumple';
  if (score >= 70) return 'parcial';
  return 'no_cumple';
}
