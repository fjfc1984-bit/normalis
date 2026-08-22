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

// ════════════════════════════════════════════════════════════════════════
// Evaluación Territorial PROA — reproducción del instrumento oficial que
// usan las Secretarías de Salud territoriales para evaluar la implementación
// del PROA (formato Ministerio de Salud y Protección Social — Subdirección
// de Enfermedades Transmisibles).
//
// FUENTE: a diferencia del checklist de madurez de este módulo (construido
// a partir de un resumen de la Res. 2471/2022), este instrumento SÍ es una
// reproducción directa de un formato oficial real diligenciado que aportó
// el usuario (evaluación de una IPS de nivel III en Barranquilla, Atlántico,
// del 25/09/2025) — 61 ítems en 3 secciones, con las mismas reglas de
// puntaje que el archivo original (verificadas contra sus fórmulas).
//
// Reglas de puntaje:
//   - Ítems de cumplimiento general: SI = 1, NO = 0, NO APLICA = 1 (un "No
//     aplica" NO resta puntos — así lo calcula el formato original).
//   - Ítems de oficialización de guías (sección "Oficialización", ítems
//     5.1 a 5.7): ADOPCIÓN = 1, ADAPTACIÓN = 1, NO = 0, NO APLICA = 1.
//   - Puntaje esperado por sección: Pre implementación = 28, Ejecución = 21,
//     Evaluación de la ejecución = 12. Total = 61.
//   - Clasificación: Avanzado 56-61 · Básico 31-55 · Inadecuado ≤30 (bandas
//     tomadas tal cual del formato original).
//
// La numeración de los ítems (1.1, 2.3, etc.) es la numeración oficial del
// formato — ESTABLE, nunca reordenar/reciclar (mismo motivo que ChecklistItem
// más arriba: las respuestas guardadas en Firestore quedan indexadas por
// este id).

export type RespuestaCumplimiento = 'SI' | 'NO' | 'NO_APLICA' | '';
export type RespuestaOficializacion = 'ADOPCION' | 'ADAPTACION' | 'NO' | 'NO_APLICA' | '';

export const RESPUESTA_CUMPLIMIENTO_LABEL: Record<Exclude<RespuestaCumplimiento, ''>, string> = {
  SI: 'Sí', NO: 'No', NO_APLICA: 'No aplica',
};

export const RESPUESTA_OFICIALIZACION_LABEL: Record<Exclude<RespuestaOficializacion, ''>, string> = {
  ADOPCION: 'Adopción', ADAPTACION: 'Adaptación', NO: 'No', NO_APLICA: 'No aplica',
};

export interface ItemEvaluacionTerritorial {
  id: string; // numeración oficial — ESTABLE, ver nota arriba
  categoria: string;
  actividad: string;
  tipo: 'cumplimiento' | 'oficializacion';
  nota?: string; // ej. "Obligatorio", "Solo ámbito hospitalario"
}

export interface SeccionEvaluacionTerritorial {
  id: 'pre_implementacion' | 'ejecucion' | 'evaluacion_ejecucion';
  titulo: string;
  puntajeEsperado: number;
  items: ItemEvaluacionTerritorial[];
}

