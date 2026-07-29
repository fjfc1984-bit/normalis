// web/lib/indicadorTypes.ts
// Tipos TypeScript para el módulo de Indicadores de Calidad
// Base legal: Resolución 256/2016 — SOGCS / SISPRO

import type { Timestamp } from 'firebase/firestore';

// ── Dirección de la meta ─────────────────────────────────
export type MetaDir = 'gte' | 'lte' | 'eq'; // >=, <=, =

// ── Definición estática de un indicador del catálogo ────
export interface IndicadorDef {
  id: string;
  nombre: string;
  formula: string;
  tipo: 'resultado' | 'proceso';
  unidad: string;
  meta: string;          // texto display: "≥ 90", "≤ 5", "= 100"
  metaDir: MetaDir;
  metaNum: number;       // valor numérico para comparación
  grupo: string;
  normativa: string;
  periodicidad: 'mensual' | 'trimestral' | 'anual';
  descripcion: string;
}

// ── Registro de medición en Firestore ────────────────────
export interface IndicadorRegistro {
  docId: string;
  uid: string;
  nit: string;
  indicId: string;
  periodo: string;        // "YYYY-MM" o "YYYY-QN" o "YYYY"
  valor: string;          // string para flexibilidad; se parsea a float para cálculo
  observacion: string;
  fechaCreacion:    Timestamp | null;
  fechaActualizacion: Timestamp | null;
}

// ── Estado semáforo calculado ─────────────────────────────
export type Semaforo = 'cumple' | 'no_cumple' | 'sin_datos';

export interface IndicadorEstado {
  def: IndicadorDef;
  registros: IndicadorRegistro[];   // ordenados desc por periodo
  ultimo: IndicadorRegistro | null;
  valor: number | null;
  semaforo: Semaforo;
  cumple: boolean | null;
}

// ── Stats derivadas ──────────────────────────────────────
export interface IndicadorStats {
  total: number;
  conDatos: number;
  cumplen: number;
  noCumplen: number;
  sinDatos: number;
}

