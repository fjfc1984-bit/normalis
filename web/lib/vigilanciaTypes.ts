// web/lib/vigilanciaTypes.ts
// Tipos TypeScript para el módulo de Vigilancia Sanitaria — farmacovigilancia,
// tecnovigilancia y reactivovigilancia.
//
// Base legal: Res. 1732/2026 (Tomo II — Estándar de Medicamentos, Dispositivos
// Médicos, Insumos y Otras Tecnologías en Salud, Numeral 6): exige información
// documentada de la planeación y ejecución de los programas de
// farmacovigilancia, tecnovigilancia y reactivovigilancia.
//
// Cada programa tiene su propia norma y plazos de reporte a INVIMA:
//   - Farmacovigilancia   → Circular 48 de 2020 MSPS, num. 2.4.2:
//       evento adverso serio: 72 horas desde su conocimiento.
//       evento adverso no serio: consolidado mensual (5 días hábiles tras
//       vencer el mes que se informa).
//   - Tecnovigilancia     → Resolución 4816 de 2008, Art. 15-16:
//       evento adverso serio: 72 horas. no serio: consolidado trimestral.
//   - Reactivovigilancia  → Resolución 2020007532 de 2020 (Programa Nacional
//       de Reactivovigilancia): reporte inmediato, antes de 5 días calendario
//       desde el conocimiento del evento (fuente secundaria — no se verificó
//       contra el texto completo de la resolución; confirmar con INVIMA o la
//       Secretaría de Salud territorial si tu operación reporta reactivos).
//
// NOTA: para eventos "no serios" (consolidación periódica mensual/trimestral)
// este módulo NO calcula una fecha límite individual por evento — solo se
// calcula plazo de reporte para eventos SERIOS, donde la norma da un plazo
// fijo en días desde el conocimiento del evento.

import type { Timestamp } from 'firebase/firestore';

export type TipoVigilancia = 'farmacovigilancia' | 'tecnovigilancia' | 'reactivovigilancia';

export const TIPO_VIGILANCIA_CFG: Record<TipoVigilancia, { label: string; icon: string; norma: string; plazoSerioDias: number; plazoNoSerio: string }> = {
  farmacovigilancia: {
    label: 'Farmacovigilancia', icon: '💊', norma: 'Circular 48/2020 MSPS',
    plazoSerioDias: 3, plazoNoSerio: 'Consolidado mensual (5 días hábiles tras vencer el mes)',
  },
  tecnovigilancia: {
    label: 'Tecnovigilancia', icon: '🩺', norma: 'Res. 4816/2008 INVIMA',
    plazoSerioDias: 3, plazoNoSerio: 'Consolidado trimestral',
  },
  reactivovigilancia: {
    label: 'Reactivovigilancia', icon: '🧪', norma: 'Res. 2020007532/2020 INVIMA',
    plazoSerioDias: 5, plazoNoSerio: 'Reporte inmediato (mismo plazo aplica a todo evento — 5 días calendario)',
  },
};

export type Severidad = 'serio' | 'no_serio';

export const SEVERIDAD_LABEL: Record<Severidad, string> = {
  serio: 'Serio',
  no_serio: 'No serio',
};

export type EstadoReporte = 'pendiente' | 'reportado';

export const ESTADO_REPORTE_LABEL: Record<EstadoReporte, string> = {
  pendiente: 'Pendiente de reportar',
  reportado: 'Reportado a INVIMA',
};

export interface EventoVigilancia {
  id: string;
  uid: string;
  nit: string;
  tipoVigilancia: TipoVigilancia;
  productoNombre: string;        // medicamento / dispositivo / reactivo involucrado
  descripcionEvento: string;
  fechaOcurrencia: string;       // ISO date — cuándo ocurrió el evento
  fechaConocimiento: string;     // ISO date — cuándo se enteró la IPS (de aquí cuentan los plazos)
  severidad: Severidad;
  pacienteAfectado: boolean;     // hubo o no paciente afectado (sin datos identificables del paciente)
  accionesTomadas: string;
  responsableReporte: string;    // referente que gestiona el caso
  estadoReporte: EstadoReporte;
  fechaReporteInvima: string | null;  // ISO date — cuándo se reportó realmente a INVIMA
  radicadoInvima: string;        // número de radicado/confirmación INVIMA, si ya se reportó
  fechaCreacion: Timestamp | null;
  fechaActualizacion: Timestamp | null;
  // computed client-side
  _fechaLimiteReporte?: string | null; // solo para severidad === 'serio'
  _reporteVencido?: boolean;
}

export interface EventoVigilanciaFormData {
  tipoVigilancia: TipoVigilancia;
  productoNombre: string;
  descripcionEvento: string;
  fechaOcurrencia: string;
  fechaConocimiento: string;
  severidad: Severidad;
  pacienteAfectado: boolean;
  accionesTomadas: string;
  responsableReporte: string;
  estadoReporte: EstadoReporte;
  fechaReporteInvima: string;
  radicadoInvima: string;
}

export const EVENTO_VIGILANCIA_EMPTY_FORM: EventoVigilanciaFormData = {
  tipoVigilancia: 'tecnovigilancia',
  productoNombre: '',
  descripcionEvento: '',
  fechaOcurrencia: '',
  fechaConocimiento: '',
  severidad: 'no_serio',
  pacienteAfectado: false,
  accionesTomadas: '',
  responsableReporte: '',
  estadoReporte: 'pendiente',
  fechaReporteInvima: '',
  radicadoInvima: '',
};
