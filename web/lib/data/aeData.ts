/**
 * web/lib/data/aeData.ts
 * Datos del Simulacro de Visita — Auditoría Externa del Ente Habilitador
 * Portado desde normalis-main.js (AE_PHASES + AE_DB)
 *
 * Uso: simula una visita de la Secretaría de Salud para verificar
 * condiciones de habilitación (Res. 3100/2019).
 * Cada pregunta tiene severidad: critica = cierre inmediato,
 * moderada = plan de mejoramiento, menor = recomendación.
 *
 * Revisión de citas normativas (ago 2026): se corrigieron 5 citas mal
 * aplicadas o no verificables (norma real citada para un tema que no trata,
 * o número de resolución que no se pudo confirmar que exista) — bomberos,
 * póliza de responsabilidad civil, convenio de referencia/contrarreferencia,
 * reporte de eventos adversos y certificado de auxiliar de odontología. Las
 * demás citas (Res. 3100/2019 por estándar, RETHUS, leyes de profesiones de
 * salud, NTC-ISO 15189, decretos de dispositivos/medicamentos) se verificaron
 * como correctas para el punto que respaldan. Ante cualquier duda sobre una
 * cita puntual, confirmar con la Secretaría de Salud territorial — algunos
 * requisitos (ej. certificado de bomberos) tienen aplicación municipal.
 */

// ── Tipos ──────────────────────────────────────────────────────────────────

export type AESeveridad = 'critica' | 'moderada' | 'menor';
export type AEFaseId = 'documentacion' | 'planta' | 'talento' | 'dotacion' | 'registros';
export type AEServicioId = 'general' | 'urgencias' | 'quirurgicos' | 'laboratorio' | 'odontologia';

export interface AECriterio {
  q:    string;         // Pregunta
  sev:  AESeveridad;   // Severidad del hallazgo
  norm: string;         // Referencia normativa
}

export interface AEFase {
  id:    AEFaseId;
  label: string;
  icon:  string;
}

export type AEFaseData = Record<AEFaseId, AECriterio[]>;
export type AEDatabase = Record<AEServicioId, AEFaseData>;

// ── Fases de la visita ─────────────────────────────────────────────────────

export const AE_PHASES: AEFase[] = [
  { id: 'documentacion', label: 'Documentación',   icon: '📄' },
  { id: 'planta',        label: 'Planta Física',    icon: '🏗️' },
  { id: 'talento',       label: 'Talento Humano',   icon: '👩‍⚕️' },
  { id: 'dotacion',      label: 'Dotación y Equipos', icon: '⚙️' },
  { id: 'registros',     label: 'Registros e HC',   icon: '📋' },
];

// ── Servicios disponibles ─────────────────────────────────────────────────

export const AE_SERVICIOS: Record<AEServicioId, { label: string; icon: string }> = {
  general:     { label: 'Consulta General / Establecimiento', icon: '🏥' },
  urgencias:   { label: 'Urgencias',                          icon: '🚨' },
  quirurgicos: { label: 'Quirúrgicos',                        icon: '🔪' },
  laboratorio: { label: 'Laboratorio Clínico',                icon: '🔬' },
  odontologia: { label: 'Odontología',                        icon: '🦷' },
};

// ── Base de datos de criterios por servicio y fase ────────────────────────