export const EVALUACION_TERRITORIAL_PROA: SeccionEvaluacionTerritorial[] = [
  {
    id: 'pre_implementacion', titulo: 'Actividades pre implementación', puntajeEsperado: 28,
    items: [
      { id: '1.1', categoria: 'Socialización del PROA', actividad: 'Socialización a directores, calidad, Talento Humano, etc.', tipo: 'cumplimiento' },
      { id: '1.2', categoria: 'Socialización del PROA', actividad: 'Diseño del PROA', tipo: 'cumplimiento' },
      { id: '1.3', categoria: 'Socialización del PROA', actividad: 'Institucionalización PROA (Acta de conformación / acto administrativo)', tipo: 'cumplimiento' },
      { id: '1.4', categoria: 'Socialización del PROA', actividad: 'Difusión del PROA', tipo: 'cumplimiento' },
      { id: '2.1', categoria: 'Conformación del equipo institucional del PROA', actividad: 'Líder del equipo', tipo: 'cumplimiento' },
      { id: '2.2', categoria: 'Conformación del equipo institucional del PROA', actividad: 'Representante administrativo de la IPS', tipo: 'cumplimiento' },
      { id: '2.3', categoria: 'Conformación del equipo institucional del PROA', actividad: 'Profesional de Enfermería', tipo: 'cumplimiento' },
      { id: '2.4', categoria: 'Conformación del equipo institucional del PROA', actividad: 'Profesional de Microbiología (bacteriólogo con entrenamiento en microbiología)', tipo: 'cumplimiento' },
      { id: '2.5', categoria: 'Conformación del equipo institucional del PROA', actividad: 'Profesional en Química Farmacéutica y/o Regente de Farmacia (I nivel)', tipo: 'cumplimiento' },
      { id: '2.6', categoria: 'Conformación del equipo institucional del PROA', actividad: 'Representante de médicos', tipo: 'cumplimiento' },
      { id: '2.7', categoria: 'Conformación del equipo institucional del PROA', actividad: 'Especialista en Infectología', tipo: 'cumplimiento' },
      { id: '2.8', categoria: 'Conformación del equipo institucional del PROA', actividad: 'Profesional en Epidemiología con entrenamiento en PROA', tipo: 'cumplimiento' },
      { id: '2.9', categoria: 'Conformación del equipo institucional del PROA', actividad: 'Representantes de las diferentes especialidades clínicas de la institución', tipo: 'cumplimiento' },
      { id: '2.10', categoria: 'Conformación del equipo institucional del PROA', actividad: 'Líder de Capacitación', tipo: 'cumplimiento' },
      { id: '2.11', categoria: 'Conformación del equipo institucional del PROA', actividad: 'Otros', tipo: 'cumplimiento' },
      { id: '3.1', categoria: 'Capacidad técnica para la ejecución del PROA', actividad: 'Lugar para reunión del equipo PROA, con computadores, programas informáticos, acceso a bibliografía y proyector', tipo: 'cumplimiento' },
      { id: '3.2', categoria: 'Capacidad técnica para la ejecución del PROA', actividad: 'Historia clínica sistematizada — alertas', tipo: 'cumplimiento' },
      { id: '3.3', categoria: 'Capacidad técnica para la ejecución del PROA', actividad: 'Sistemas de soporte de decisión clínica sistematizada para formulación', tipo: 'cumplimiento' },
      { id: '3.4', categoria: 'Capacidad técnica para la ejecución del PROA', actividad: 'Equipos con herramienta de análisis de resistencia WHONET', tipo: 'cumplimiento' },
      { id: '4.1', categoria: 'Capacidad tecnológica para la ejecución del PROA', actividad: 'Equipos de laboratorio para identificación de microorganismos y perfil de susceptibilidad', tipo: 'cumplimiento', nota: 'Depende del nivel de complejidad' },
      { id: '4.2', categoria: 'Capacidad tecnológica para la ejecución del PROA', actividad: 'Antibiogramas ajustados', tipo: 'cumplimiento' },
      { id: '4.3', categoria: 'Capacidad tecnológica para la ejecución del PROA', actividad: 'Informe periódico', tipo: 'cumplimiento' },
      { id: '4.4', categoria: 'Capacidad tecnológica para la ejecución del PROA', actividad: 'Test rápidos para identificación de microorganismos', tipo: 'cumplimiento' },
      { id: '4.5', categoria: 'Capacidad tecnológica para la ejecución del PROA', actividad: 'Galactomannan y otras pruebas para hongos', tipo: 'cumplimiento' },
      { id: '4.6', categoria: 'Capacidad tecnológica para la ejecución del PROA', actividad: 'Medición de niveles de antimicrobianos — Vancomicina', tipo: 'cumplimiento' },
      { id: '4.7', categoria: 'Capacidad tecnológica para la ejecución del PROA', actividad: 'Medición de niveles de antimicrobianos — Aminoglucósidos', tipo: 'cumplimiento' },
      { id: '4.8', categoria: 'Capacidad tecnológica para la ejecución del PROA', actividad: 'Pruebas especiales — Proteína C reactiva', tipo: 'cumplimiento' },
      { id: '4.9', categoria: 'Capacidad tecnológica para la ejecución del PROA', actividad: 'Pruebas especiales — Procalcitonina', tipo: 'cumplimiento' },
    ],
  },
  {
    id: 'ejecucion', titulo: 'Ejecución del PROA', puntajeEsperado: 21,
    items: [
      { id: '5.1', categoria: 'Oficialización — adopción o adaptación de guías de práctica clínica', actividad: 'IVU (infección de vías urinarias)', tipo: 'oficializacion' },
      { id: '5.2', categoria: 'Oficialización — adopción o adaptación de guías de práctica clínica', actividad: 'Neumonía', tipo: 'oficializacion' },
      { id: '5.3', categoria: 'Oficialización — adopción o adaptación de guías de práctica clínica', actividad: 'Piel y tejidos blandos', tipo: 'oficializacion' },
      { id: '5.4', categoria: 'Oficialización — adopción o adaptación de guías de práctica clínica', actividad: 'Exacerbación EPOC', tipo: 'oficializacion' },
      { id: '5.5', categoria: 'Oficialización — adopción o adaptación de guías de práctica clínica', actividad: 'EDA (enfermedad diarreica aguda)', tipo: 'oficializacion' },
      { id: '5.6', categoria: 'Oficialización — adopción o adaptación de guías de práctica clínica', actividad: 'Profilaxis pre quirúrgica', tipo: 'oficializacion' },
      { id: '5.7', categoria: 'Oficialización — adopción o adaptación de guías de práctica clínica', actividad: 'Otras guías', tipo: 'oficializacion' },
      { id: '5.8', categoria: 'Oficialización — adopción o adaptación de guías de práctica clínica', actividad: 'Desarrollo de algoritmos de tratamiento', tipo: 'cumplimiento' },
      { id: '5.9', categoria: 'Oficialización — adopción o adaptación de guías de práctica clínica', actividad: 'Implementación de sistemas de soporte de decisión clínica sistematizada para formulación', tipo: 'cumplimiento' },
      { id: '5.10', categoria: 'Oficialización — adopción o adaptación de guías de práctica clínica', actividad: 'Realización de protocolos para pruebas de identificación de microorganismos', tipo: 'cumplimiento' },
      { id: '5.11', categoria: 'Oficialización — adopción o adaptación de guías de práctica clínica', actividad: 'Desarrollo de estrategias de preautorización / documentación', tipo: 'cumplimiento' },
      { id: '5.12', categoria: 'Oficialización — adopción o adaptación de guías de práctica clínica', actividad: 'Desarrollo de estrategias de auditoría prospectiva con retroalimentación / documentación', tipo: 'cumplimiento' },
      { id: '6.1', categoria: 'Educación', actividad: 'Resistencia a antimicrobianos', tipo: 'cumplimiento' },
      { id: '6.2', categoria: 'Educación', actividad: 'Diagnóstico y esquema de tratamientos institucionales', tipo: 'cumplimiento' },
      { id: '6.3', categoria: 'Educación', actividad: 'Diagnóstico y control de las IAAS', tipo: 'cumplimiento' },
      { id: '6.4', categoria: 'Educación', actividad: 'Solicitud de pruebas de laboratorio', tipo: 'cumplimiento' },
      { id: '6.5', categoria: 'Educación', actividad: 'Interpretación de pruebas de laboratorio', tipo: 'cumplimiento' },
      { id: '6.6', categoria: 'Educación', actividad: 'Estrategias de educación', tipo: 'cumplimiento' },
      { id: '7.1', categoria: 'Implementación', actividad: 'Preautorización con seguimiento', tipo: 'cumplimiento' },
      { id: '7.2', categoria: 'Implementación', actividad: 'Auditoría prospectiva con retroalimentación (alterna)', tipo: 'cumplimiento' },
      { id: '7.3', categoria: 'Implementación', actividad: 'Evaluación periódica de consumo', tipo: 'cumplimiento' },
    ],
  },
  {
    id: 'evaluacion_ejecucion', titulo: 'Evaluación de la ejecución del PROA', puntajeEsperado: 12,
    items: [
      { id: '8.1', categoria: 'Indicadores de proceso', actividad: 'Toma de muestras previo al tratamiento', tipo: 'cumplimiento', nota: 'Obligatorio' },
      { id: '8.2', categoria: 'Indicadores de proceso', actividad: 'Solicitudes de pruebas de microbiología generales, especiales y test rápidos de identificación de microorganismos', tipo: 'cumplimiento' },
      { id: '8.3', categoria: 'Indicadores de proceso', actividad: 'Adherencia a guías', tipo: 'cumplimiento' },
      { id: '8.4', categoria: 'Indicadores de proceso', actividad: 'Valoraciones por Infectología, antibióticos grupo 1', tipo: 'cumplimiento' },
      { id: '8.5', categoria: 'Indicadores de proceso', actividad: 'Valoraciones por Infectología en pacientes de UCI, UCIN y neutropenia febril posquimioterapia', tipo: 'cumplimiento', nota: 'Solo ámbito hospitalario' },
      { id: '9.1', categoria: 'Indicadores de resultado', actividad: 'DDD / DOT', tipo: 'cumplimiento' },
      { id: '9.2', categoria: 'Indicadores de resultado', actividad: 'Ajuste de prescripción', tipo: 'cumplimiento', nota: 'Obligatorio' },
      { id: '9.3', categoria: 'Indicadores de resultado', actividad: 'Ajuste de prescripción en UCI, UCIN y neutropenia febril posquimioterapia', tipo: 'cumplimiento', nota: 'Solo ámbito hospitalario' },
      { id: '9.4', categoria: 'Indicadores de resultado', actividad: 'Cambios de medicamento por Infectología', tipo: 'cumplimiento' },
      { id: '9.5', categoria: 'Indicadores de resultado', actividad: 'Profilaxis antibiótica perioperatoria menor a 24 horas', tipo: 'cumplimiento', nota: 'Obligatorio' },
      { id: '10.1', categoria: 'Indicadores de impacto', actividad: 'IAAS por gérmenes resistentes (BLEE, AmpC, carbapenémicos), incluye extrainstitucionales', tipo: 'cumplimiento', nota: 'Obligatorio' },
      { id: '10.2', categoria: 'Indicadores de impacto', actividad: 'Perfil institucional de resistencia bacteriana', tipo: 'cumplimiento' },
    ],
  },
];