// ════════════════════════════════════════════════════════
//  CATÁLOGO — Res. 256/2016 Anexo 1 (14 indicadores trazadores)
// ════════════════════════════════════════════════════════
export const INDICADORES_CATALOGO: IndicadorDef[] = [
  {
    id: 'prop_queja',
    nombre: 'Proporción de pacientes que reportan haber sido tratados con respeto y dignidad',
    formula: '(Pacientes con trato digno / Total encuestados) × 100',
    tipo: 'resultado', unidad: '%', meta: '≥ 90', metaDir: 'gte', metaNum: 90,
    grupo: 'Experiencia del Paciente', normativa: 'Res. 256/2016 Art. 5',
    periodicidad: 'trimestral',
    descripcion: 'Mide la percepción del paciente sobre el trato recibido por el personal.',
  },
  {
    id: 'tasa_infeccion',
    nombre: 'Tasa de infecciones asociadas a la atención en salud (IAAS)',
    formula: '(N° infecciones IAAS / Total egresos) × 1000',
    tipo: 'resultado', unidad: 'por 1 000 egresos', meta: '≤ 10', metaDir: 'lte', metaNum: 10,
    grupo: 'Seguridad del Paciente', normativa: 'Res. 256/2016 · Res. 3100/2019 § 3.17',
    periodicidad: 'mensual',
    descripcion: 'Monitorea infecciones nosocomiales como proxy de higiene y protocolos de esterilización.',
  },
  {
    id: 'tasa_caida',
    nombre: 'Tasa de caídas de pacientes',
    formula: '(N° caídas / Total días-paciente) × 1000',
    tipo: 'resultado', unidad: 'por 1 000 días-pte', meta: '≤ 3', metaDir: 'lte', metaNum: 3,
    grupo: 'Seguridad del Paciente', normativa: 'Res. 256/2016 · Protocolo de Londres',
    periodicidad: 'mensual',
    descripcion: 'Evalúa la efectividad de los protocolos de prevención de caídas.',
  },
  {
    id: 'prop_ulceras',
    nombre: 'Proporción de pacientes con úlceras por presión (adquiridas en la institución)',
    formula: '(Pacientes con úlceras adquiridas / Total hospitalizados) × 100',
    tipo: 'resultado', unidad: '%', meta: '≤ 2', metaDir: 'lte', metaNum: 2,
    grupo: 'Seguridad del Paciente', normativa: 'Res. 256/2016',
    periodicidad: 'mensual',
    descripcion: 'Refleja calidad del cuidado de enfermería en pacientes de larga estadía.',
  },
  {
    id: 'tasa_reingreso',
    nombre: 'Tasa de reingreso no planeado antes de 30 días',
    formula: '(Reingresos no planeados ≤ 30 días / Total egresos) × 100',
    tipo: 'resultado', unidad: '%', meta: '≤ 5', metaDir: 'lte', metaNum: 5,
    grupo: 'Continuidad y Efectividad', normativa: 'Res. 256/2016',
    periodicidad: 'mensual',
    descripcion: 'Mide la efectividad del alta y la coordinación del cuidado post-hospitalario.',
  },
  {
    id: 'prop_cx_cancelada',
    nombre: 'Proporción de cirugías canceladas',
    formula: '(Cirugías canceladas / Cirugías programadas) × 100',
    tipo: 'proceso', unidad: '%', meta: '≤ 5', metaDir: 'lte', metaNum: 5,
    grupo: 'Acceso y Oportunidad', normativa: 'Res. 256/2016',
    periodicidad: 'mensual',
    descripcion: 'Evalúa eficiencia del proceso quirúrgico y disponibilidad de recursos.',
  },
  {
    id: 'oportunidad_cx',
    nombre: 'Oportunidad de la cirugía programada (días de espera)',
    formula: 'Promedio de días entre solicitud y realización de cirugía electiva',
    tipo: 'proceso', unidad: 'días', meta: '≤ 30', metaDir: 'lte', metaNum: 30,
    grupo: 'Acceso y Oportunidad', normativa: 'Res. 256/2016 · Res. 1552/2013',
    periodicidad: 'mensual',
    descripcion: 'Tiempo de espera para cirugía electiva desde la solicitud médica.',
  },
  {
    id: 'oportunidad_consulta',
    nombre: 'Oportunidad de la consulta médica general (días de espera)',
    formula: 'Promedio de días entre solicitud y consulta efectiva',
    tipo: 'proceso', unidad: 'días', meta: '≤ 3', metaDir: 'lte', metaNum: 3,
    grupo: 'Acceso y Oportunidad', normativa: 'Res. 256/2016 · Res. 1552/2013',
    periodicidad: 'mensual',
    descripcion: 'Oportunidad de acceso a consulta médica en el primer nivel de atención.',
  },
  {
    id: 'prop_transfusion',
    nombre: 'Proporción de eventos adversos relacionados con transfusión',
    formula: '(Eventos adversos transfusionales / Total transfusiones) × 1000',
    tipo: 'resultado', unidad: 'por 1 000 transf.', meta: '≤ 1', metaDir: 'lte', metaNum: 1,
    grupo: 'Seguridad del Paciente', normativa: 'Res. 256/2016 · Hemovigilancia INS',
    periodicidad: 'mensual',
    descripcion: 'Monitorea seguridad transfusional y cumplimiento del proceso hemoterápico.',
  },
  {
    id: 'prop_complicacion_cx',
    nombre: 'Proporción de complicaciones quirúrgicas',
    formula: '(Cirugías con complicación / Total cirugías) × 100',
    tipo: 'resultado', unidad: '%', meta: '≤ 3', metaDir: 'lte', metaNum: 3,
    grupo: 'Seguridad del Paciente', normativa: 'Res. 256/2016',
    periodicidad: 'mensual',
    descripcion: 'Evalúa la seguridad del proceso quirúrgico y la competencia del equipo.',
  },
  {
    id: 'mortalidad_intrahospitalaria',
    nombre: 'Tasa de mortalidad intrahospitalaria',
    formula: '(N° muertes intrahospitalarias / Total egresos) × 100',
    tipo: 'resultado', unidad: '%', meta: '≤ 2', metaDir: 'lte', metaNum: 2,
    grupo: 'Resultado Clínico', normativa: 'Res. 256/2016',
    periodicidad: 'mensual',
    descripcion: 'Tasa general de mortalidad como indicador de resultado de la atención.',
  },
  {
    id: 'prop_consentimiento',
    nombre: 'Proporción de cirugías con consentimiento informado diligenciado',
    formula: '(Cirugías con CI firmado / Total cirugías) × 100',
    tipo: 'proceso', unidad: '%', meta: '= 100', metaDir: 'eq', metaNum: 100,
    grupo: 'Derechos del Paciente', normativa: 'Res. 256/2016 · Ley 1751/2015 Art. 10',
    periodicidad: 'mensual',
    descripcion: 'Cumplimiento del derecho a la información y consentimiento del paciente.',
  },
  {
    id: 'satisfaccion_usuario',
    nombre: 'Índice de satisfacción global del usuario',
    formula: '(Usuarios satisfechos o muy satisfechos / Total encuestados) × 100',
    tipo: 'resultado', unidad: '%', meta: '≥ 80', metaDir: 'gte', metaNum: 80,
    grupo: 'Experiencia del Paciente', normativa: 'Res. 256/2016 · Res. 1446/2006',
    periodicidad: 'trimestral',
    descripcion: 'Nivel de satisfacción global con la atención recibida.',
  },
  {
    id: 'prop_registro_completo',
    nombre: 'Proporción de historias clínicas con registro completo',
    formula: '(HC con componentes obligatorios / Total HC auditadas) × 100',
    tipo: 'proceso', unidad: '%', meta: '≥ 95', metaDir: 'gte', metaNum: 95,
    grupo: 'Calidad del Registro', normativa: 'Res. 256/2016 · Res. 1995/1999',
    periodicidad: 'trimestral',
    descripcion: 'Calidad documental de la historia clínica como soporte de la atención.',
  },
];

