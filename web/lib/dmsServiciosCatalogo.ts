/**
 * web/lib/dmsServiciosCatalogo.ts
 * Catálogo de documentos CONDICIONALES del Gestor Documental (DMS) — se
 * suman al catálogo base (FIRMA_CATALOGO, exigido a toda IPS sin importar
 * su portafolio) según los servicios/modalidades que la propia IPS declare
 * que presta. Así el gestor documental deja de mostrar la misma lista fija
 * a una IPS de solo consulta externa que a una con quirófanos, UCI o banco
 * de sangre.
 *
 * Los ids de servicio reutilizan las mismas claves, íconos y citas
 * normativas ya usadas en el módulo de Auditoría (web/data/auditData.ts,
 * SEGMENT_META) para no introducir una segunda taxonomía de "servicios" en
 * la app — la única adaptación es reemplazar la cita a la Res. 3100/2019
 * (derogada) por su reemplazo confirmado, la Res. 1732/2026 (ver informe de
 * investigación regulatoria de NormaLis, ago-2026 — mismos 7 estándares).
 *
 * IMPORTANTE — naturaleza de estos documentos: cada uno es un ESQUELETO
 * profesional (objetivo/alcance, marco normativo, secciones que el equipo
 * técnico de la IPS debe desarrollar, y bloque de aprobación) — no inventa
 * parámetros clínicos u operativos específicos (tiempos, umbrales, dosis)
 * que no se han verificado contra el texto primario de cada norma. Esto es
 * intencional: sella la estructura y la trazabilidad, no el contenido
 * clínico, que debe completar y validar la propia IPS.
 */

import { SEGMENT_META } from '@/data/auditData';
import { FIRMA_CATALOGO } from '@/lib/useFirma';

export type ServicioId = Exclude<keyof typeof SEGMENT_META, 'general'>;

/** Reemplaza la cita a la resolución derogada por su reemplazo confirmado,
 * sin mutar auditData.ts (ese módulo — Auditoría — no fue parte de este
 * cambio y se actualiza en una fase aparte). */
function normaActualizada(norm: string): string {
  return norm.replace(/Res\.\s*3100\/2019/g, 'Res. 1732/2026');
}

/** Etiqueta/ícono/norma de cada servicio — alimenta el selector "Servicios
 * que presta tu IPS" del Gestor Documental. */
export const SERVICIOS_IPS: Record<ServicioId, { label: string; icon: string; norma: string }> =
  Object.fromEntries(
    Object.entries(SEGMENT_META)
      .filter(([id]) => id !== 'general')
      .map(([id, meta]) => [id, { label: meta.label, icon: meta.icon, norma: normaActualizada(meta.norm) }])
  ) as Record<ServicioId, { label: string; icon: string; norma: string }>;

export const SERVICIO_IDS = Object.keys(SERVICIOS_IPS) as ServicioId[];

// ── Documentos que aplican solo si la IPS presta ese servicio ────────────────

export interface DocServicioMeta {
  id:        string;
  nombre:    string;
  base:      string;
  icono:     string;
  servicios: ServicioId[];
  secciones: string[]; // encabezados que el equipo técnico debe desarrollar
}