export function puntosItemEvaluacion(tipo: 'cumplimiento' | 'oficializacion', respuesta: string): number {
  if (tipo === 'oficializacion') {
    return respuesta === 'ADOPCION' || respuesta === 'ADAPTACION' || respuesta === 'NO_APLICA' ? 1 : 0;
  }
  return respuesta === 'SI' || respuesta === 'NO_APLICA' ? 1 : 0;
}

export interface RespuestaItemEvaluacion { respuesta: string; evidencia: string; }

export function puntajeSeccionEvaluacion(seccion: SeccionEvaluacionTerritorial, respuestas: Record<string, RespuestaItemEvaluacion>): number {
  return seccion.items.reduce((sum, it) => sum + puntosItemEvaluacion(it.tipo, respuestas[it.id]?.respuesta || ''), 0);
}

export function puntajeTotalEvaluacion(respuestas: Record<string, RespuestaItemEvaluacion>): number {
  return EVALUACION_TERRITORIAL_PROA.reduce((sum, sec) => sum + puntajeSeccionEvaluacion(sec, respuestas), 0);
}

export const PUNTAJE_MAXIMO_EVALUACION_TERRITORIAL = EVALUACION_TERRITORIAL_PROA.reduce((s, sec) => s + sec.puntajeEsperado, 0); // 61

