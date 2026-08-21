// web/lib/proaTypes.ts
// Tipos y datos de referencia para el módulo PROA (Programa de Optimización
// de Antimicrobianos).
//
// Base legal: Resolución 2471 de 2022 MSPS (Lineamientos Técnicos PROA y
// control de IAAS) + Plan Nacional de Respuesta a la Resistencia
// Antimicrobiana 2025-2030 + Res. 1732/2026 (nuevo manual de habilitación,
// reemplaza Res. 3100/2019 — Tomo II, estándar de Procesos Prioritarios).
//
// Elementos agregados a partir de investigación sobre lo que las
// Secretarías de Salud territoriales verifican HOY en la práctica
// (además del texto normativo):
//   - Conformación del equipo PROA diferenciada por nivel de complejidad
//     (Art. 15 y Tabla 2 de la Res. 2471/2022). NOTA DE CONFIANZA: el
//     detalle exacto de conformación por nivel se tomó de una síntesis de
//     la resolución, no de la Tabla 2 original letra por letra — si su IPS
//     tiene dudas sobre el equipo mínimo exacto para su nivel, verifique
//     directamente con la Secretaría de Salud departamental/distrital.
//   - DOT (Duración de Terapia) como indicador obligatorio junto a DDD
//     (num. 2.2.3 de la resolución exige monitorear ambos).
//   - IAAS por microorganismos resistentes (BLEE, AmpC, carbapenemasas,
//     etc.) — indicador explícito del art. 20.6, ausente del módulo previo.
//   - Registro operativo de autorización previa para antibióticos
//     restringidos (carbapenémicos y colistina, art. 2.3) — las auditorías
//     territoriales piden ver el registro real de autorizaciones, no solo
//     la política documentada.
//   - Informe anual del programa con estado de envío a la Secretaría de
//     Salud territorial (art. 20.6: el informe se socializa "institucional
//     y territorialmente"; art. 12.5: las Secretarías consolidan reportes
//     de las IPS hacia el Ministerio).
//   - Fases de implementación del programa (num. 2.2: preimplementación,
//     evaluación inicial, ejecución, evaluación de la ejecución, planes de
//     mejora) como vista de madurez complementaria al checklist de ítems.

import type { Timestamp } from 'firebase/firestore';

// ════════════════════════════════════════════════════════════════════════
// Nivel de complejidad de la IPS
// ════════════════════════════════════════════════════════════════════════
export type NivelComplejidad = 'I' | 'II' | 'III';

export const NIVEL_COMPLEJIDAD_LABEL: Record<NivelComplejidad, string> = {
  I: 'Nivel I — Baja complejidad',
  II: 'Nivel II — Mediana complejidad',
  III: 'Nivel III — Alta complejidad',
};

export const NIVEL_COMPLEJIDAD_ORDEN: Record<NivelComplejidad, number> = { I: 1, II: 2, III: 3 };

// ════════════════════════════════════════════════════════════════════════
// Checklist de madurez PROA (por categoría, cada ítem etiquetado con el
// nivel de complejidad mínimo desde el cual aplica)
// ════════════════════════════════════════════════════════════════════════
export interface ChecklistItem {
  id: number; // ESTABLE — nunca reordenar/reciclar. El checklist guardado en Firestore
              // usa `${categoria}-${id}` como llave; cambiar un id existente reatribuye
              // silenciosamente respuestas guardadas a otro ítem. Los ítems nuevos SIEMPRE
              // se agregan al final de cada categoría con el siguiente id disponible.
  texto: string;
  nivelMinimo: NivelComplejidad; // aplica desde este nivel en adelante (I aplica a todos)
}

export interface ChecklistCategoria {
  categoria: string;
  items: ChecklistItem[];
}

