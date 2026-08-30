// web/lib/interdependenciaTypes.ts
// Tipos para el módulo de Gestión de Interdependencia (red de prestadores)
// Base legal: Res. 1732/2026 — Estándar de Interdependencia (equivalente al
// Estándar 7 de la derogada Res. 3100/2019).
//
// El checklist de 8 criterios se toma TAL CUAL de web/data/auditData.ts
// (areasDB.urgencias → "urg-interdep", citado explícitamente como
// "Res. 3100/2019 Est. 7" — el mismo Estándar de Interdependencia), fuente
// única compartida con el módulo de Auditoría.
//
// Diseño: registro de convenios/red de prestadores (laboratorio, banco de
// sangre, imágenes diagnósticas, IPS de mayor complejidad, transporte
// asistencial…) con seguimiento de vigencia — mismo patrón de alertas que
// medicamentosTypes.ts — más verificación periódica contra el checklist.
//
// SIMPLIFICACIÓN CONOCIDA: el criterio q8 pide un registro remisión-por-
// remisión (paciente, desenlace, tiempo de traslado). Esta primera versión
// no modela ese log individual — solo el convenio marco con cada
// prestador — para no dispersar el alcance en la primera entrega. Si lo
// necesitas, es la extensión natural siguiente.

import type { Timestamp } from 'firebase/firestore';
import { areasDB } from '@/data/auditData';

const INTERDEP_AREA = areasDB.urgencias.find(a => a.id === 'urg-interdep');

export interface CriterioInterdependencia {
  id:    string;
  texto: string;
}

export const CRITERIOS_INTERDEPENDENCIA: CriterioInterdependencia[] =
  (INTERDEP_AREA?.q ?? []).map((texto, i) => ({ id: `c${i}`, texto }));

export const NORMA_INTERDEPENDENCIA = INTERDEP_AREA?.norm ?? 'Res. 1732/2026 — Estándar de Interdependencia';

// ── Convenios / red de prestadores ───────────────────────────────────────────

export type TipoServicioInterdependencia =
  | 'Laboratorio Clínico' | 'Banco de Sangre / Servicio Transfusional'
  | 'Imágenes Diagnósticas' | 'IPS de Mayor Complejidad (referencia)'
  | 'Transporte Asistencial / CRUE' | 'Otro apoyo diagnóstico o terapéutico';

export const TIPOS_SERVICIO_INTERDEPENDENCIA: TipoServicioInterdependencia[] = [
  'Laboratorio Clínico', 'Banco de Sangre / Servicio Transfusional',
  'Imágenes Diagnósticas', 'IPS de Mayor Complejidad (referencia)',
  'Transporte Asistencial / CRUE', 'Otro apoyo diagnóstico o terapéutico',
];

export type EstadoConvenio = 'vigente' | 'por_vencer' | 'vencido' | 'sin_convenio_formal';

export const ESTADO_CONVENIO_CFG: Record<EstadoConvenio, { label: string; color: string; bg: string }> = {
  vigente:              { label: 'Vigente',              color: 'text-emerald-700', bg: 'bg-emerald-100' },
  por_vencer:           { label: 'Por vencer',            color: 'text-amber-700',   bg: 'bg-amber-100'    },
  vencido:              { label: 'Vencido',               color: 'text-red-700',     bg: 'bg-red-100'      },
  sin_convenio_formal:  { label: 'Sin convenio formal',   color: 'text-gray-500',    bg: 'bg-gray-100'     },
};

// A diferencia de DIAS_ALERTA_VENCIMIENTO en medicamentosTypes.ts (que sí
// cita un criterio real del checklist), no hay ningún criterio ni norma que
// exija una ventana de alerta específica para el vencimiento de convenios.
// Por eso NO es una constante global fija: cada convenio define su propia
// ventana de alerta (campo diasAlerta), y este valor es solo el punto de
// partida sugerido al crear uno — un parámetro operativo, no un plazo legal.
export const DIAS_ALERTA_CONVENIO_DEFAULT = 60;

export interface ConvenioInterdependencia {
  id:      string;
  uid:     string;
  nit:     string;
  prestador: string;             // nombre del laboratorio/IPS/proveedor
  tipoServicio: TipoServicioInterdependencia;
  contacto: string;               // teléfono/correo/responsable de coordinación
  tieneConvenioFormal: boolean;
  vigenciaHasta: string | null;   // ISO date — vacío si no aplica (sin convenio formal)
  tiempoRespuestaAcordado: string; // texto libre: "60 min pruebas básicas", "24h disponible"…
  diasAlerta: number;             // ventana de alerta configurable por convenio (ver nota arriba)
  fechaCreacion: Timestamp | null;
  fechaActualizacion: Timestamp | null;
  // computed client-side
  _estado?: EstadoConvenio;
}

export interface ConvenioFormData {
  prestador: string;
  tipoServicio: TipoServicioInterdependencia;
  contacto: string;
  tieneConvenioFormal: boolean;
  vigenciaHasta: string;
  tiempoRespuestaAcordado: string;
  diasAlerta: number;
}

export const CONVENIO_EMPTY_FORM: ConvenioFormData = {
  prestador: '', tipoServicio: 'Laboratorio Clínico', contacto: '',
  tieneConvenioFormal: true, vigenciaHasta: '', tiempoRespuestaAcordado: '',
  diasAlerta: DIAS_ALERTA_CONVENIO_DEFAULT,
};

export function calcEstadoConvenio(
  tieneConvenioFormal: boolean, vigenciaHasta: string | null,
  diasAlerta: number = DIAS_ALERTA_CONVENIO_DEFAULT,
): EstadoConvenio {
  if (!tieneConvenioFormal) return 'sin_convenio_formal';
  if (!vigenciaHasta) return 'vigente'; // convenio formal sin fecha de vencimiento definida (indefinido)
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const venc = new Date(vigenciaHasta + 'T00:00:00');
  const dias = Math.round((venc.getTime() - hoy.getTime()) / 86_400_000);
  if (dias < 0) return 'vencido';
  if (dias <= diasAlerta) return 'por_vencer';
  return 'vigente';
}

// ── Verificación periódica del checklist de Interdependencia ────────────────

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

export interface VerificacionInterdependencia {
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

export function calcScoreVerificacion(respuestas: RespuestasVerificacion): number {
  const valores = CRITERIOS_INTERDEPENDENCIA.map(c => respuestas[c.id]).filter(Boolean);
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
