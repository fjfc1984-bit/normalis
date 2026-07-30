// web/lib/sstCatalog.ts
// Catálogo de estándares mínimos SG-SST — Res. 0312/2019
// Fuente: normalis-sst.js (espejo TypeScript, sin lógica)

import type { SSTEstandar, SSTFase } from './sstTypes';

export const SST_ESTANDARES: Record<SSTFase, SSTEstandar> = {

  // ─── FASE I — Menos de 10 trabajadores, Riesgo I y II ──────────────────────
  fase1: {
    label: 'Fase I — Menos de 10 trabajadores (Riesgo I y II)',
    total_puntos: 100,
    nota: 'Artículo 3 Res. 0312/2019 — 7 criterios mínimos',
    grupos: [
      {
        id: 'f1_recursos', nombre: 'I. Recursos (10 pts)', puntos: 10,
        items: [
          { id: 'f1_01', num: '1.1.1', texto: 'Responsable del SG-SST asignado, con formación mínima de 50 horas en SST', puntos: 10 },
        ],
      },
      {
        id: 'f1_gestion', nombre: 'II. Gestión Integral del SG-SST (15 pts)', puntos: 15,
        items: [
          { id: 'f1_02', num: '2.1.1', texto: 'Política de SST vigente, firmada por la alta dirección, fechada, comunicada y publicada', puntos: 5 },
          { id: 'f1_03', num: '2.2.1', texto: 'Objetivos del SG-SST definidos, medibles, cuantificables y con metas claras', puntos: 5 },
          { id: 'f1_04', num: '2.4.1', texto: 'Evaluación inicial del SG-SST realizada con identificación de prioridades (año en curso)', puntos: 5 },
        ],
      },
      {
        id: 'f1_salud', nombre: 'III. Gestión de la Salud (20 pts)', puntos: 20,
        items: [
          { id: 'f1_05', num: '3.1.1', texto: 'Evaluación médica ocupacional de ingreso realizada y documentada', puntos: 5 },
          { id: 'f1_06', num: '3.1.4', texto: 'Afiliación al SGSS: ARL, EPS y Fondo de Pensiones de todos los trabajadores', puntos: 5 },
          { id: 'f1_07', num: '3.1.6', texto: 'Restricciones y recomendaciones médico-laborales comunicadas al trabajador y al empleador', puntos: 5 },
          { id: 'f1_08', num: '3.1.3', texto: 'Información al médico evaluador sobre los perfiles de cargo y los riesgos específicos', puntos: 5 },
        ],
      },
      {
        id: 'f1_peligros', nombre: 'IV. Gestión de Peligros y Riesgos (30 pts)', puntos: 30,
        items: [
          { id: 'f1_09', num: '4.1.1', texto: 'Identificación de peligros con participación de todos los niveles de la empresa', puntos: 10 },
          { id: 'f1_10', num: '4.2.5', texto: 'Mantenimiento preventivo, predictivo y correctivo de instalaciones, equipos y herramientas', puntos: 10 },
          { id: 'f1_11', num: '4.2.6', texto: 'Entrega y uso de EPP a trabajadores según exposición, con registros de entrega firmados', puntos: 10 },
        ],
      },
      {
        id: 'f1_amenazas', nombre: 'V. Gestión de Amenazas (10 pts)', puntos: 10,
        items: [
          { id: 'f1_12', num: '5.1.1', texto: 'Plan de prevención, preparación y respuesta ante emergencias documentado e implementado', puntos: 10 },
        ],
      },
      {
        id: 'f1_verificar', nombre: 'VI. Verificación del SG-SST (5 pts)', puntos: 5,
        items: [
          { id: 'f1_13', num: '6.1.1', texto: 'Acciones preventivas y/o correctivas documentadas ante identificación de no conformidades', puntos: 5 },
        ],
      },
      {
        id: 'f1_actuar', nombre: 'VII. Mejoramiento continuo (10 pts)', puntos: 10,
        items: [
          { id: 'f1_14', num: '7.1.1', texto: 'Acciones de mejora implementadas con base en resultados del SG-SST y verificadas', puntos: 10 },
        ],
      },
    ],
  },

  // ─── FASE II — 11 a 50 trabajadores ────────────────────────────────────────
  fase2: {
    label: 'Fase II — 11 a 50 trabajadores (o <10 con Riesgo III-V)',
    total_puntos: 100,
    nota: 'Artículo 4 Res. 0312/2019 — 21 criterios mínimos',
    grupos: [
      {
        id: 'f2_recursos', nombre: 'I. Recursos (10 pts)', puntos: 10,
        items: [
          { id: 'f2_01', num: '1.1.1', texto: 'Responsable del SG-SST con licencia en Salud Ocupacional vigente y formación mínima 50 horas', puntos: 4 },
          { id: 'f2_02', num: '1.1.3', texto: 'Vigía SST o COPASST: elegido, registrado ante el Ministerio y en funcionamiento activo', puntos: 4 },
          { id: 'f2_03', num: '1.1.7', texto: 'Programa de capacitación anual en SST documentado y con evidencia de ejecución', puntos: 2 },
        ],
      },
      {
        id: 'f2_gestion', nombre: 'II. Gestión Integral (15 pts)', puntos: 15,
        items: [
          { id: 'f2_04', num: '2.1.1', texto: 'Política de SST vigente, firmada, publicada y comunicada a todos los trabajadores', puntos: 3 },
          { id: 'f2_05', num: '2.2.1', texto: 'Objetivos del SG-SST medibles, cuantificables y coherentes con la política de SST', puntos: 3 },
          { id: 'f2_06', num: '2.3.1', texto: 'Evaluación inicial del SG-SST documentada y actualizada en el año en curso', puntos: 3 },
          { id: 'f2_07', num: '2.4.1', texto: 'Plan anual de trabajo del SG-SST con metas, responsables, recursos y cronograma', puntos: 3 },
          { id: 'f2_08', num: '2.5.1', texto: 'Archivo y retención documental del SG-SST establecido conforme normatividad vigente', puntos: 3 },
        ],
      },
      {
        id: 'f2_salud', nombre: 'III. Gestión de la Salud (20 pts)', puntos: 20,
        items: [
          { id: 'f2_09', num: '3.1.4', texto: 'Afiliación al SGSS de todos los trabajadores (ARL, EPS, AFP) actualizada', puntos: 4 },
          { id: 'f2_10', num: '3.1.1', texto: 'Exámenes médicos ocupacionales: ingreso, periódicos y egreso realizados y documentados', puntos: 4 },
          { id: 'f2_11', num: '3.1.2', texto: 'Actividades de promoción y prevención en salud ejecutadas con evidencia (cronograma)', puntos: 4 },
          { id: 'f2_12', num: '3.1.5', texto: 'Custodia y confidencialidad de historias clínicas ocupacionales garantizada', puntos: 4 },
          { id: 'f2_13', num: '3.1.6', texto: 'Restricciones y recomendaciones médico-laborales implementadas y verificadas', puntos: 4 },
        ],
      },
      {
        id: 'f2_peligros', nombre: 'IV. Gestión de Peligros y Riesgos (30 pts)', puntos: 30,
        items: [
          { id: 'f2_14', num: '4.1.1', texto: 'Identificación de peligros en todos los cargos y áreas con metodología definida (GTC-45)', puntos: 6 },
          { id: 'f2_15', num: '4.1.3', texto: 'Evaluación y valoración de los riesgos con criterios de probabilidad, exposición y consecuencia', puntos: 6 },
          { id: 'f2_16', num: '4.2.1', texto: 'Medidas de prevención y control de peligros implementadas según jerarquía (eliminación→EPP)', puntos: 6 },
          { id: 'f2_17', num: '4.2.5', texto: 'Mantenimiento preventivo de instalaciones, equipos y herramientas con cronograma', puntos: 6 },
          { id: 'f2_18', num: '4.2.6', texto: 'Entrega de EPP con registros de entrega firmados y seguimiento al uso correcto', puntos: 6 },
        ],
      },
      {
        id: 'f2_amenazas', nombre: 'V. Gestión de Amenazas (10 pts)', puntos: 10,
        items: [
          { id: 'f2_19', num: '5.1.1', texto: 'Plan de emergencias documentado: análisis amenazas, recursos, señalización y procedimientos', puntos: 5 },
          { id: 'f2_20', num: '5.1.2', texto: 'Brigadas de emergencias conformadas, capacitadas y dotadas (mínimo primeros auxilios)', puntos: 5 },
        ],
      },
      {
        id: 'f2_verificar', nombre: 'VI. Verificación (5 pts)', puntos: 5,
        items: [
          { id: 'f2_21', num: '6.1.1', texto: 'Investigación de accidentes e incidentes de trabajo realizada con metodología (5 porqués / árbol)', puntos: 3 },
          { id: 'f2_22', num: '6.1.1', texto: 'Identificación de causas de incidentes, AT y enfermedades laborales con medidas correctivas', puntos: 2 },
        ],
      },
      {
        id: 'f2_actuar', nombre: 'VII. Mejoramiento (10 pts)', puntos: 10,
        items: [
          { id: 'f2_23', num: '7.1.1', texto: 'Acciones preventivas y correctivas del SG-SST documentadas, implementadas y verificadas', puntos: 5 },
          { id: 'f2_24', num: '7.1.2', texto: 'Revisión anual del SG-SST por la alta dirección con resultados y compromisos documentados', puntos: 5 },
        ],
      },
    ],
  },

  // ─── FASE III — Más de 50 trabajadores ─────────────────────────────────────
  fase3: {
    label: 'Fase III — Más de 50 trabajadores (o >10 con Riesgo III-V)',
    total_puntos: 100,
    nota: 'Artículo 5 Res. 0312/2019 — 60 estándares completos (ciclo PHVA)',
    grupos: [
      {
        id: 'f3_recursos', nombre: 'PLANEAR — Recursos (10 pts)', puntos: 10,
        items: [
          { id: 'f3_01', num: '1.1.1', texto: 'Responsable del SG-SST con licencia en Salud Ocupacional vigente y dedicación al cargo', puntos: 2 },
          { id: 'f3_02', num: '1.1.2', texto: 'Responsabilidades del SG-SST asignadas y documentadas en todos los niveles jerárquicos', puntos: 2 },
          { id: 'f3_03', num: '1.1.3', texto: 'COPASST: conformado, registrado, en funcionamiento y con actas de reunión mensuales', puntos: 4 },
          { id: 'f3_04', num: '1.1.4', texto: 'Comité de Convivencia Laboral: conformado, capacitado y con plan de trabajo', puntos: 1 },
          { id: 'f3_05', num: '1.1.7', texto: 'Programa de capacitación anual en SST ejecutado con evaluación de efectividad', puntos: 1 },
        ],
      },
      {
        id: 'f3_gestion', nombre: 'PLANEAR — Gestión Integral del SG-SST (15 pts)', puntos: 15,
        items: [
          { id: 'f3_06', num: '2.1.1', texto: 'Política de SST: revisada al menos 1 vez/año, comunicada, firmada y publicada', puntos: 1 },
          { id: 'f3_07', num: '2.2.1', texto: 'Objetivos del SG-SST: medibles, cuantificables, con indicadores y metas claras', puntos: 1 },
          { id: 'f3_08', num: '2.3.1', texto: 'Evaluación inicial del SG-SST actualizada (ciclo PHVA, metodología establecida)', puntos: 1 },
          { id: 'f3_09', num: '2.4.1', texto: 'Plan anual de trabajo con metas, indicadores, responsables, recursos y cronograma', puntos: 2 },
          { id: 'f3_10', num: '2.5.1', texto: 'Conservación de documentos del SG-SST: control de versiones y archivo físico/digital', puntos: 2 },
          { id: 'f3_11', num: '2.6.1', texto: 'Rendición de cuentas del SG-SST realizada anualmente con evidencia documentada', puntos: 1 },
          { id: 'f3_12', num: '2.7.1', texto: 'Normatividad nacional vigente aplicable al SG-SST identificada y actualizada', puntos: 2 },
          { id: 'f3_13', num: '2.8.1', texto: 'Mecanismos de comunicación SST definidos (carteleras, reuniones, intranet, correo)', puntos: 1 },
          { id: 'f3_14', num: '2.9.1', texto: 'Identificación y evaluación de impacto SST en adquisición de bienes y contratación', puntos: 1 },
          { id: 'f3_15', num: '2.10.1', texto: 'Evaluación y selección de proveedores y contratistas con criterios SST documentados', puntos: 1 },
          { id: 'f3_16', num: '2.11.1', texto: 'Evaluación del impacto de cambios internos y externos sobre el SG-SST', puntos: 2 },
        ],
      },
      {
        id: 'f3_salud', nombre: 'PLANEAR — Gestión de la Salud (20 pts)', puntos: 20,
        items: [
          { id: 'f3_17', num: '3.1.1', texto: 'Evaluación médica ocupacional: ingreso, periódicos, retiro y por cambio de ocupación', puntos: 4 },
          { id: 'f3_18', num: '3.1.2', texto: 'Actividades de promoción y prevención en salud ejecutadas conforme programa anual', puntos: 4 },
          { id: 'f3_19', num: '3.1.3', texto: 'Información al médico evaluador sobre perfiles de cargo, riesgos y condiciones de trabajo', puntos: 1 },
          { id: 'f3_20', num: '3.1.4', texto: 'Afiliación al SGSS (ARL, EPS, AFP, CCF) completa y al día para todos los trabajadores', puntos: 4 },
          { id: 'f3_21', num: '3.1.5', texto: 'Custodia de historias clínicas ocupacionales con IPS o médico autorizado y confidencialidad garantizada', puntos: 3 },
          { id: 'f3_22', num: '3.1.6', texto: 'Restricciones y recomendaciones médico-laborales implementadas y verificadas en el puesto', puntos: 3 },
          { id: 'f3_23', num: '3.1.7', texto: 'Programa de estilos de vida y entornos saludables (hábitos alimenticios, pausas activas, ergonomía)', puntos: 1 },
        ],
      },
      {
        id: 'f3_peligros', nombre: 'HACER — Gestión de Peligros y Riesgos (30 pts)', puntos: 30,
        items: [
          { id: 'f3_24', num: '4.1.1', texto: 'Metodología documentada para identificación, evaluación y valoración de peligros (GTC-45 o equivalente)', puntos: 4 },
          { id: 'f3_25', num: '4.1.2', texto: 'Identificación de peligros en todos los procesos, cargos, turnos y áreas de la empresa', puntos: 4 },
          { id: 'f3_26', num: '4.1.3', texto: 'Identificación y priorización de la naturaleza de los peligros con participación de trabajadores', puntos: 3 },
          { id: 'f3_27', num: '4.1.4', texto: 'Mediciones ambientales (higiene industrial) realizadas para peligros prioritarios (ruido, químico, etc.)', puntos: 4 },
          { id: 'f3_28', num: '4.2.1', texto: 'Medidas de prevención y control implementadas según jerarquía: eliminación, sustitución, control ingenieril, control admin, EPP', puntos: 5 },
          { id: 'f3_29', num: '4.2.2', texto: 'Verificación y seguimiento a la aplicación de medidas de prevención y control', puntos: 2 },
          { id: 'f3_30', num: '4.2.3', texto: 'Procedimientos seguros de trabajo, instructivos, protocolos y fichas de seguridad documentados', puntos: 2 },
          { id: 'f3_31', num: '4.2.4', texto: 'Inspecciones sistemáticas de seguridad con participación del COPASST y listas de chequeo', puntos: 2 },
          { id: 'f3_32', num: '4.2.5', texto: 'Mantenimiento preventivo, predictivo y correctivo de instalaciones, equipos y herramientas con cronograma', puntos: 2 },
          { id: 'f3_33', num: '4.2.6', texto: 'Entrega de EPP con verificación del uso correcto, reposición oportuna y registros firmados', puntos: 2 },
        ],
      },
      {
        id: 'f3_amenazas', nombre: 'HACER — Gestión de Amenazas (10 pts)', puntos: 10,
        items: [
          { id: 'f3_34', num: '5.1.1', texto: 'Plan de prevención y preparación ante emergencias: análisis vulnerabilidad, recursos, señalización, procedimientos por tipo de evento', puntos: 5 },
          { id: 'f3_35', num: '5.1.2', texto: 'Brigadas de emergencias (contra incendio, primeros auxilios, evacuación) conformadas, capacitadas, dotadas y con simulacro ≥1/año', puntos: 5 },
        ],
      },
      {
        id: 'f3_verificar', nombre: 'VERIFICAR (5 pts)', puntos: 5,
        items: [
          { id: 'f3_36', num: '6.1.1', texto: 'Medición y seguimiento de indicadores de estructura, proceso y resultado del SG-SST', puntos: 1.25 },
          { id: 'f3_37', num: '6.1.2', texto: 'Auditoría al SG-SST realizada al menos 1 vez/año con informe, plan de mejora y seguimiento', puntos: 1.25 },
          { id: 'f3_38', num: '6.1.3', texto: 'Revisión anual del SG-SST por la alta dirección con compromisos, responsables y plazos', puntos: 1.25 },
          { id: 'f3_39', num: '6.1.4', texto: 'Planificación de auditorías del SG-SST con participación del COPASST', puntos: 1.25 },
        ],
      },
      {
        id: 'f3_actuar', nombre: 'ACTUAR — Mejoramiento (10 pts)', puntos: 10,
        items: [
          { id: 'f3_40', num: '7.1.1', texto: 'Acciones de PYP definidas con base en resultados del SG-SST, AT, EL, inspecciones y auditorías', puntos: 5 },
          { id: 'f3_41', num: '7.1.2', texto: 'Acciones correctivas, preventivas y de mejora: implementadas, con seguimiento y cierre verificado', puntos: 5 },
        ],
      },
    ],
  },
};