export const CHECKLIST_PROA: ChecklistCategoria[] = [
  {
    categoria: 'Estructura del Equipo PROA',
    items: [
      { id: 0, texto: 'Existe un médico líder PROA designado formalmente', nivelMinimo: 'I' },
      { id: 1, texto: 'Existe un químico farmacéutico o regente de farmacia vinculado al equipo PROA', nivelMinimo: 'I' },
      { id: 2, texto: 'El equipo tiene reuniones periódicas documentadas (mínimo mensual)', nivelMinimo: 'I' },
      { id: 3, texto: 'El equipo PROA cuenta con apoyo de bacteriología/microbiología clínica (propia o por convenio)', nivelMinimo: 'I' },
      { id: 4, texto: 'Se cuenta con médico infectólogo, o internista/pediatra/médico familiar con formación específica en PROA, vinculado formalmente', nivelMinimo: 'II' },
      { id: 5, texto: 'Existe un epidemiólogo vinculado formalmente al equipo PROA', nivelMinimo: 'II' },
      { id: 6, texto: 'Existe un líder de capacitación del equipo PROA', nivelMinimo: 'II' },
      { id: 7, texto: 'Se cuenta con especialista en enfermedades infecciosas dedicado al programa', nivelMinimo: 'III' },
      { id: 8, texto: 'El equipo PROA articula representantes de las especialidades clínicas de mayor consumo de antimicrobianos (UCI, cirugía, oncología, etc.)', nivelMinimo: 'III' },
    ],
  },
  {
    categoria: 'Políticas y Procedimientos',
    items: [
      { id: 0, texto: 'Existe una lista institucional de antimicrobianos de acceso restringido', nivelMinimo: 'I' },
      { id: 1, texto: 'Existe una política de autorización previa para carbapenémicos y colistina', nivelMinimo: 'I' },
      { id: 2, texto: 'Existe una guía de terapia antibiótica empírica institucional actualizada (≤3 años)', nivelMinimo: 'I' },
      { id: 3, texto: 'Existe un procedimiento de desescalada y suspensión de antimicrobianos', nivelMinimo: 'I' },
      { id: 4, texto: 'Se han socializado las guías con los servicios prescriptores', nivelMinimo: 'I' },
      { id: 5, texto: 'Existen algoritmos diagnósticos y terapéuticos basados en epidemiología local', nivelMinimo: 'II' },
      { id: 6, texto: 'Se cuenta con sistema de apoyo a decisiones clínicas (manual o computarizado) para prescripción de antimicrobianos', nivelMinimo: 'II' },
    ],
  },
  {
    categoria: 'Indicadores y Vigilancia',
    items: [
      { id: 0, texto: 'Se monitorea el consumo de antimicrobianos en DDD/100 camas-día', nivelMinimo: 'I' },
      { id: 1, texto: 'Se generan informes de consumo mensuales por servicio', nivelMinimo: 'I' },
      { id: 2, texto: 'Se realiza seguimiento a los perfiles de sensibilidad (antibiograma acumulado)', nivelMinimo: 'I' },
      { id: 3, texto: 'Se miden tasas de infecciones asociadas al cuidado de la salud (IACS)', nivelMinimo: 'I' },
      { id: 4, texto: 'Se reportan los indicadores al comité de infecciones y a gerencia', nivelMinimo: 'I' },
      { id: 5, texto: 'Se monitorea la Duración de Terapia (DOT) de los antimicrobianos trazadores', nivelMinimo: 'I' },
      { id: 6, texto: 'Se registran las IAAS causadas por microorganismos resistentes (BLEE, AmpC, carbapenemasas)', nivelMinimo: 'II' },
    ],
  },
  {
    categoria: 'Educación y Cultura',
    items: [
      { id: 0, texto: 'Se realizan capacitaciones al personal prescriptor (mínimo 1 al año)', nivelMinimo: 'I' },
      { id: 1, texto: 'Existe retroalimentación a los prescriptores sobre sus patrones de uso', nivelMinimo: 'I' },
      { id: 2, texto: 'Se promueve la toma de cultivos antes de iniciar antimicrobiano empírico', nivelMinimo: 'I' },
      { id: 3, texto: 'Existe educación documentada a pacientes/familias sobre uso apropiado de antimicrobianos', nivelMinimo: 'II' },
    ],
  },
  {
    categoria: 'Registro e Historia Clínica',
    items: [
      { id: 0, texto: 'Se documenta la indicación del antimicrobiano en la historia clínica', nivelMinimo: 'I' },
      { id: 1, texto: 'Se documenta la duración planificada del tratamiento', nivelMinimo: 'I' },
      { id: 2, texto: 'Se realizan notas de revisión a las 48-72h del inicio del antimicrobiano', nivelMinimo: 'I' },
      { id: 3, texto: 'Se registran las intervenciones del equipo PROA con respuesta del prescriptor', nivelMinimo: 'I' },
    ],
  },
  {
    categoria: 'Reporte Institucional y Territorial',
    items: [
      { id: 0, texto: 'Se elabora informe anual del desarrollo del programa PROA', nivelMinimo: 'I' },
      { id: 1, texto: 'El informe anual se socializa institucionalmente (comité de infecciones, gerencia)', nivelMinimo: 'I' },
      { id: 2, texto: 'El informe anual se remite a la Secretaría de Salud territorial competente', nivelMinimo: 'I' },
    ],
  },
];

