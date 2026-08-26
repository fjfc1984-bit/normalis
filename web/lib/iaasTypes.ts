// web/lib/iaasTypes.ts
//
// Módulo de Vigilancia Epidemiológica IAAS (Infecciones Asociadas a la
// Atención en Salud) — apoya la notificación obligatoria a SIVIGILA de los
// dos eventos de vigilancia rutinaria que aplican a IPS con UCI y/o
// servicios quirúrgicos/gineco-obstétricos.
//
// IMPORTANTE — qué es y qué NO es este módulo:
// Este módulo NO notifica a SIVIGILA directamente (SIVIGILA se notifica a
// través del aplicativo web oficial del INS/Secretaría de Salud). Es una
// herramienta de SEGUIMIENTO Y EVIDENCIA: lleva el registro interno de
// casos y denominadores, calcula el plazo aproximado de notificación, y
// deja trazabilidad de que la IPS notificó a tiempo — útil como soporte
// documental ante una visita de habilitación o una auditoría de SuperSalud.
//
// Base legal: Decreto 3518/2006 (crea el SIVIGILA) · Resolución 1732/2026
// § 3.17 (antes Res. 3100/2019), que exige vigilancia de IAAS como parte
// de Procesos Prioritarios.
//
// Fuentes primarias verificadas directamente en los protocolos oficiales
// del INS (Instituto Nacional de Salud) — no se asumió ningún dato:
//   - IAD:   https://www.ins.gov.co/buscador-eventos/Lineamientos/Pro_IAD%202024.pdf
//            "Protocolo de Vigilancia en Salud Pública de Infecciones
//            Asociadas a Dispositivos — Versión 7" (INS, 28 ago. 2024)
//   - IAPMQ: https://www.ins.gov.co/buscador-eventos/Lineamientos/Pro_IAPMQ.pdf
//            "Protocolo de infecciones asociadas a procedimientos
//            médico quirúrgicos — Versión 5" (INS, 2024)
//
// VACÍO LEGAL / ADVERTENCIA: los protocolos del INS se actualizan
// periódicamente (nuevas versiones cada 1-2 años) — valida siempre contra
// la versión vigente publicada en ins.gov.co antes de una notificación
// real. Este módulo no reemplaza el aplicativo oficial SIVIGILA ni el
// criterio del equipo de epidemiología/infectología de la IPS.

// ── Tipos base ────────────────────────────────────────────────────────────
export type IAASTipo = 'IAD' | 'IAPMQ';

export type IAASEstadoNotificacion = 'pendiente' | 'notificado' | 'vencido';

export interface IAASSubtipo {
  id:    string;
  label: string;
}

export interface IAASEventoDef {
  tipo:                   IAASTipo;
  nombre:                 string;
  codigoIndividual:       number;   // ficha SIVIGILA de caso individual confirmado
  codigoColectivo:        number;   // ficha SIVIGILA de denominadores / consolidado mensual
  serviciosQueObligan:    string[]; // qué UPGD (servicios habilitados) obligan a notificar este evento
  subtipos:               IAASSubtipo[];
  plazoIndividualTexto:   string;   // periodicidad de notificación de casos, en texto oficial
  plazoColectivoTexto:    string;   // periodicidad de notificación de denominadores, en texto oficial
  protocolo:              string;   // nombre oficial completo + versión + fecha
  fuenteUrl:               string;
}

