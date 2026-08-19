// web/lib/equipoTypes.ts
// Tipos TypeScript para el módulo CMMS — Equipos Biomédicos
// Base legal: Res. 1732/2026 (Tomo II — Estándar de Dotación), Decreto 4725/2005
// (registro sanitario / permiso de comercialización de equipos biomédicos).
//
// Criterios del Estándar de Dotación que este módulo digitaliza:
//   - Registro/inventario de equipos biomédicos con su condición sanitaria vigente.
//   - Programa de mantenimiento preventivo según recomendaciones del fabricante.
//   - Hoja de vida por equipo, con mantenimientos preventivos y correctivos.
//   - Mantenimiento ejecutado por talento humano profesional/tecnólogo/técnico.
//   - Capacitación del personal en el uso de dispositivos médicos que lo requieran.
//
// NOTA: la Res. 1732/2026 no detalla exigencias explícitas de calibración
// metrológica como criterio de habilitación independiente (puede regularse por
// fuera de la 1732 — Decreto 1471/2014, metrología legal SIC). No se modela
// como obligatorio hasta confirmar el texto completo del Tomo II.

import type { Timestamp } from 'firebase/firestore';

export type EquipoEstado = 'activo' | 'fuera_servicio' | 'baja';

export const EQUIPO_ESTADO_CFG: Record<EquipoEstado, { label: string; color: string; bg: string }> = {
  activo:         { label: 'Activo',          color: 'text-emerald-700', bg: 'bg-emerald-100' },
  fuera_servicio: { label: 'Fuera de servicio', color: 'text-amber-700',   bg: 'bg-amber-100'   },
  baja:           { label: 'Dado de baja',     color: 'text-gray-500',    bg: 'bg-gray-100'     },
};

export interface Equipo {
  id: string;
  uid: string;
  nit: string;
  nombre: string;               // "Monitor de signos vitales"
  marca: string;
  modelo: string;
  serie: string;
  servicioAsociado: string;     // Área/servicio donde opera (texto libre, como CAPAs.area)
  estado: EquipoEstado;
  registroSanitario: string;    // No. de registro sanitario o permiso de comercialización (Dec. 4725/2005)
  registroSanitarioVigenciaHasta: string; // ISO date "YYYY-MM-DD" — vacío si no aplica/no vence
  fechaAdquisicion: string;     // ISO date
  frecuenciaMantenimientoMeses: number; // programa de mantenimiento preventivo del fabricante
  personalCapacitado: string;   // nombres del personal capacitado en el uso (texto libre, separado por comas)
  // Denormalizado desde el último registro de mantenimientos/ (evita N+1 queries
  // en la lista) — se actualiza cada vez que se registra un mantenimiento.
  ultimoMantenimientoFecha: string | null;   // ISO date
  ultimoMantenimientoTipo: MantenimientoTipo | null;
  proximoMantenimiento: string | null;       // ISO date = ultimoMantenimientoFecha + frecuenciaMantenimientoMeses
  fechaCreacion: Timestamp | null;
  fechaActualizacion: Timestamp | null;
  // computed client-side
  _mantenimientoVencido?: boolean;
  _registroSanitarioVencido?: boolean;
}

export interface EquipoFormData {
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  servicioAsociado: string;
  estado: EquipoEstado;
  registroSanitario: string;
  registroSanitarioVigenciaHasta: string;
  fechaAdquisicion: string;
  frecuenciaMantenimientoMeses: number;
  personalCapacitado: string;
}

export const EQUIPO_EMPTY_FORM: EquipoFormData = {
  nombre: '',
  marca: '',
  modelo: '',
  serie: '',
  servicioAsociado: '',
  estado: 'activo',
  registroSanitario: '',
  registroSanitarioVigenciaHasta: '',
  fechaAdquisicion: '',
  frecuenciaMantenimientoMeses: 6,
  personalCapacitado: '',
};

// ── Hoja de vida — mantenimientos (subcolección equipos_biomedicos/{id}/mantenimientos) ──

export type MantenimientoTipo = 'preventivo' | 'correctivo';
export type ResponsablePerfil = 'profesional' | 'tecnologo' | 'tecnico';

export const RESPONSABLE_PERFIL_LABEL: Record<ResponsablePerfil, string> = {
  profesional: 'Profesional',
  tecnologo:   'Tecnólogo',
  tecnico:     'Técnico',
};

export interface Mantenimiento {
  id: string;
  tipo: MantenimientoTipo;
  fecha: string;                 // ISO date del mantenimiento
  responsableNombre: string;
  responsablePerfil: ResponsablePerfil;
  descripcion: string;
  fechaCreacion: Timestamp | null;
  registradoPor: string;         // nombre/email de quien registró el evento en NormaLis
}

export interface MantenimientoFormData {
  tipo: MantenimientoTipo;
  fecha: string;
  responsableNombre: string;
  responsablePerfil: ResponsablePerfil;
  descripcion: string;
}

export const MANTENIMIENTO_EMPTY_FORM: MantenimientoFormData = {
  tipo: 'preventivo',
  fecha: '',
  responsableNombre: '',
  responsablePerfil: 'tecnico',
  descripcion: '',
};