export function checklistParaNivel(nivel: NivelComplejidad): ChecklistCategoria[] {
  const orden = NIVEL_COMPLEJIDAD_ORDEN[nivel];
  return CHECKLIST_PROA.map(cat => ({
    categoria: cat.categoria,
    items: cat.items.filter(it => NIVEL_COMPLEJIDAD_ORDEN[it.nivelMinimo] <= orden),
  })).filter(cat => cat.items.length > 0);
}

// ════════════════════════════════════════════════════════════════════════
// Fases de implementación del programa (num. 2.2 Res. 2471/2022)
// ════════════════════════════════════════════════════════════════════════
export type FaseImplementacion = 'preimplementacion' | 'evaluacion_inicial' | 'ejecucion' | 'evaluacion_ejecucion' | 'planes_mejora';

export const FASES_PROA: Array<{ key: FaseImplementacion; label: string; desc: string }> = [
  { key: 'preimplementacion', label: '1. Preimplementación', desc: 'Socialización, adopción de la política institucional, designación del equipo, garantía de capacidad' },
  { key: 'evaluacion_inicial', label: '2. Evaluación inicial', desc: 'Línea base institucional de consumo de antimicrobianos y patrones de prescripción' },
  { key: 'ejecucion', label: '3. Ejecución', desc: 'Implementación de educación, guías, algoritmos y sistemas de apoyo a decisiones clínicas' },
  { key: 'evaluacion_ejecucion', label: '4. Evaluación de la ejecución', desc: 'Monitoreo periódico de indicadores (DDD, DOT, IAAS resistentes) y del programa' },
  { key: 'planes_mejora', label: '5. Planes de mejora', desc: 'Ajustes y acciones correctivas según los hallazgos del monitoreo' },
];

// ════════════════════════════════════════════════════════════════════════
// Datos de referencia compartidos
// ════════════════════════════════════════════════════════════════════════
export const SERVICIOS = ['UCI Adultos', 'UCI Pediátrica', 'Medicina Interna', 'Cirugía', 'Urgencias', 'Pediatría', 'Ginecología', 'Oncología', 'Neonatología'];

export interface AntimicrobianoRef { nombre: string; grupo: string; watch: boolean; restringido: boolean; }

export const ANTIMICROBIANOS_TRAZADORES: AntimicrobianoRef[] = [
  { nombre: 'Meropenem', grupo: 'Carbapenémicos', watch: true, restringido: true },
  { nombre: 'Imipenem', grupo: 'Carbapenémicos', watch: true, restringido: true },
  { nombre: 'Ertapenem', grupo: 'Carbapenémicos', watch: true, restringido: true },
  { nombre: 'Colistina', grupo: 'Polimixinas', watch: true, restringido: true },
  { nombre: 'Vancomicina', grupo: 'Glicopéptidos', watch: true, restringido: false },
  { nombre: 'Piperacilina/Tazobactam', grupo: 'Penicilinas + IBL', watch: false, restringido: false },
  { nombre: 'Cefepime', grupo: 'Cefalosporinas 4G', watch: false, restringido: false },
  { nombre: 'Ceftriaxona', grupo: 'Cefalosporinas 3G', watch: false, restringido: false },
  { nombre: 'Ciprofloxacino', grupo: 'Quinolonas', watch: true, restringido: false },
  { nombre: 'Linezolid', grupo: 'Oxazolidinonas', watch: true, restringido: false },
  { nombre: 'Fluconazol', grupo: 'Azoles', watch: false, restringido: false },
];