export const DOCUMENTOS_SERVICIO_CATALOGO: DocServicioMeta[] = [
  {
    id: 'srv_domiciliaria', nombre: 'Manual de Atención Domiciliaria',
    base: SERVICIOS_IPS.domiciliaria.norma, icono: SERVICIOS_IPS.domiciliaria.icon, servicios: ['domiciliaria'],
    secciones: [
      'Criterios de ingreso y egreso del programa domiciliario',
      'Valoración del riesgo del entorno (caídas, barreras, cuidador disponible)',
      'Disponibilidad y tiempos de respuesta del equipo (línea 24/7)',
      'Cadena de frío y transporte de medicamentos e insumos al domicilio',
      'Indicadores propios: reingresos hospitalarios, adherencia, satisfacción del cuidador',
    ],
  },
  {
    id: 'srv_imagenologia', nombre: 'Manual de Protección Radiológica e Imágenes Diagnósticas',
    base: SERVICIOS_IPS.imagenologia.norma, icono: SERVICIOS_IPS.imagenologia.icon, servicios: ['imagenologia'],
    secciones: [
      'Licencia de la autoridad competente para uso de equipos de radiación ionizante',
      'Programa de protección radiológica y dosimetría del personal ocupacionalmente expuesto',
      'Control de calidad e inventario de equipos (referenciado a Tecnovigilancia)',
      'Criterios de justificación clínica del estudio y consentimiento cuando aplique',
      'Tiempos de entrega de resultados por tipo de estudio (urgente / rutina)',
    ],
  },
  {
    id: 'srv_urgencias', nombre: 'Protocolo de Triage y Clasificación de Urgencias',
    base: SERVICIOS_IPS.urgencias.norma, icono: SERVICIOS_IPS.urgencias.icon, servicios: ['urgencias'],
    secciones: [
      'Sistema de triage adoptado (5 niveles) y responsable de la clasificación',
      'Tiempos máximos de espera por nivel de triage y su seguimiento',
      'Disponibilidad de médico las 24 horas y criterios de activación de respaldo',
      'Ruta de atención prioritaria (gestantes, menores de 5 años, adultos mayores, discapacidad)',
      'Articulación con Referencia y Contrarreferencia para traslados',
    ],
  },
  {
    id: 'srv_internacion', nombre: 'Protocolo de Prevención y Control de IAAS en Hospitalización',
    base: SERVICIOS_IPS.internacion.norma, icono: SERVICIOS_IPS.internacion.icon, servicios: ['internacion'],
    secciones: [
      'Vigilancia epidemiológica de infecciones asociadas a la atención en salud (IAAS)',
      'Precauciones de aislamiento por mecanismo de transmisión',
      'Indicadores de estancia hospitalaria, reingreso ≤30 días y mortalidad',
      'Inducción del personal de hospitalización y verificación de competencias',
      'Ronda de seguridad y reporte de eventos adversos del servicio',
    ],
  },
  {
    id: 'srv_quirurgicos', nombre: 'Lista de Verificación de Cirugía Segura (OMS) y Protocolo Quirúrgico',
    base: SERVICIOS_IPS.quirurgicos.norma, icono: SERVICIOS_IPS.quirurgicos.icon, servicios: ['quirurgicos'],
    secciones: [
      'Lista de verificación OMS aplicada en entrada, pausa quirúrgica y salida',
      'Consentimiento informado específico del procedimiento y del acto anestésico',
      'Conteo de gasas e instrumental, y manejo de eventos de cuerpo extraño retenido',
      'Articulación con la Central de Esterilización para instrumental',
      'Indicadores: infección de sitio quirúrgico, cancelación de cirugías, reintervenciones',
    ],
  },
  {
    id: 'srv_laboratorio', nombre: 'Manual de Bioseguridad y Control de Calidad del Laboratorio Clínico',
    base: SERVICIOS_IPS.laboratorio.norma, icono: SERVICIOS_IPS.laboratorio.icon, servicios: ['laboratorio'],
    secciones: [
      'Fase preanalítica: identificación del paciente y de la muestra',
      'Control de calidad interno y participación en el Programa de Evaluación Externa (PEEC)',
      'Bioseguridad específica del laboratorio (manejo de muestras biológicas)',
      'Tiempos de entrega de resultados por tipo de examen (urgente / rutina)',
      'Cadena de custodia y trazabilidad de la muestra hasta el resultado',
    ],
  },
  {
    id: 'srv_transporte', nombre: 'Manual de Transporte Asistencial de Pacientes',
    base: SERVICIOS_IPS.transporte.norma, icono: SERVICIOS_IPS.transporte.icon, servicios: ['transporte'],
    secciones: [
      'Tipo de vehículo (básico/medicalizado) y dotación mínima verificada',
      'Certificación del personal (BLS/ACLS según nivel de complejidad del traslado)',
      'Coordinación operativa y comunicación durante el traslado',
      'Condiciones especiales (temperatura controlada, traslados neonatales) si aplica',
      'Registro y reporte de novedades ocurridas durante el traslado',
    ],
  },
  {
    id: 'srv_rehabilitacion', nombre: 'Protocolo de Rehabilitación y Terapias',
    base: SERVICIOS_IPS.rehabilitacion.norma, icono: SERVICIOS_IPS.rehabilitacion.icon, servicios: ['rehabilitacion'],
    secciones: [
      'Valoración inicial y plan de tratamiento individualizado',
      'Tarjeta profesional vigente del terapeuta en RETHUS según su profesión',
      'Adaptación de ayudas técnicas y seguimiento funcional',
      'Indicadores: cambio en escala funcional, tasa de abandono, satisfacción',
      'Vínculo con PAMEC: planes de mejoramiento del servicio',
    ],
  },
  {
    id: 'srv_salud_mental', nombre: 'Protocolo de Atención y Contención en Salud Mental',
    base: SERVICIOS_IPS.salud_mental.norma, icono: SERVICIOS_IPS.salud_mental.icon, servicios: ['salud_mental'],
    secciones: [
      'Disponibilidad de profesional para atención de crisis fuera de horario habitual',
      'Protocolo de contención (verbal, farmacológica, mecánica) y su registro',
      'Confidencialidad reforzada de la historia clínica de salud mental',
      'Ruta de remisión a mayor complejidad y a línea de salud mental territorial',
      'Consentimiento informado y participación del paciente/familia en el plan',
    ],
  },
  {
    id: 'srv_odontologia', nombre: 'Manual de Bioseguridad y Protocolo Odontológico',
    base: SERVICIOS_IPS.odontologia.norma, icono: SERVICIOS_IPS.odontologia.icon, servicios: ['odontologia'],
    secciones: [
      'Bioseguridad específica del consultorio odontológico (aerosoles, instrumental cortante)',
      'Esterilización y trazabilidad del instrumental odontológico',
      'Manejo de residuos de amalgama/mercurio si aplica',
      'Tarjeta profesional vigente en RETHUS del equipo odontológico',
      'Consentimiento informado de procedimientos odontológicos',
    ],
  },
  {
    id: 'srv_cuidado_intensivo', nombre: 'Protocolo de Manejo del Paciente Crítico en UCI',
    base: SERVICIOS_IPS.cuidado_intensivo.norma, icono: SERVICIOS_IPS.cuidado_intensivo.icon, servicios: ['cuidado_intensivo'],
    secciones: [
      'Criterios de ingreso, egreso y triage de camas de cuidado intensivo',
      'Relación enfermera-paciente y disponibilidad de intensivista/especialista',
      'Prevención de eventos asociados a dispositivos invasivos (IAD)',
      'Comunicación con familiares y toma de decisiones al final de la vida',
      'Indicadores: mortalidad ajustada, tasa de reingreso a UCI, ocupación',
    ],
  },
  {
    id: 'srv_obstetricia', nombre: 'Protocolo de Atención del Parto y Código Rojo Obstétrico',
    base: SERVICIOS_IPS.obstetricia.norma, icono: SERVICIOS_IPS.obstetricia.icon, servicios: ['obstetricia'],
    secciones: [
      'Plan de parto y acompañamiento durante el trabajo de parto',
      'Activación de código rojo (hemorragia obstétrica) y roles del equipo',
      'Atención inmediata del recién nacido y contacto piel a piel',
      'Articulación con banco de sangre / servicio transfusional',
      'Indicadores: mortalidad materna/perinatal, cesáreas, complicaciones',
    ],
  },
  {
    id: 'srv_banco_sangre', nombre: 'Manual de Medicina Transfusional y Banco de Sangre',
    base: SERVICIOS_IPS.banco_sangre.norma, icono: SERVICIOS_IPS.banco_sangre.icon, servicios: ['banco_sangre'],
    secciones: [
      'Selección del donante y tamizaje de componentes sanguíneos',
      'Cadena de frío y trazabilidad de la unidad hasta el paciente transfundido',
      'Consentimiento informado de la transfusión y verificación de compatibilidad',
      'Manejo y reporte de reacciones adversas a la transfusión',
      'Convenio o acceso a banco de sangre externo si el servicio es solo transfusional',
    ],
  },
  {
    id: 'srv_oncologia', nombre: 'Protocolo de Manejo Seguro de Medicamentos Oncológicos',
    base: SERVICIOS_IPS.oncologia.norma, icono: SERVICIOS_IPS.oncologia.icon, servicios: ['oncologia'],
    secciones: [
      'Preparación segura de mezclas oncológicas (cabina de bioseguridad, EPP)',
      'Doble verificación de la orden y de la dosis antes de administrar',
      'Manejo de derrames y residuos citotóxicos',
      'Consentimiento informado del esquema de tratamiento',
      'Indicadores: eventos adversos por medicamento oncológico, adherencia al esquema',
    ],
  },
  {
    id: 'srv_hemodialisis', nombre: 'Manual del Servicio de Terapia Renal (Hemodiálisis)',
    base: SERVICIOS_IPS.hemodialisis.norma, icono: SERVICIOS_IPS.hemodialisis.icon, servicios: ['hemodialisis'],
    secciones: [
      'Calidad del agua para diálisis y su monitoreo periódico',
      'Prevención de infecciones asociadas al acceso vascular',
      'Plan de manejo de urgencias durante la sesión (hipotensión, arritmias)',
      'Programa de vacunación específico del paciente renal crónico',
      'Indicadores: adecuación de la diálisis, tasa de infección del acceso',
    ],
  },
  {
    id: 'srv_farmacia', nombre: 'Manual del Servicio Farmacéutico',
    base: SERVICIOS_IPS.farmacia.norma, icono: SERVICIOS_IPS.farmacia.icon, servicios: ['farmacia'],
    secciones: [
      'Químico Farmacéutico responsable con tarjeta profesional vigente en RETHUS',
      'Cadena de frío para medicamentos que la requieran',
      'Gestión de medicamentos de control especial (recetario, custodia)',
      'Farmacovigilancia: reporte de eventos adversos a medicamentos',
      'Reconciliación de medicamentos en las transiciones de cuidado',
    ],
  },
  {
    id: 'srv_vacunacion', nombre: 'Protocolo de Cadena de Frío y PAI',
    base: SERVICIOS_IPS.vacunacion.norma, icono: SERVICIOS_IPS.vacunacion.icon, servicios: ['vacunacion'],
    secciones: [
      'Cadena de frío: registro de temperatura y plan de contingencia ante falla',
      'Esquema de vacunación PAI vigente y responsable de su actualización',
      'Manejo de biológicos: recepción, almacenamiento y descarte de sobrantes',
      'Vacunación fuera del servicio habilitado — registro clínico y trazabilidad (Res. 465/2025 Art. 7)',
      'Notificación de eventos supuestamente atribuibles a la vacunación (ESAVI)',
    ],
  },
  {
    id: 'srv_telemedicina', nombre: 'Protocolo de Telemedicina y Teleconsulta',
    base: SERVICIOS_IPS.telemedicina.norma, icono: SERVICIOS_IPS.telemedicina.icon, servicios: ['telemedicina'],
    secciones: [
      'Modalidad de telemedicina prestada (telexperticia, teleorientación, teleconsulta)',
      'Consentimiento informado específico de la atención no presencial',
      'Seguridad y confidencialidad de la plataforma y de los datos transmitidos',
      'Criterios de remisión a atención presencial cuando el caso lo requiera',
      'Registro en la historia clínica de la atención prestada por telemedicina',
    ],
  },
  {
    id: 'srv_esterilizacion', nombre: 'Manual de la Central de Esterilización',
    base: SERVICIOS_IPS.esterilizacion.norma, icono: SERVICIOS_IPS.esterilizacion.icon, servicios: ['esterilizacion'],
    secciones: [
      'Flujo unidireccional: recepción, lavado, empaque, esterilización, almacenamiento',
      'Validación del proceso de esterilización (indicadores físicos, químicos, biológicos)',
      'Trazabilidad del instrumental por paquete y por paciente',
      'Mantenimiento y calibración de autoclaves (referenciado a Tecnovigilancia)',
      'Capacitación específica del personal de la central',
    ],
  },
  {
    id: 'srv_trasplante', nombre: 'Manual del Programa de Trasplante de Órganos y Tejidos',
    base: SERVICIOS_IPS.trasplante.norma, icono: SERVICIOS_IPS.trasplante.icon, servicios: ['trasplante'],
    secciones: [
      'Articulación con la Red de Donación y Trasplantes (Coordinación Nacional)',
      'Consentimiento informado del donante vivo y/o del receptor',
      'Criterios de asignación y lista de espera',
      'Seguimiento post-trasplante del receptor',
      'Reporte a las autoridades de vigilancia y control correspondientes',
    ],
  },
];