// ── Grupos únicos (orden de aparición) ──────────────────
export const INDICADOR_GRUPOS: string[] = [
  ...new Set(INDICADORES_CATALOGO.map(i => i.grupo)),
];

// ── Calcular estado de un indicador ─────────────────────
export function calcularEstado(
  def: IndicadorDef,
  registros: IndicadorRegistro[],
): IndicadorEstado {
  const sorted = [...registros].sort((a, b) => b.periodo.localeCompare(a.periodo));
  const ultimo  = sorted[0] ?? null;
  const valor   = ultimo ? parseFloat(ultimo.valor) : null;

  let semaforo: Semaforo = 'sin_datos';
  let cumple: boolean | null = null;

  if (valor !== null && !isNaN(valor)) {
    if      (def.metaDir === 'gte') cumple = valor >= def.metaNum;
    else if (def.metaDir === 'lte') cumple = valor <= def.metaNum;
    else if (def.metaDir === 'eq')  cumple = valor === def.metaNum;
    semaforo = cumple ? 'cumple' : 'no_cumple';
  }

  return { def, registros: sorted, ultimo, valor, semaforo, cumple };
}

export function calcularStats(estados: IndicadorEstado[]): IndicadorStats {
  const total     = estados.length;
  const conDatos  = estados.filter(e => e.semaforo !== 'sin_datos').length;
  const cumplen   = estados.filter(e => e.semaforo === 'cumple').length;
  const noCumplen = estados.filter(e => e.semaforo === 'no_cumple').length;
  return { total, conDatos, cumplen, noCumplen, sinDatos: total - conDatos };
}