export const ANTIMICROBIANOS_RESTRINGIDOS = ANTIMICROBIANOS_TRAZADORES.filter(a => a.restringido).map(a => a.nombre);

// Catálogo AMPLIO de antimicrobianos para el registro de Intervenciones —
// más allá de los 10 "trazadores" que se usan específicamente para el
// indicador DDD/DOT (ese listado queda igual, es el que exige el
// seguimiento de consumo). Aquí se puede registrar cualquier antimicrobiano
// que efectivamente se prescriba en la institución.
export const ANTIMICROBIANOS_CATALOGO: AntimicrobianoRef[] = [
  ...ANTIMICROBIANOS_TRAZADORES,
  { nombre: 'Ampicilina/Sulbactam', grupo: 'Penicilinas + IBL', watch: false, restringido: false },
  { nombre: 'Amoxicilina/Clavulanato', grupo: 'Penicilinas + IBL', watch: false, restringido: false },
  { nombre: 'Ampicilina', grupo: 'Penicilinas', watch: false, restringido: false },
  { nombre: 'Penicilina cristalina', grupo: 'Penicilinas', watch: false, restringido: false },
  { nombre: 'Oxacilina', grupo: 'Penicilinas antiestafilocócicas', watch: false, restringido: false },
  { nombre: 'Cefazolina', grupo: 'Cefalosporinas 1G', watch: false, restringido: false },
  { nombre: 'Cefuroxima', grupo: 'Cefalosporinas 2G', watch: false, restringido: false },
  { nombre: 'Cefotaxima', grupo: 'Cefalosporinas 3G', watch: false, restringido: false },
  { nombre: 'Ceftazidima', grupo: 'Cefalosporinas 3G', watch: false, restringido: false },
  { nombre: 'Clindamicina', grupo: 'Lincosamidas', watch: false, restringido: false },
  { nombre: 'Metronidazol', grupo: 'Nitroimidazoles', watch: false, restringido: false },
  { nombre: 'Azitromicina', grupo: 'Macrólidos', watch: false, restringido: false },
  { nombre: 'Claritromicina', grupo: 'Macrólidos', watch: false, restringido: false },
  { nombre: 'Doxiciclina', grupo: 'Tetraciclinas', watch: false, restringido: false },
  { nombre: 'Trimetoprim/Sulfametoxazol', grupo: 'Sulfonamidas', watch: false, restringido: false },
  { nombre: 'Gentamicina', grupo: 'Aminoglucósidos', watch: false, restringido: false },
  { nombre: 'Amikacina', grupo: 'Aminoglucósidos', watch: true, restringido: false },
  { nombre: 'Levofloxacino', grupo: 'Quinolonas', watch: true, restringido: false },
  { nombre: 'Moxifloxacino', grupo: 'Quinolonas', watch: true, restringido: false },
  { nombre: 'Nitrofurantoína', grupo: 'Nitrofuranos', watch: false, restringido: false },
  { nombre: 'Fosfomicina', grupo: 'Fosfónicos', watch: false, restringido: false },
  { nombre: 'Daptomicina', grupo: 'Lipopéptidos', watch: true, restringido: true },
  { nombre: 'Tigeciclina', grupo: 'Glicilciclinas', watch: true, restringido: true },
  { nombre: 'Anfotericina B', grupo: 'Antifúngicos poliénicos', watch: true, restringido: true },
  { nombre: 'Voriconazol', grupo: 'Antifúngicos azólicos', watch: true, restringido: true },
  { nombre: 'Caspofungina', grupo: 'Equinocandinas', watch: true, restringido: true },
];