// ── Catálogo de eventos (verificado — ver fuentes en el encabezado) ───────
export const IAAS_EVENTOS: Record<IAASTipo, IAASEventoDef> = {
  IAD: {
    tipo: 'IAD',
    nombre: 'Infecciones Asociadas a Dispositivos',
    codigoIndividual: 357,
    codigoColectivo: 359,
    serviciosQueObligan: ['Unidad de Cuidado Intensivo (UCI)'],
    subtipos: [
      { id: 'NAV',     label: 'Neumonía Asociada a Ventilador (NAV)' },
      { id: 'ITS-AC',  label: 'Infección del Torrente Sanguíneo Asociada a Catéter (ITS-AC)' },
      { id: 'ISTU-AC', label: 'Infección Sintomática del Tracto Urinario Asociada a Catéter (ISTU-AC)' },
    ],
    plazoIndividualTexto: 'Misma semana epidemiológica en que se confirma el caso (ficha 357)',
    plazoColectivoTexto:  'Denominadores (días-dispositivo) hasta el lunes de la 2ª semana siguiente al mes vigilado (ficha 359)',
    protocolo: 'Protocolo de Vigilancia en Salud Pública de Infecciones Asociadas a Dispositivos — Versión 7 (INS, 28 ago. 2024)',
    fuenteUrl: 'https://www.ins.gov.co/buscador-eventos/Lineamientos/Pro_IAD%202024.pdf',
  },
  IAPMQ: {
    tipo: 'IAPMQ',
    nombre: 'Infecciones Asociadas a Procedimientos Médico-Quirúrgicos',
    codigoIndividual: 352,
    codigoColectivo: 362,
    serviciosQueObligan: ['Cirugía', 'Ginecobstetricia', 'Cirugía Cardiovascular', 'Urgencias', 'Consulta Externa'],
    subtipos: [
      { id: 'isq-superficial',      label: 'Infección de Sitio Quirúrgico — superficial' },
      { id: 'isq-profunda',         label: 'Infección de Sitio Quirúrgico — profunda' },
      { id: 'isq-organo-espacio',   label: 'Infección de Sitio Quirúrgico — órgano/espacio' },
      { id: 'endometritis-vaginal', label: 'Endometritis puerperal — parto vaginal' },
      { id: 'endometritis-cesarea', label: 'Endometritis puerperal — cesárea' },
    ],
    plazoIndividualTexto: 'Semanal — ficha 352 por cada caso confirmado',
    plazoColectivoTexto:  'Consolidado mensual de procedimientos realizados hasta el lunes de la 2ª semana siguiente al mes (ficha 362)',
    protocolo: 'Protocolo de infecciones asociadas a procedimientos médico quirúrgicos — Versión 5 (INS, 2024)',
    fuenteUrl: 'https://www.ins.gov.co/buscador-eventos/Lineamientos/Pro_IAPMQ.pdf',
  },
};

export const IAAS_TIPOS: IAASTipo[] = ['IAD', 'IAPMQ'];

// Procedimientos vigilados bajo IAPMQ — usado como catálogo de referencia
// en el consolidado mensual (denominador = cuántos de estos se realizaron).
export const IAPMQ_PROCEDIMIENTOS_VIGILADOS: string[] = [
  'Cesárea',
  'Parto vaginal',
  'Colecistectomía',
  'Herniorrafía',
  'Revascularización miocárdica',
];

// ── Registro de un caso individual (ficha 357 / 352) ──────────────────────
export interface IAASCaso {
  id:                     string;   // Firestore doc ID
  uid:                    string;
  nit:                    string;
  tipo:                   IAASTipo;
  subtipo:                string;   // debe existir en IAAS_EVENTOS[tipo].subtipos
  servicio:                string;   // servicio donde ocurrió (UCI, Cirugía, etc.)
  fechaConfirmacion:      string;   // ISO yyyy-mm-dd — fecha en que se confirmó el caso
  // Dato mínimo de identificación — NUNCA nombre completo ni cédula (Ley
  // 1581/2012, Habeas Data): este módulo es evidencia interna de
  // seguimiento, no el canal de notificación oficial a SIVIGILA (que sí
  // recoge datos completos del paciente en su propio aplicativo).
  pacienteReferencia?:     string;   // ej. iniciales o consecutivo interno de HC
  observaciones?:          string;
  estadoNotificacion:      IAASEstadoNotificacion;
  fechaNotificacionReal?:  string;   // ISO — cuándo se notificó realmente en el aplicativo SIVIGILA
  creadoEn:                number;   // timestamp ms
}