// Tipos de vencimientos predefinidos
export const SST_VENCIMIENTOS_TIPO = [
  { id: 'exam_ingreso',   label: 'Examen médico de ingreso',                  frecuencia: 'Antes de iniciar labores' },
  { id: 'exam_periodico', label: 'Examen médico periódico',                   frecuencia: 'Anual o según concepto médico' },
  { id: 'exam_egreso',    label: 'Examen médico de egreso',                   frecuencia: 'Al finalizar contrato' },
  { id: 'copasst',        label: 'Reunión COPASST / Vigía SST',               frecuencia: 'Mensual obligatoria' },
  { id: 'comite_conv',    label: 'Reunión Comité de Convivencia Laboral',     frecuencia: 'Bimensual mínimo' },
  { id: 'simulacro',      label: 'Simulacro de emergencias',                  frecuencia: 'Mínimo 1 vez al año' },
  { id: 'capacitacion',   label: 'Capacitación SST al personal',              frecuencia: 'Según programa anual' },
  { id: 'induccion',      label: 'Inducción SST a nuevo personal',            frecuencia: 'Antes de iniciar funciones' },
  { id: 'inspeccion',     label: 'Inspección de seguridad',                   frecuencia: 'Mensual / según cronograma' },
  { id: 'epp',            label: 'Reposición de EPP',                         frecuencia: 'Según vida útil del equipo' },
  { id: 'matriz_pelig',   label: 'Actualización matriz de peligros (GTC-45)', frecuencia: 'Anual o ante cambios' },
  { id: 'plan_emerg',     label: 'Actualización plan de emergencias',         frecuencia: 'Anual o ante cambios de instalaciones' },
  { id: 'revision_alta',  label: 'Revisión del SG-SST por alta dirección',    frecuencia: 'Anual mínimo' },
  { id: 'auditoria',      label: 'Auditoría interna SG-SST',                  frecuencia: 'Anual mínimo' },
  { id: 'elecciones_cop', label: 'Elecciones COPASST',                        frecuencia: 'Cada 2 años' },
  { id: 'elecciones_ccl', label: 'Elecciones Comité Convivencia Laboral',     frecuencia: 'Cada 2 años' },
];