export const TIPOS_INTERVENCION = [
  { key: 'suspension', label: 'Suspensión', color: '#f87171' },
  { key: 'desescalada', label: 'Desescalada', color: '#34d399' },
  { key: 'ajuste_dosis', label: 'Ajuste de dosis', color: '#60a5fa' },
  { key: 'cambio_via', label: 'Cambio de vía', color: '#a78bfa' },
  { key: 'inicio_dirigido', label: 'Inicio dirigido', color: '#f59e0b' },
] as const;

// Momento/frecuencia de la dosis — para dejar registrado el esquema de
// administración que se está evaluando en la intervención.
export type FrecuenciaDosis = 'c4h' | 'c6h' | 'c8h' | 'c12h' | 'c24h' | 'dosis_unica' | 'otro';

export const FRECUENCIA_DOSIS_LABEL: Record<FrecuenciaDosis, string> = {
  c4h: 'Cada 4 horas',
  c6h: 'Cada 6 horas',
  c8h: 'Cada 8 horas',
  c12h: 'Cada 12 horas',
  c24h: 'Cada 24 horas',
  dosis_unica: 'Dosis única',
  otro: 'Otro esquema',
};

// Umbral de revisión por prescripción prolongada — NO es un límite clínico
// estricto ni sustituye el juicio del prescriptor o la guía institucional:
// es un disparador administrativo del programa PROA para que el equipo
// revise (desescalar/suspender/justificar) un tratamiento que ya superó el
// tiempo típico de reevaluación. Para antimicrobianos "watch"/restringidos
// el disparador es más corto (7 días) que para el resto (10 días), en
// línea con la vigilancia especial que ya aplica el módulo a esos grupos.
export const UMBRAL_DIAS_REVISION_WATCH = 7;
export const UMBRAL_DIAS_REVISION_GENERAL = 10;

export function esPrescripcionProlongada(antimicrobiano: string, duracionDias: number | null | undefined): boolean {
  if (!duracionDias || duracionDias <= 0 || !Number.isFinite(duracionDias)) return false;
  const ref = ANTIMICROBIANOS_CATALOGO.find(a => a.nombre === antimicrobiano);
  // Umbral corto (7 días) para cualquier antimicrobiano "watch" (vigilancia
  // OMS AWaRe) O restringido — son ejes independientes: un antimicrobiano
  // puede estar restringido sin estar en la categoría watch, y en ese caso
  // igual amerita revisión temprana del equipo PROA.
  const umbral = (ref?.watch || ref?.restringido) ? UMBRAL_DIAS_REVISION_WATCH : UMBRAL_DIAS_REVISION_GENERAL;
  return duracionDias > umbral;
}

export interface Intervencion {
  id?: string;
  fecha: string;
  paciente: string;
  servicio: string;
  antimicrobiano: string;
  frecuenciaDosis: FrecuenciaDosis;
  duracionDiasTratamiento: number | null;
  tipo: 'suspension' | 'desescalada' | 'ajuste_dosis' | 'cambio_via' | 'inicio_dirigido';
  justificacion: string;
  resultado: 'aceptada' | 'rechazada' | 'pendiente';
  creadoEn?: Timestamp;
}

export const INTERVENCION_EMPTY_FORM: Omit<Intervencion, 'id' | 'creadoEn'> = {
  fecha: '', paciente: '', servicio: '', antimicrobiano: '', frecuenciaDosis: 'c8h', duracionDiasTratamiento: null,
  tipo: 'desescalada', justificacion: '', resultado: 'pendiente',
};

// ════════════════════════════════════════════════════════════════════════
// Consumo de antimicrobianos (DDD + DOT)
// ════════════════════════════════════════════════════════════════════════
export interface ConsumoAMR {
  id?: string;
  antimicrobiano: string;
  grupo: string;
  ddd: number;      // Dosis Diaria Definida consumidas en el período
  dot: number | null; // Días de Terapia (Days of Therapy) — puede no diligenciarse aún
  camas: number;     // camas-día del período
  periodo: string;   // YYYY-MM
  nit?: string;
  creadoEn?: Timestamp;
}