// ── Consolidado mensual de denominadores (ficha 359 / 362) ────────────────
export interface IAASDenominador {
  id:                     string;
  uid:                    string;
  nit:                    string;
  tipo:                   IAASTipo;
  periodo:                string;   // "YYYY-MM"
  // IAD: días-dispositivo (días-ventilador, días-catéter central, días-catéter urinario)
  // IAPMQ: número de procedimientos realizados por tipo
  valores:                Record<string, number>;
  notificacionNegativa:   boolean;  // true si no hubo casos ese mes (igual debe notificarse)
  estadoNotificacion:     IAASEstadoNotificacion;
  fechaNotificacionReal?: string;
  creadoEn:               number;
}

// ── Cálculo de vencimiento aproximado de notificación individual ─────────
//
// VACÍO LEGAL: el SIVIGILA notifica por "semana epidemiológica" (domingo a
// sábado, numeradas según el calendario epidemiológico oficial del INS,
// publicado cada año) — este módulo NO reproduce ese calendario exacto
// porque no hay una fuente embebida en la app para calcularlo con certeza
// para cualquier año. En su lugar se usa una aproximación conservadora: el
// sábado que cierra la semana calendario (domingo-sábado) que contiene la
// fecha de confirmación. Para el plazo exacto según el calendario oficial
// de semanas epidemiológicas, valida contra el calendario que el INS
// publica cada año en ins.gov.co.
export function calcularVencimientoIAASCaso(fechaConfirmacionISO: string): number {
  const fecha = new Date(`${fechaConfirmacionISO}T00:00:00`);
  const dow = fecha.getDay(); // 0 = domingo ... 6 = sábado
  const diasHastaSabado = 6 - dow;
  const vencimiento = new Date(fecha);
  vencimiento.setDate(vencimiento.getDate() + diasHastaSabado);
  vencimiento.setHours(23, 59, 59, 999);
  return vencimiento.getTime();
}

// Vencimiento del consolidado mensual: lunes de la 2ª semana siguiente al
// mes vigilado (texto oficial verificado en ambos protocolos). Se calcula
// como: primer día del mes siguiente al período + 8 días, ajustado al
// lunes de esa semana. Igual que arriba, esto es una aproximación
// calendario — valida el lunes exacto contra el calendario epidemiológico
// oficial si el plazo está por vencer.
export function calcularVencimientoIAASDenominador(periodoYYYYMM: string): number {
  const [anioStr, mesStr] = periodoYYYYMM.split('-');
  const anio = parseInt(anioStr, 10);
  const mes  = parseInt(mesStr, 10); // 1-12
  // Primer día del mes siguiente al período vigilado
  const inicioMesSiguiente = new Date(anio, mes, 1); // mes (0-index) == mes siguiente
  // Avanzar al lunes de la 2ª semana: primer lunes + 7 días
  const fecha = new Date(inicioMesSiguiente);
  while (fecha.getDay() !== 1) fecha.setDate(fecha.getDate() + 1); // primer lunes
  fecha.setDate(fecha.getDate() + 7); // lunes de la semana siguiente (2ª semana)
  fecha.setHours(23, 59, 59, 999);
  return fecha.getTime();
}

// Campos del consolidado mensual por tipo de evento — denominadores
// (exposición al riesgo) + conteo de casos del mes, tal como los piden las
// fichas 359 (IAD) y 362 (IAPMQ).
export const IAAS_CAMPOS_DENOMINADOR: Record<IAASTipo, string[]> = {
  IAD: [
    'Días de ventilador (paciente-día)',
    'Días de catéter central (paciente-día)',
    'Días de catéter urinario (paciente-día)',
    'Casos NAV en el mes',
    'Casos ITS-AC en el mes',
    'Casos ISTU-AC en el mes',
  ],
  IAPMQ: [
    ...IAPMQ_PROCEDIMIENTOS_VIGILADOS.map(p => `N.º ${p} realizadas`),
    'Casos ISQ en el mes',
    'Casos endometritis puerperal en el mes',
  ],
};

export const IAAS_ESTADO_COLOR: Record<IAASEstadoNotificacion, { bg: string; text: string }> = {
  pendiente:  { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  notificado: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  vencido:    { bg: 'bg-red-100',     text: 'text-red-700'     },
};