// ── Catálogo combinado (base + condicionales) — un solo punto de consulta ────

export interface CatalogoDMSEntry {
  id:         string;
  nombre:     string;
  base:       string;
  icono:      string;
  servicios?: ServicioId[]; // undefined = documento base, exigido a toda IPS
  secciones?: string[];
}

/** Catálogo completo del Gestor Documental: los documentos base (toda IPS,
 * de FIRMA_CATALOGO) + los condicionales por servicio de este archivo.
 * Único punto que useDocumentosDMS.ts y documentos-dms/page.tsx deben usar
 * para resolver nombre/base/ícono de un docId — evita tener el mismo
 * `.find()` repetido y desalineado en varios archivos. */
export function catalogoDMSCompleto(): CatalogoDMSEntry[] {
  return [
    ...FIRMA_CATALOGO.map(c => ({ id: c.id as string, nombre: c.nombre, base: c.base, icono: c.icono })),
    ...DOCUMENTOS_SERVICIO_CATALOGO,
  ];
}

// ── Salvaguarda en desarrollo ──────────────────────────────────────────────
// `ServicioId` se resuelve a `string` en tiempo de compilación (SEGMENT_META
// está tipado como Record<string, ...> en auditData.ts, así que TypeScript
// no puede detectar un id de servicio mal escrito). Esta validación en
// tiempo de carga es la red de seguridad real: si alguien agrega una entrada
// nueva a DOCUMENTOS_SERVICIO_CATALOGO con un id de servicio que no existe
// en SEGMENT_META, ese documento quedaría huérfano (nunca aparece para
// ninguna IPS) sin que nada lo avise — esto lo avisa fuerte en consola de
// desarrollo en vez de fallar en silencio.
if (process.env.NODE_ENV !== 'production') {
  const idsValidos = new Set(Object.keys(SEGMENT_META));
  for (const docConGrupo of DOCUMENTOS_SERVICIO_CATALOGO) {
    for (const servicioId of docConGrupo.servicios) {
      if (!idsValidos.has(servicioId)) {
        // eslint-disable-next-line no-console
        console.error(
          `[dmsServiciosCatalogo] "${docConGrupo.id}" referencia el servicio "${servicioId}", que no existe en SEGMENT_META (web/data/auditData.ts) — este documento nunca aparecerá en el Gestor Documental. Revisa el typo.`
        );
      }
    }
  }
}