// ════════════════════════════════════════════════════════════════════════
// IAAS por microorganismo resistente (art. 20.6 Res. 2471/2022)
// ════════════════════════════════════════════════════════════════════════
export type TipoResistencia = 'BLEE' | 'AmpC' | 'carbapenemasa' | 'SARM' | 'ERV' | 'otro';

export const TIPO_RESISTENCIA_LABEL: Record<TipoResistencia, string> = {
  BLEE: 'BLEE (β-lactamasas de espectro extendido)',
  AmpC: 'AmpC',
  carbapenemasa: 'Carbapenemasa (KPC, NDM, OXA-48, etc.)',
  SARM: 'SARM (S. aureus resistente a meticilina)',
  ERV: 'ERV (Enterococo resistente a vancomicina)',
  otro: 'Otro mecanismo de resistencia',
};

export const SITIOS_INFECCION = ['Torrente sanguíneo', 'Tracto urinario', 'Respiratoria (neumonía)', 'Quirúrgica', 'Piel y tejidos blandos', 'Intraabdominal', 'Otro'];

export interface IAASResistente {
  id?: string;
  fecha: string;
  servicio: string;
  microorganismo: string;
  tipoResistencia: TipoResistencia;
  sitioInfeccion: string;
  desenlace: 'resuelto' | 'en_tratamiento' | 'fallecio';
  notificadoEpidemiologia: boolean;
  nit?: string;
  creadoEn?: Timestamp;
}

export const DESENLACE_LABEL: Record<IAASResistente['desenlace'], string> = {
  resuelto: 'Resuelto',
  en_tratamiento: 'En tratamiento',
  fallecio: 'Falleció',
};

export const IAAS_EMPTY_FORM: Omit<IAASResistente, 'id' | 'creadoEn' | 'nit'> = {
  fecha: '', servicio: '', microorganismo: '', tipoResistencia: 'BLEE', sitioInfeccion: '', desenlace: 'en_tratamiento', notificadoEpidemiologia: false,
};

// ════════════════════════════════════════════════════════════════════════
// Autorización previa — antibióticos restringidos (art. 2.3 Res. 2471/2022)
// ════════════════════════════════════════════════════════════════════════
export interface AutorizacionPrevia {
  id?: string;
  fecha: string;
  paciente: string;
  servicio: string;
  antibiotico: string;
  medicoSolicitante: string;
  justificacionClinica: string;
  autorizadoPor: string;
  estado: 'autorizado' | 'negado' | 'pendiente';
  nit?: string;
  creadoEn?: Timestamp;
}

export const ESTADO_AUTORIZACION_LABEL: Record<AutorizacionPrevia['estado'], string> = {
  autorizado: 'Autorizado',
  negado: 'Negado',
  pendiente: 'Pendiente',
};

export const AUTORIZACION_EMPTY_FORM: Omit<AutorizacionPrevia, 'id' | 'creadoEn' | 'nit'> = {
  fecha: '', paciente: '', servicio: '', antibiotico: '', medicoSolicitante: '', justificacionClinica: '', autorizadoPor: '', estado: 'pendiente',
};

// ════════════════════════════════════════════════════════════════════════
// Informe anual + estado de envío a la Secretaría de Salud territorial
// (art. 20.6 + 12.5 Res. 2471/2022)
// ════════════════════════════════════════════════════════════════════════
export interface InformeAnualPROA {
  id?: string;
  anio: number;
  fechaEnvioSecretaria: string | null;
  radicadoSecretaria: string;
  estadoEnvio: 'pendiente' | 'enviado';
  observaciones: string;
  nit?: string;
  creadoEn?: Timestamp;
  actualizadoEn?: Timestamp | null;
}

export const ESTADO_ENVIO_LABEL: Record<InformeAnualPROA['estadoEnvio'], string> = {
  pendiente: 'Pendiente de enviar',
  enviado: 'Enviado a la Secretaría',
};