export const AE_DB: AEDatabase = {

  general: {
    documentacion: [
      { q: '¿El establecimiento tiene Resolución de Habilitación vigente del servicio de salud?', sev: 'critica',  norm: 'Res. 3100/2019 Art. 8' },
      { q: '¿El Certificado de Habilitación está publicado en lugar visible para el usuario?',    sev: 'moderada', norm: 'Res. 3100/2019 Art. 9' },
      { q: '¿El plan de emergencias y evacuación está actualizado, aprobado y visible?',           sev: 'moderada', norm: 'Res. 256/2016' },
      { q: '¿El PGIRH (plan de gestión de residuos hospitalarios) está vigente y aprobado?',      sev: 'moderada', norm: 'Dec. 351/2014' },
      { q: '¿El establecimiento tiene Certificado de Bomberos vigente?',                           sev: 'moderada', norm: 'Ley 1575/2012 (Ley General de Bomberos)' },
      { q: '¿El manual de bioseguridad está actualizado y disponible para el personal?',           sev: 'moderada', norm: 'Res. 3100/2019 Est. 5' },
      { q: '¿El establecimiento tiene póliza de responsabilidad civil vigente?',                   sev: 'menor',    norm: 'Buena práctica — sin exigencia normativa específica de habilitación; frecuente como requisito contractual de EPS/aseguradoras' },
    ],
    planta: [
      { q: '¿El establecimiento tiene baños diferenciados para usuarios y personal?',              sev: 'moderada', norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿Las áreas cuentan con señalización de rutas de evacuación vigente?',                  sev: 'moderada', norm: 'NSR-10 · Ley 1575/2012' },
      { q: '¿Existe rampa o ascensor para acceso de personas con movilidad reducida?',             sev: 'moderada', norm: 'Ley 361/1997 · RETIE' },
      { q: '¿Las instalaciones eléctricas tienen concepto técnico vigente y tableros señalizados?',sev: 'critica',  norm: 'RETIE · Resolución 90708/2013' },
      { q: '¿El servicio de aseo y limpieza está documentado con frecuencias y productos aprobados?', sev: 'menor', norm: 'Res. 3100/2019 Est. 5' },
    ],
    talento: [
      { q: '¿El director o gerente médico tiene tarjeta profesional vigente en RETHUS?',           sev: 'critica',  norm: 'Ley 23/1981 · RETHUS' },
      { q: '¿Todo el personal asistencial tiene tarjeta profesional verificable en RETHUS?',       sev: 'critica',  norm: 'Res. 3100/2019 Est. 1' },
      { q: '¿Los contratos del personal están disponibles en el momento de la visita?',            sev: 'moderada', norm: 'Res. 3100/2019 Est. 1' },
      { q: '¿El personal tiene carné de vacunación con esquema para riesgo biológico (HepB, tétanos)?', sev: 'moderada', norm: 'Res. 3100/2019 · Min. Trabajo' },
      { q: '¿Existe programa de inducción y capacitación documentado para el personal?',           sev: 'menor',    norm: 'Res. 3100/2019 Est. 1' },
    ],
    dotacion: [
      { q: '¿Los equipos biomédicos tienen registro INVIMA vigente o autorización de uso?',        sev: 'critica',  norm: 'Dec. 4725/2005 · INVIMA' },
      { q: '¿Los equipos tienen hojas de vida con mantenimiento preventivo al día?',               sev: 'moderada', norm: 'Dec. 4725/2005 · Tecnovigilancia' },
      { q: '¿Los medicamentos en stock están dentro de su fecha de vencimiento?',                  sev: 'critica',  norm: 'Decreto 677/1995 · INVIMA' },
      { q: '¿El almacenamiento de medicamentos tiene control de temperatura documentado?',         sev: 'moderada', norm: 'Res. 3100/2019 Est. 3' },
      { q: '¿Los extintores están vigentes, señalizados y en los puntos requeridos?',              sev: 'moderada', norm: 'NSR-10 · Ley 1575/2012' },
    ],
    registros: [
      { q: '¿Las historias clínicas tienen todos los componentes exigidos por la Res. 1995/1999?', sev: 'critica',  norm: 'Res. 1995/1999 Art. 3' },
      { q: '¿El archivo de HC garantiza confidencialidad y custodia mínima de 20 años?',           sev: 'moderada', norm: 'Res. 1995/1999 Art. 15' },
      { q: '¿El libro de guardia o registro de atenciones está diligenciado y actualizado?',       sev: 'moderada', norm: 'Res. 3100/2019 Est. 6' },
      { q: '¿Existe registro de consentimientos informados por procedimiento?',                    sev: 'moderada', norm: 'Ley 23/1981 Art. 15' },
      { q: '¿Se llevan indicadores de calidad y el PAMEC está activo?',                            sev: 'moderada', norm: 'Res. 256/2016 · Res. 3100/2019 Est. 6' },
    ],
  },

  urgencias: {
    documentacion: [
      { q: '¿El servicio de urgencias tiene habilitación específica vigente (Estándar 5)?',        sev: 'critica',  norm: 'Res. 3100/2019 Est. 5' },
      { q: '¿Existe protocolo de triage documentado con escala de 5 niveles?',                     sev: 'critica',  norm: 'Res. 3100/2019 Est. 6' },
      { q: '¿Hay convenio activo con IPS de mayor complejidad para referencia de pacientes?',      sev: 'critica',  norm: 'Res. 3100/2019 Est. 7' },
      { q: '¿El protocolo de referencia y contrarreferencia está disponible y vigente?',           sev: 'moderada', norm: 'Res. 3100/2019 Est. 7' },
      { q: '¿El plan de contingencia para masivos de víctimas está documentado?',                  sev: 'moderada', norm: 'Res. 256/2016 · Plan hospitalario' },
    ],
    planta: [
      { q: '¿El área de triage tiene espacio físico diferenciado y señalizado?',                   sev: 'critica',  norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿Existe sala de reanimación/shock con equipos completos disponibles?',                 sev: 'critica',  norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿El servicio de urgencias es accesible desde el exterior sin barreras?',               sev: 'moderada', norm: 'Ley 361/1997' },
      { q: '¿Hay área de espera diferenciada para acompañantes?',                                  sev: 'menor',    norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿La zona de camillas tiene espacio mínimo de 2 m entre ellas?',                        sev: 'moderada', norm: 'Res. 3100/2019 Est. 2' },
    ],
    talento: [
      { q: '¿Hay médico con presencia física en urgencias las 24 horas del día los 365 días?',     sev: 'critica',  norm: 'Res. 3100/2019 Est. 1' },
      { q: '¿La enfermera profesional está presente de forma continua en el servicio?',             sev: 'critica',  norm: 'Res. 3100/2019 Est. 1' },
      { q: '¿El personal de triage tiene certificación en clasificación de emergencias?',           sev: 'moderada', norm: 'Res. 3100/2019 Est. 1' },
      { q: '¿Todo el personal tiene BLS (Basic Life Support) certificado y vigente?',              sev: 'moderada', norm: 'Res. 3100/2019 Est. 1' },
    ],
    dotacion: [
      { q: '¿El carro de paro está completo, sellado y con lista de chequeo del día en curso?',    sev: 'critica',  norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿El desfibrilador está operativo con baterías cargadas y verificación reciente?',      sev: 'critica',  norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿Hay oxígeno medicinal disponible y en cantidad suficiente?',                          sev: 'critica',  norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿Están disponibles medicamentos de urgencias (epinefrina, atropina, adenosina)?',     sev: 'critica',  norm: 'Res. 3100/2019 Est. 3' },
      { q: '¿Los equipos de inmovilización (collarín, tabla, férulas) están disponibles?',        sev: 'moderada', norm: 'Res. 3100/2019 Est. 2' },
    ],
    registros: [
      { q: '¿Cada paciente tiene historia clínica de urgencias completa desde el ingreso?',        sev: 'critica',  norm: 'Res. 1995/1999 · Res. 3100/2019' },
      { q: '¿Se registra el nivel de triage asignado y la hora de atención efectiva?',             sev: 'moderada', norm: 'Res. 3100/2019 Est. 6' },
      { q: '¿Las remisiones tienen formato completo con diagnóstico, estado y destino?',           sev: 'moderada', norm: 'Res. 3100/2019 Est. 7' },
      { q: '¿Los eventos adversos se reportan al sistema de farmacovigilancia?',                   sev: 'moderada', norm: 'Dec. 1011/2006 · Decreto 677/1995' },
    ],
  },

  quirurgicos: {
    documentacion: [
      { q: '¿El quirófano tiene habilitación específica vigente para procedimientos quirúrgicos?', sev: 'critica',  norm: 'Res. 3100/2019 Est. 5' },
      { q: '¿Existe protocolo de esterilización documentado y vigente?',                           sev: 'critica',  norm: 'Res. 3100/2019 Est. 5' },
      { q: '¿La lista de chequeo quirúrgica OMS está implementada en todos los casos?',            sev: 'critica',  norm: 'OMS · Res. 3100/2019' },
      { q: '¿Hay convenio activo con UCI para manejo postoperatorio complejo?',                    sev: 'critica',  norm: 'Res. 3100/2019 Est. 7' },
      { q: '¿El protocolo de manejo de emergencias anestésicas está disponible y vigente?',       sev: 'moderada', norm: 'Res. 3100/2019 Est. 6' },
    ],
    planta: [
      { q: '¿El quirófano tiene dimensiones mínimas de 36 m² con acabados lisos y lavables?',     sev: 'critica',  norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿Los flujos de circulación separan zona estéril, semirrestringida y no restringida?', sev: 'critica',  norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿La URPA (sala de recuperación) cuenta con monitor y oxígeno por puesto?',             sev: 'critica',  norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿La central de esterilización está físicamente separada del área quirúrgica?',         sev: 'moderada', norm: 'Res. 3100/2019 Est. 2' },
    ],
    talento: [
      { q: '¿El cirujano tiene especialización registrada en RETHUS para el procedimiento?',       sev: 'critica',  norm: 'RETHUS · Ley 23/1981' },
      { q: '¿El anestesiólogo tiene especialización registrada y está presente durante la cirugía?', sev: 'critica', norm: 'RETHUS · Res. 3100/2019' },
      { q: '¿La instrumentadora tiene título en instrumentación quirúrgica con tarjeta profesional?', sev: 'critica', norm: 'RETHUS · Ley 784/2002' },
    ],
    dotacion: [
      { q: '¿El autoclave de esterilización tiene control biológico semanal con registros?',       sev: 'critica',  norm: 'Res. 3100/2019 Est. 5' },
      { q: '¿El instrumental esterilizado tiene empaques íntegros y fecha de esterilización vigente?', sev: 'critica', norm: 'Res. 3100/2019 Est. 5' },
      { q: '¿El desfibrilador del quirófano está operativo y disponible en el área?',              sev: 'critica',  norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿Los equipos de anestesia tienen mantenimiento preventivo documentado y al día?',      sev: 'moderada', norm: 'Dec. 4725/2005' },
    ],
    registros: [
      { q: '¿Cada procedimiento tiene consentimiento informado específico firmado previamente?',   sev: 'critica',  norm: 'Ley 23/1981 · Res. 3100/2019' },
      { q: '¿Los registros quirúrgicos incluyen hallazgos, técnica, materiales y complicaciones?', sev: 'moderada', norm: 'Res. 1995/1999' },
      { q: '¿El conteo de gasas e instrumental está documentado en la nota quirúrgica?',           sev: 'moderada', norm: 'OMS Lista Chequeo' },
      { q: '¿Las notas de anestesia incluyen técnica, medicamentos, dosis y monitorización?',      sev: 'moderada', norm: 'Res. 1995/1999' },
    ],
  },

  laboratorio: {
    documentacion: [
      { q: '¿El laboratorio tiene habilitación vigente con resolución de la Secretaría de Salud?', sev: 'critica',  norm: 'Res. 3100/2019' },
      { q: '¿El laboratorio participa activamente en el PEEC del Ministerio de Salud?',            sev: 'critica',  norm: 'Res. 3100/2019 Est. 5 · PEEC' },
      { q: '¿El manual de procedimientos analíticos está disponible y actualizado?',               sev: 'moderada', norm: 'NTC-ISO 15189' },
      { q: '¿Existe mapa de riesgos biológicos del laboratorio documentado?',                      sev: 'moderada', norm: 'Res. 3100/2019 Est. 5' },
    ],
    planta: [
      { q: '¿Las áreas de toma de muestras y análisis están físicamente separadas?',               sev: 'moderada', norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿El laboratorio tiene zona de lavado exclusiva diferenciada del área analítica?',       sev: 'moderada', norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿Existe ventilación adecuada en el área de análisis y manejo de reactivos?',            sev: 'moderada', norm: 'Res. 3100/2019 Est. 2' },
    ],
    talento: [
      { q: '¿El bacteriólogo responsable tiene título y tarjeta profesional vigente en RETHUS?',   sev: 'critica',  norm: 'Ley 841/2003 · RETHUS' },
      { q: '¿El bacteriólogo firma todos los informes de resultados emitidos?',                    sev: 'critica',  norm: 'Ley 841/2003' },
      { q: '¿El personal tiene carné de vacunación con Hepatitis B completo?',                     sev: 'moderada', norm: 'Min. Trabajo · Riesgo biológico' },
    ],
    dotacion: [
      { q: '¿Los equipos de análisis tienen hojas de vida con calibraciones al día?',              sev: 'critica',  norm: 'Dec. 4725/2005 · NTC-ISO 15189' },
      { q: '¿Los reactivos están almacenados a temperatura adecuada y dentro del vencimiento?',    sev: 'critica',  norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿Existe gabinete de bioseguridad clase II operativo para muestras de riesgo?',         sev: 'moderada', norm: 'NTC-ISO 15189' },
    ],
    registros: [
      { q: '¿Los informes tienen: paciente, médico, bacteriólogo firmante y valores de referencia?', sev: 'critica', norm: 'Res. 1995/1999 · Ley 841/2003' },
      { q: '¿Existe sistema de valores críticos con notificación documentada al médico?',          sev: 'critica',  norm: 'NTC-ISO 15189' },
      { q: '¿Los registros de control de calidad interno están graficados y analizados?',          sev: 'moderada', norm: 'Westgard · PEEC' },
      { q: '¿Los rechazos de muestras tienen registro de motivo y notificación al solicitante?',   sev: 'menor',    norm: 'NTC-ISO 15189' },
    ],
  },

  odontologia: {
    documentacion: [
      { q: '¿El consultorio odontológico tiene habilitación vigente para los servicios que presta?', sev: 'critica', norm: 'Res. 3100/2019' },
      { q: '¿El protocolo de esterilización está documentado y visible en la central?',            sev: 'critica',  norm: 'Res. 3100/2019 Est. 5' },
      { q: '¿El equipo de rayos X tiene protocolo de radioprotección y registro de dosis?',        sev: 'moderada', norm: 'Res. 9031/1990 · Res. 4445/1996' },
    ],
    planta: [
      { q: '¿El consultorio permite circulación de silla de ruedas y tiene accesibilidad universal?', sev: 'moderada', norm: 'Ley 361/1997' },
      { q: '¿La central de esterilización tiene flujos definidos (sucio → limpio → estéril)?',    sev: 'critica',  norm: 'Res. 3100/2019 Est. 5' },
      { q: '¿El área de rayos X intraoral tiene blindaje verificado y señalización de radiación?', sev: 'critica',  norm: 'Res. 4445/1996' },
    ],
    talento: [
      { q: '¿El odontólogo tiene tarjeta profesional vigente en RETHUS?',                          sev: 'critica',  norm: 'Ley 35/1989 · RETHUS' },
      { q: '¿El auxiliar de odontología tiene certificado de auxiliar de consultorio odontológico?', sev: 'moderada', norm: 'Decreto 3616/2005' },
      { q: '¿El personal tiene carné de vacunación contra Hepatitis B completo?',                  sev: 'moderada', norm: 'Min. Trabajo' },
    ],
    dotacion: [
      { q: '¿La unidad odontológica (sillón, escupidera, lámpara, jeringa triple) está en buen estado?', sev: 'moderada', norm: 'Res. 3100/2019 Est. 2' },
      { q: '¿El autoclave clase B tiene control biológico semanal con registros vigentes?',        sev: 'critica',  norm: 'Res. 3100/2019 Est. 5' },
      { q: '¿Los guardianes para agujas dentales son seguros y no superan 3/4 de capacidad?',      sev: 'moderada', norm: 'Dec. 351/2014' },
    ],
    registros: [
      { q: '¿Cada paciente tiene historia clínica con odontograma actualizado?',                   sev: 'critica',  norm: 'Res. 1995/1999 · Res. 3100/2019' },
      { q: '¿Existe consentimiento informado específico para cada procedimiento?',                 sev: 'moderada', norm: 'Ley 23/1981' },
      { q: '¿Los ciclos de autoclave tienen registros de temperatura, presión y tiempo?',          sev: 'critica',  norm: 'Res. 3100/2019 Est. 5' },
    ],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Retorna el AEFaseData del servicio, fallback a 'general'. */
export function getAEFaseData(servicioId: string): AEFaseData {
  return AE_DB[servicioId as AEServicioId] ?? AE_DB.general;
}

/** Cuenta totales y por severidad en un AEFaseData. */
export function calcAEStats(faseData: AEFaseData, answers: Record<string, 'cumple' | 'nc' | 'na'>) {
  let total = 0, cumple = 0, criticas: AECriterio[] = [], moderadas: AECriterio[] = [], menores: AECriterio[] = [];

  AE_PHASES.forEach(phase => {
    const items = faseData[phase.id] ?? [];
    items.forEach((item, i) => {
      const key = `${phase.id}_${i}`;
      const ans = answers[key];
      if (!ans || ans === 'na') return;
      total++;
      if (ans === 'cumple') {
        cumple++;
      } else {
        if (item.sev === 'critica')  criticas.push(item);
        else if (item.sev === 'moderada') moderadas.push(item);
        else                         menores.push(item);
      }
    });
  });

  const score = total > 0 ? Math.round((cumple / total) * 100) : 0;
  const resultado =
    criticas.length > 0         ? 'CIERRE INMEDIATO'             :
    moderadas.length > 3        ? 'PLAN DE MEJORAMIENTO URGENTE' :
    score >= 80                 ? 'HABILITADO CON OBSERVACIONES' :
                                  'PLAN DE MEJORAMIENTO';

  return { total, cumple, score, criticas, moderadas, menores, resultado };
}