export type NivelCalificacionPROA = 'avanzado' | 'basico' | 'inadecuado';

// Bandas tomadas tal cual del formato original: Avanzado 56-61, Básico
// 31-55, Inadecuado ≤30.
export function nivelCalificacionPROA(puntajeTotal: number): NivelCalificacionPROA {
  if (puntajeTotal >= 56) return 'avanzado';
  if (puntajeTotal >= 31) return 'basico';
  return 'inadecuado';
}

export const NIVEL_CALIFICACION_CFG: Record<NivelCalificacionPROA, { label: string; color: string; bg: string }> = {
  avanzado:   { label: 'Avanzado',   color: '#047857', bg: '#d1fae5' },
  basico:     { label: 'Básico',     color: '#b45309', bg: '#fef3c7' },
  inadecuado: { label: 'Inadecuado', color: '#b91c1c', bg: '#fee2e2' },
};

export type AmbitoPROA = 'ambulatorio' | 'hospitalario' | 'ambos' | '';
export const AMBITO_PROA_LABEL: Record<Exclude<AmbitoPROA, ''>, string> = {
  ambulatorio: 'Ambulatorio', hospitalario: 'Hospitalario', ambos: 'Ambos',
};

export type CaracterInstitucion = 'publica' | 'privada' | '';
export const CARACTER_INSTITUCION_LABEL: Record<Exclude<CaracterInstitucion, ''>, string> = {
  publica: 'Pública', privada: 'Privada',
};

export interface EvaluacionTerritorialPROA {
  id?: string;
  nit?: string;
  codigoPrestador: string;
  ambito: AmbitoPROA;
  caracterInstitucion: CaracterInstitucion;
  nivelComplejidad: NivelComplejidad;
  departamento: string;
  municipio: string;
  fecha: string; // ISO "YYYY-MM-DD"
  responsableDiligenciamiento: string;
  respuestas: Record<string, RespuestaItemEvaluacion>; // llave = id oficial del ítem, ej. "1.1"
  creadoEn?: Timestamp;
}

export const EVALUACION_TERRITORIAL_EMPTY_FORM: Omit<EvaluacionTerritorialPROA, 'id' | 'creadoEn' | 'nit'> = {
  codigoPrestador: '', ambito: '', caracterInstitucion: '', nivelComplejidad: 'I',
  departamento: '', municipio: '', fecha: '', responsableDiligenciamiento: '', respuestas: {},
};
