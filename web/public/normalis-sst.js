// normalis-sst.js
// NormaLis — Módulo SG-SST (Sistema de Gestión de Seguridad y Salud en el Trabajo)
// Res. 0312/2019 · Decreto 1072/2015 — Ministerio de Trabajo Colombia
// ─────────────────────────────────────────────

// ═══════════════════════════════════════════
// ESTÁNDARES MÍNIMOS — RES. 0312/2019 (COMPLETOS)
// ═══════════════════════════════════════════

const SST_ESTANDARES = {

  // ─── FASE I — Menos de 10 trabajadores, Riesgo I y II ─────────────────────
  fase1: {
    label: 'Fase I — Menos de 10 trabajadores (Riesgo I y II)',
    total_puntos: 100,
    nota: 'Artículo 3 Res. 0312/2019 — 7 criterios mínimos',
    grupos: [
      {
        id: 'f1_recursos', nombre: 'I. Recursos (10 pts)', puntos: 10,
        items: [
          { id: 'f1_01', num: '1.1.1', texto: 'Responsable del SG-SST asignado, con formación mínima de 50 horas en SST', puntos: 10 }
        ]
      },
      {
        id: 'f1_gestion', nombre: 'II. Gestión Integral del SG-SST (15 pts)', puntos: 15,
        items: [
          { id: 'f1_02', num: '2.1.1', texto: 'Política de SST vigente, firmada por la alta dirección, fechada, comunicada y publicada', puntos: 5 },
          { id: 'f1_03', num: '2.2.1', texto: 'Objetivos del SG-SST definidos, medibles, cuantificables y con metas claras', puntos: 5 },
          { id: 'f1_04', num: '2.4.1', texto: 'Evaluación inicial del SG-SST realizada con identificación de prioridades (año en curso)', puntos: 5 }
        ]
      },
      {
        id: 'f1_salud', nombre: 'III. Gestión de la Salud (20 pts)', puntos: 20,
        items: [
          { id: 'f1_05', num: '3.1.1', texto: 'Evaluación médica ocupacional de ingreso realizada y documentada', puntos: 5 },
          { id: 'f1_06', num: '3.1.4', texto: 'Afiliación al SGSS: ARL, EPS y Fondo de Pensiones de todos los trabajadores', puntos: 5 },
          { id: 'f1_07', num: '3.1.6', texto: 'Restricciones y recomendaciones médico-laborales comunicadas al trabajador y al empleador', puntos: 5 },
          { id: 'f1_08', num: '3.1.3', texto: 'Información al médico evaluador sobre los perfiles de cargo y los riesgos específicos', puntos: 5 }
        ]
      },
      {
        id: 'f1_peligros', nombre: 'IV. Gestión de Peligros y Riesgos (30 pts)', puntos: 30,
        items: [
          { id: 'f1_09', num: '4.1.1', texto: 'Identificación de peligros con participación de todos los niveles de la empresa', puntos: 10 },
          { id: 'f1_10', num: '4.2.5', texto: 'Mantenimiento preventivo, predictivo y correctivo de instalaciones, equipos y herramientas', puntos: 10 },
          { id: 'f1_11', num: '4.2.6', texto: 'Entrega y uso de EPP a trabajadores según exposición, con registros de entrega firmados', puntos: 10 }
        ]
      },
      {
        id: 'f1_amenazas', nombre: 'V. Gestión de Amenazas (10 pts)', puntos: 10,
        items: [
          { id: 'f1_12', num: '5.1.1', texto: 'Plan de prevención, preparación y respuesta ante emergencias documentado e implementado', puntos: 10 }
        ]
      },
      {
        id: 'f1_verificar', nombre: 'VI. Verificación del SG-SST (5 pts)', puntos: 5,
        items: [
          { id: 'f1_13', num: '6.1.1', texto: 'Acciones preventivas y/o correctivas documentadas ante identificación de no conformidades', puntos: 5 }
        ]
      },
      {
        id: 'f1_actuar', nombre: 'VII. Mejoramiento continuo (10 pts)', puntos: 10,
        items: [
          { id: 'f1_14', num: '7.1.1', texto: 'Acciones de mejora implementadas con base en resultados del SG-SST y verificadas', puntos: 10 }
        ]
      }
    ]
  },

  // ─── FASE II — 11 a 50 trabajadores (todos los riesgos) ───────────────────
  //     O menos de 10 trabajadores con Riesgo III, IV o V
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
          { id: 'f2_03', num: '1.1.7', texto: 'Programa de capacitación anual en SST documentado y con evidencia de ejecución', puntos: 2 }
        ]
      },
      {
        id: 'f2_gestion', nombre: 'II. Gestión Integral (15 pts)', puntos: 15,
        items: [
          { id: 'f2_04', num: '2.1.1', texto: 'Política de SST vigente, firmada, publicada y comunicada a todos los trabajadores', puntos: 3 },
          { id: 'f2_05', num: '2.2.1', texto: 'Objetivos del SG-SST medibles, cuantificables y coherentes con la política de SST', puntos: 3 },
          { id: 'f2_06', num: '2.3.1', texto: 'Evaluación inicial del SG-SST documentada y actualizada en el año en curso', puntos: 3 },
          { id: 'f2_07', num: '2.4.1', texto: 'Plan anual de trabajo del SG-SST con metas, responsables, recursos y cronograma', puntos: 3 },
          { id: 'f2_08', num: '2.5.1', texto: 'Archivo y retención documental del SG-SST establecido conforme normatividad vigente', puntos: 3 }
        ]
      },
      {
        id: 'f2_salud', nombre: 'III. Gestión de la Salud (20 pts)', puntos: 20,
        items: [
          { id: 'f2_09', num: '3.1.4', texto: 'Afiliación al SGSS de todos los trabajadores (ARL, EPS, AFP) actualizada', puntos: 4 },
          { id: 'f2_10', num: '3.1.1', texto: 'Exámenes médicos ocupacionales: ingreso, periódicos y egreso realizados y documentados', puntos: 4 },
          { id: 'f2_11', num: '3.1.2', texto: 'Actividades de promoción y prevención en salud ejecutadas con evidencia (cronograma)', puntos: 4 },
          { id: 'f2_12', num: '3.1.5', texto: 'Custodia y confidencialidad de historias clínicas ocupacionales garantizada', puntos: 4 },
          { id: 'f2_13', num: '3.1.6', texto: 'Restricciones y recomendaciones médico-laborales implementadas y verificadas', puntos: 4 }
        ]
      },
      {
        id: 'f2_peligros', nombre: 'IV. Gestión de Peligros y Riesgos (30 pts)', puntos: 30,
        items: [
          { id: 'f2_14', num: '4.1.1', texto: 'Identificación de peligros en todos los cargos y áreas con metodología definida (GTC-45)', puntos: 6 },
          { id: 'f2_15', num: '4.1.3', texto: 'Evaluación y valoración de los riesgos con criterios de probabilidad, exposición y consecuencia', puntos: 6 },
          { id: 'f2_16', num: '4.2.1', texto: 'Medidas de prevención y control de peligros implementadas según jerarquía (eliminación→EPP)', puntos: 6 },
          { id: 'f2_17', num: '4.2.5', texto: 'Mantenimiento preventivo de instalaciones, equipos y herramientas con cronograma', puntos: 6 },
          { id: 'f2_18', num: '4.2.6', texto: 'Entrega de EPP con registros de entrega firmados y seguimiento al uso correcto', puntos: 6 }
        ]
      },
      {
        id: 'f2_amenazas', nombre: 'V. Gestión de Amenazas (10 pts)', puntos: 10,
        items: [
          { id: 'f2_19', num: '5.1.1', texto: 'Plan de emergencias documentado: análisis amenazas, recursos, señalización y procedimientos', puntos: 5 },
          { id: 'f2_20', num: '5.1.2', texto: 'Brigadas de emergencias conformadas, capacitadas y dotadas (mínimo primeros auxilios)', puntos: 5 }
        ]
      },
      {
        id: 'f2_verificar', nombre: 'VI. Verificación (5 pts)', puntos: 5,
        items: [
          { id: 'f2_21', num: '6.1.1', texto: 'Investigación de accidentes e incidentes de trabajo realizada con metodología (5 porqués / arbol)', puntos: 3 },
          { id: 'f2_22', num: '6.1.1', texto: 'Identificación de causas de incidentes, AT y enfermedades laborales con medidas correctivas', puntos: 2 }
        ]
      },
      {
        id: 'f2_actuar', nombre: 'VII. Mejoramiento (10 pts)', puntos: 10,
        items: [
          { id: 'f2_23', num: '7.1.1', texto: 'Acciones preventivas y correctivas del SG-SST documentadas, implementadas y verificadas', puntos: 5 },
          { id: 'f2_24', num: '7.1.2', texto: 'Revisión anual del SG-SST por la alta dirección con resultados y compromisos documentados', puntos: 5 }
        ]
      }
    ]
  },

  // ─── FASE III — Más de 50 trabajadores (todos los riesgos) ────────────────
  //     O más de 10 trabajadores con Riesgo III, IV o V
  fase3: {
    label: 'Fase III — Más de 50 trabajadores (o >10 con Riesgo III-V)',
    total_puntos: 100,
    nota: 'Artículo 5 Res. 0312/2019 — 60 estándares completos (ciclo PHVA)',
    grupos: [
      // ── PLANEAR ──────────────────────────────────────────────────────────
      {
        id: 'f3_recursos', nombre: 'PLANEAR — Recursos (10 pts)', puntos: 10,
        items: [
          { id: 'f3_01', num: '1.1.1', texto: 'Responsable del SG-SST con licencia en Salud Ocupacional vigente y dedicación al cargo', puntos: 2 },
          { id: 'f3_02', num: '1.1.2', texto: 'Responsabilidades del SG-SST asignadas y documentadas en todos los niveles jerárquicos', puntos: 2 },
          { id: 'f3_03', num: '1.1.3', texto: 'COPASST: conformado, registrado, en funcionamiento y con actas de reunión mensuales', puntos: 4 },
          { id: 'f3_04', num: '1.1.4', texto: 'Comité de Convivencia Laboral: conformado, capacitado y con plan de trabajo', puntos: 1 },
          { id: 'f3_05', num: '1.1.7', texto: 'Programa de capacitación anual en SST ejecutado con evaluación de efectividad', puntos: 1 }
        ]
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
          { id: 'f3_16', num: '2.11.1', texto: 'Evaluación del impacto de cambios internos y externos sobre el SG-SST', puntos: 2 }
        ]
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
          { id: 'f3_23', num: '3.1.7', texto: 'Programa de estilos de vida y entornos saludables (hábitos alimenticios, pausas activas, ergonomía)', puntos: 1 }
        ]
      },
      // ── HACER ─────────────────────────────────────────────────────────────
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
          { id: 'f3_33', num: '4.2.6', texto: 'Entrega de EPP con verificación del uso correcto, reposición oportuna y registros firmados', puntos: 2 }
        ]
      },
      {
        id: 'f3_amenazas', nombre: 'HACER — Gestión de Amenazas (10 pts)', puntos: 10,
        items: [
          { id: 'f3_34', num: '5.1.1', texto: 'Plan de prevención y preparación ante emergencias: análisis vulnerabilidad, recursos, señalización, procedimientos por tipo de evento', puntos: 5 },
          { id: 'f3_35', num: '5.1.2', texto: 'Brigadas de emergencias (contra incendio, primeros auxilios, evacuación) conformadas, capacitadas, dotadas y con simulacro ≥1/año', puntos: 5 }
        ]
      },
      // ── VERIFICAR ────────────────────────────────────────────────────────
      {
        id: 'f3_verificar', nombre: 'VERIFICAR (5 pts)', puntos: 5,
        items: [
          { id: 'f3_36', num: '6.1.1', texto: 'Medición y seguimiento de indicadores de estructura, proceso y resultado del SG-SST', puntos: 1.25 },
          { id: 'f3_37', num: '6.1.2', texto: 'Auditoría al SG-SST realizada al menos 1 vez/año con informe, plan de mejora y seguimiento', puntos: 1.25 },
          { id: 'f3_38', num: '6.1.3', texto: 'Revisión anual del SG-SST por la alta dirección con compromisos, responsables y plazos', puntos: 1.25 },
          { id: 'f3_39', num: '6.1.4', texto: 'Planificación de auditorías del SG-SST con participación del COPASST', puntos: 1.25 }
        ]
      },
      // ── ACTUAR ────────────────────────────────────────────────────────────
      {
        id: 'f3_actuar', nombre: 'ACTUAR — Mejoramiento (10 pts)', puntos: 10,
        items: [
          { id: 'f3_40', num: '7.1.1', texto: 'Acciones de PYP definidas con base en resultados del SG-SST, AT, EL, inspecciones y auditorías', puntos: 5 },
          { id: 'f3_41', num: '7.1.2', texto: 'Acciones correctivas, preventivas y de mejora: implementadas, con seguimiento y cierre verificado', puntos: 5 }
        ]
      }
    ]
  }
};

// ═══════════════════════════════════════════
// VENCIMIENTOS SST — TIPOS PREDEFINIDOS (expandidos)
// ═══════════════════════════════════════════
const SST_VENCIMIENTOS_TIPO = [
  { id: 'exam_ingreso',   label: 'Examen médico de ingreso',              frecuencia: 'Antes de iniciar labores' },
  { id: 'exam_periodico', label: 'Examen médico periódico',               frecuencia: 'Anual o según concepto médico' },
  { id: 'exam_egreso',    label: 'Examen médico de egreso',               frecuencia: 'Al finalizar contrato' },
  { id: 'copasst',        label: 'Reunión COPASST / Vigía SST',           frecuencia: 'Mensual obligatoria' },
  { id: 'comite_conv',    label: 'Reunión Comité de Convivencia Laboral', frecuencia: 'Bimensual mínimo' },
  { id: 'simulacro',      label: 'Simulacro de emergencias',              frecuencia: 'Mínimo 1 vez al año' },
  { id: 'capacitacion',   label: 'Capacitación SST al personal',          frecuencia: 'Según programa anual' },
  { id: 'induccion',      label: 'Inducción SST a nuevo personal',        frecuencia: 'Antes de iniciar funciones' },
  { id: 'inspeccion',     label: 'Inspección de seguridad',               frecuencia: 'Mensual / según cronograma' },
  { id: 'epp',            label: 'Reposición de EPP',                     frecuencia: 'Según vida útil del equipo' },
  { id: 'matriz_pelig',   label: 'Actualización matriz de peligros (GTC-45)', frecuencia: 'Anual o ante cambios' },
  { id: 'plan_emerg',     label: 'Actualización plan de emergencias',     frecuencia: 'Anual o ante cambios de instalaciones' },
  { id: 'revision_alta',  label: 'Revisión del SG-SST por alta dirección', frecuencia: 'Anual mínimo' },
  { id: 'auditoria',      label: 'Auditoría interna SG-SST',              frecuencia: 'Anual mínimo' },
  { id: 'elecciones_cop', label: 'Elecciones COPASST',                   frecuencia: 'Cada 2 años' },
  { id: 'elecciones_ccl', label: 'Elecciones Comité Convivencia Laboral', frecuencia: 'Cada 2 años' },
  { id: 'licencia_sst',   label: 'Renovación licencia SSO responsable',  frecuencia: 'Según vencimiento (cada 5 años)' },
  { id: 'brigada',        label: 'Capacitación brigada de emergencias',   frecuencia: 'Semestral mínimo' },
  { id: 'vigilancia_epi', label: 'Evaluación programa vigilancia epidemiológica', frecuencia: 'Anual' },
  { id: 'medicion_amb',   label: 'Medición ambiental / higiene industrial', frecuencia: 'Según programa de vigilancia' },
  { id: 'rendicion',      label: 'Rendición de cuentas SG-SST',          frecuencia: 'Anual' },
  { id: 'reporte_arl',    label: 'Reporte de accidente de trabajo a ARL', frecuencia: 'Dentro de los 2 días hábiles siguientes' },
];

// ═══════════════════════════════════════════
// STORAGE — localStorage + Firestore sync
// ═══════════════════════════════════════════
let _sstFirestoreEnabled = false;
let _sstSyncTimer = null;

function loadSSTData() {
  try { return JSON.parse(localStorage.getItem('normalis_sst') || '{}'); } catch(e) { return {}; }
}

function saveSSTData(data) {
  try { localStorage.setItem('normalis_sst', JSON.stringify(data)); } catch(e) {}
  // Debounce Firestore sync (guarda 2s después del último cambio)
  if (_sstFirestoreEnabled) {
    clearTimeout(_sstSyncTimer);
    _sstSyncTimer = setTimeout(function(){ sstSyncFirestore(data); }, 2000);
  }
}

function sstSyncFirestore(data) {
  try {
    let uid = sessionStorage.getItem('normalis_uid');
    if (!uid || typeof db === 'undefined') return;
    db.collection('usuarios').doc(uid).collection('sst').doc('main').set(
      Object.assign({}, data, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() }),
      { merge: true }
    ).then(function(){
      _sstLastSync = new Date().toLocaleTimeString('es-CO');
      const syncEl = document.getElementById('sst-sync-status');
      if (syncEl) syncEl.textContent = '☁️ Sincronizado ' + _sstLastSync;
    }).catch(function(e){ console.warn('[SST] Firestore sync:', e.message); });
  } catch(e) { console.warn('[SST] Sync error:', e.message); }
}

let _sstLastSync = null;

function sstLoadFirestore() {
  try {
    let uid = sessionStorage.getItem('normalis_uid');
    if (!uid || typeof db === 'undefined') { renderSST(); return; }
    _sstFirestoreEnabled = true;
    db.collection('usuarios').doc(uid).collection('sst').doc('main').get().then(function(doc) {
      if (doc.exists) {
        const fsData = doc.data().catch(function(e){ console.error('[NormaLis SST]', e); });
        delete fsData.updatedAt;
        // Merge con localStorage (Firestore tiene prioridad)
        localStorage.setItem('normalis_sst', JSON.stringify(fsData));
      }
      renderSST();
    }).catch(function(){ renderSST(); });
  } catch(e) { renderSST(); }
}

// ═══════════════════════════════════════════
// CALCULAR SCORE
// ═══════════════════════════════════════════
function calcSSTScore() {
  let data = loadSSTData();
  let fase = data.fase || 'fase1';
  let estandar = SST_ESTANDARES[fase];
  let saved = data.autoevaluacion || {};
  let total = 0, obtenido = 0;
  estandar.grupos.forEach(function(g) {
    g.items.forEach(function(item) {
      total += item.puntos;
      if (saved[item.id] === 'cumple') obtenido += item.puntos;
      else if (saved[item.id] === 'parcial') obtenido += item.puntos * 0.5;
    });
  });
  const pct = total > 0 ? Math.round(obtenido / total * 100) : 0;
  const semaforo = pct < 60 ? 'critico' : pct < 85 ? 'moderado' : 'aceptable';
  const label = pct < 60 ? '🔴 Crítico — Riesgo alto de sanción (< 60%)' :
              pct < 85 ? '🟡 Moderado — Requiere mejoras (60–84%)' :
                         '🟢 Aceptable — SG-SST en orden (≥ 85%)';
  return { pct: pct, obtenido: Math.round(obtenido*10)/10, total: total, semaforo: semaforo, label: label, fase: fase };
}

// ═══════════════════════════════════════════
// RENDER PRINCIPAL
// ═══════════════════════════════════════════
function renderSST() {
  let container = document.getElementById('sst-container');
  if (!container) return;
  let data = loadSSTData();
  let score = calcSSTScore();
  let activeTab = data.activeTab || 'dashboard';

  container.innerHTML =
    '<div style="max-width:960px;margin:0 auto;padding:0 0 60px">' +
      // Header
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">' +
        '<div>' +
          '<h2 style="font-size:22px;font-weight:800;color:var(--text);margin:0">🦺 SG-SST</h2>' +
          '<p style="font-size:13px;color:var(--text-muted);margin:4px 0 0">Sistema de Gestión de Seguridad y Salud en el Trabajo · Res. 0312/2019 · Decreto 1072/2015</p>' +
        '</div>' +
        '<div id="sst-sync-status" style="font-size:11px;color:var(--text-muted);padding-top:4px">' +
          (_sstFirestoreEnabled && _sstLastSync ? '☁️ Sincronizado ' + _sstLastSync : (_sstFirestoreEnabled ? '☁️ Firestore activo' : '💾 Solo local')) +
        '</div>' +
      '</div>' +
      // Tabs nav
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;border-bottom:2px solid var(--border);padding-bottom:8px">' +
        _sstTab('dashboard',      activeTab, '📊 Resumen') +
        _sstTab('autoevaluacion', activeTab, '📋 Autoevaluación') +
        _sstTab('plan',           activeTab, '📝 Plan de Trabajo') +
        _sstTab('vencimientos',   activeTab, '📅 Vencimientos') +
        _sstTab('informe',        activeTab, '🖨️ Informe PDF') +
      '</div>' +
      // Score card
      _sstScoreCard(score) +
      // Tab content
      '<div id="sst-tab-content">' + _sstTabContent(activeTab, data, score) + '</div>' +
    '</div>';
}

function _sstTab(id, active, label) {
  const isActive = id === active;
  return '<button onclick="sstSetTab(\'' + id + '\')" style="padding:8px 14px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:' + (isActive?'700':'500') + ';' +
    (isActive ? 'background:var(--teal);color:#fff' : 'background:var(--card);color:var(--text-muted);border:1px solid var(--border)') +
    '">' + label + '</button>';
}

function sstSetTab(tab) {
  let data = loadSSTData();
  data.activeTab = tab;
  saveSSTData(data);
  let el = document.getElementById('sst-tab-content');
  if (el) el.innerHTML = _sstTabContent(tab, data, calcSSTScore());
  // Update tab buttons
  let container = document.getElementById('sst-container');
  if (container) {
    const tabs = ['dashboard','autoevaluacion','plan','vencimientos','informe'];
    const labels = { dashboard:'📊 Resumen', autoevaluacion:'📋 Autoevaluación', plan:'📝 Plan de Trabajo', vencimientos:'📅 Vencimientos', informe:'🖨️ Informe PDF' };
    const navDiv = container.querySelector('div[style*="border-bottom"]');
    if (navDiv) navDiv.innerHTML = tabs.map(function(t){ return _sstTab(t, tab, labels[t]); }).join('');
  }
}

// ═══════════════════════════════════════════
// SCORE CARD
// ═══════════════════════════════════════════
function _sstScoreCard(score) {
  let color = score.semaforo === 'critico' ? '#ef4444' : score.semaforo === 'moderado' ? '#f59e0b' : '#10b981';
  let data = loadSSTData();
  const nota = SST_ESTANDARES[score.fase] ? SST_ESTANDARES[score.fase].nota : '';
  return '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px 24px;margin-bottom:20px">' +
    '<div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">' +
      '<div style="text-align:center;min-width:90px">' +
        '<div style="font-size:48px;font-weight:800;color:' + color + ';line-height:1">' + score.pct + '%</div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Cumplimiento</div>' +
      '</div>' +
      '<div style="flex:1;min-width:200px">' +
        '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">' + score.label + '</div>' +
        '<div style="background:var(--bg);border-radius:8px;height:8px;overflow:hidden;margin-bottom:6px">' +
          '<div style="height:100%;width:' + score.pct + '%;background:' + color + ';border-radius:8px;transition:.4s"></div>' +
        '</div>' +
        '<div style="font-size:11px;color:var(--text-muted)">' + score.obtenido + ' / ' + score.total + ' pts · ' + (nota || SST_ESTANDARES[score.fase].label) + '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;min-width:220px">' +
        '<select onchange="sstCambiarFase(this.value)" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:13px">' +
          '<option value="fase1"' + (score.fase==='fase1'?' selected':'') + '>Fase I — &lt;10 trabajadores (Riesgo I-II)</option>' +
          '<option value="fase2"' + (score.fase==='fase2'?' selected':'') + '>Fase II — 11-50 trab. (o &lt;10 Riesgo III-V)</option>' +
          '<option value="fase3"' + (score.fase==='fase3'?' selected':'') + '>Fase III — &gt;50 trab. (o &gt;10 Riesgo III-V)</option>' +
        '</select>' +
        '<div style="font-size:11px;color:var(--text-muted);padding:0 4px">⚕️ IPS con riesgo biológico → generalmente Fase II o III</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function sstCambiarFase(fase) {
  if (typeof nlConfirm === 'function') {
    nlConfirm('Al cambiar de fase se reiniciará la autoevaluación. ¿Continuar?', 'Cambiar fase', '#f59e0b').then(function(ok) {
      if (!ok) return;
      let data = loadSSTData();
      data.fase = fase; data.autoevaluacion = {};
      saveSSTData(data); renderSST();
      if (typeof toast === 'function') toast('Fase cambiada — autoevaluación reiniciada', 'info');
    });
  } else {
    let data = loadSSTData();
    data.fase = fase; data.autoevaluacion = {};
    saveSSTData(data); renderSST();
  }
}

// ═══════════════════════════════════════════
// TAB ROUTER
// ═══════════════════════════════════════════
function _sstTabContent(tab, data, score) {
  if (tab === 'autoevaluacion') return _sstAutoEval(data, score);
  if (tab === 'plan')           return _sstPlan(data);
  if (tab === 'vencimientos')   return _sstVencimientos(data);
  if (tab === 'informe')        return _sstInforme(data, score);
  return _sstDashboard(data, score);
}

// ═══════════════════════════════════════════
// TAB: AUTOEVALUACIÓN
// ═══════════════════════════════════════════
function _sstAutoEval(data, score) {
  let estandar = SST_ESTANDARES[score.fase];
  let saved = data.autoevaluacion || {};
  let totalEval = 0, totalItems = 0;
  estandar.grupos.forEach(function(g){ g.items.forEach(function(){ totalItems++; }); });
  totalEval = Object.keys(saved).filter(function(k){ return saved[k]; }).length;

  let html = '<div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
    '<span style="font-size:13px;color:var(--text-muted)">' + totalEval + ' de ' + totalItems + ' estándares evaluados</span>' +
    '<div style="display:flex;gap:6px">' +
      '<button onclick="sstMarcarTodos(\'cumple\')" style="padding:5px 12px;border-radius:6px;border:1px solid #10b981;background:rgba(16,185,129,.1);color:#10b981;font-size:12px;cursor:pointer">✓ Marcar todo Cumple</button>' +
      '<button onclick="sstMarcarTodos(\'\')" style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text-muted);font-size:12px;cursor:pointer">↺ Limpiar todo</button>' +
    '</div>' +
  '</div>' +
  '<div style="display:flex;flex-direction:column;gap:14px">';

  estandar.grupos.forEach(function(grupo) {
    const grpCumple = grupo.items.filter(function(i){ return saved[i.id]==='cumple'; }).length;
    const grpParcial = grupo.items.filter(function(i){ return saved[i.id]==='parcial'; }).length;
    const grpTotal = grupo.items.length;
    const allDone = grpCumple === grpTotal;
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden">';
    html += '<div style="padding:12px 18px;background:var(--bg);display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none" onclick="sstToggleGrupo(\'' + grupo.id + '\')">';
    html += '<div style="font-weight:700;font-size:13px;color:var(--text)">' + grupo.nombre + '</div>';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<span style="font-size:11px;background:' + (allDone?'#10b981':grpCumple+grpParcial>0?'#f59e0b':'var(--border)') + ';color:' + (allDone||grpCumple+grpParcial>0?'#fff':'var(--text-muted)') + ';padding:2px 8px;border-radius:10px">' + grpCumple + '/' + grpTotal + '</span>';
    html += '<span id="sst-arrow-' + grupo.id + '" style="color:var(--text-muted)">▼</span></div></div>';
    html += '<div id="sst-grp-' + grupo.id + '" style="padding:16px 18px;display:flex;flex-direction:column;gap:10px">';

    grupo.items.forEach(function(item) {
      const val = saved[item.id] || '';
      const bgRow = val === 'cumple' ? 'rgba(16,185,129,.06)' : val === 'parcial' ? 'rgba(245,158,11,.06)' : val === 'no' ? 'rgba(239,68,68,.06)' : 'var(--bg)';
      html += '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:' + bgRow + ';border-radius:8px;border:1px solid var(--border)">';
      html += '<div style="flex:1">';
      html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;font-family:monospace">' + item.num + '</div>';
      html += '<div style="font-size:13px;color:var(--text);line-height:1.4">' + item.texto + '</div>';
      html += '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Peso: <strong>' + item.puntos + ' pts</strong></div>';
      html += '</div>';
      html += '<div style="display:flex;flex-direction:column;gap:4px;min-width:100px">';
      html += '<button onclick="sstSetItem(\'' + item.id + '\',\'cumple\')" style="padding:5px 8px;border-radius:6px;border:none;cursor:pointer;font-size:11px;font-weight:700;' + (val==='cumple'?'background:#10b981;color:#fff':'background:var(--card);color:#64748b;border:1px solid var(--border)') + '">✓ Cumple</button>';
      html += '<button onclick="sstSetItem(\'' + item.id + '\',\'parcial\')" style="padding:5px 8px;border-radius:6px;border:none;cursor:pointer;font-size:11px;font-weight:700;' + (val==='parcial'?'background:#f59e0b;color:#fff':'background:var(--card);color:#64748b;border:1px solid var(--border)') + '">⚡ Parcial</button>';
      html += '<button onclick="sstSetItem(\'' + item.id + '\',\'no\')" style="padding:5px 8px;border-radius:6px;border:none;cursor:pointer;font-size:11px;font-weight:700;' + (val==='no'?'background:#ef4444;color:#fff':'background:var(--card);color:#64748b;border:1px solid var(--border)') + '">✗ No cumple</button>';
      html += '</div></div>';
    });

    html += '</div></div>';
  });

  html += '</div>';
  return html;
}

function sstSetItem(id, val) {
  let data = loadSSTData();
  if (!data.autoevaluacion) data.autoevaluacion = {};
  data.autoevaluacion[id] = val;
  saveSSTData(data);
  sstSetTab('autoevaluacion');
  // Update score card
  const newScore = calcSSTScore();
  const scoreColor = newScore.semaforo==='critico'?'#ef4444':newScore.semaforo==='moderado'?'#f59e0b':'#10b981';
  const pctEl = document.querySelector('#sst-container [style*="font-size:48px"]');
  if (pctEl) { pctEl.textContent = newScore.pct + '%'; pctEl.style.color = scoreColor; }
  const barEl = document.querySelector('#sst-container [style*="transition:.4s"]');
  if (barEl) { barEl.style.width = newScore.pct + '%'; barEl.style.background = scoreColor; }
  if (typeof logAction==='function') logAction('sst_item_set', 'sst', 'Estándar ' + id + ': ' + val);
}

function sstMarcarTodos(val) {
  let data = loadSSTData();
  let fase = data.fase || 'fase1';
  if (!data.autoevaluacion) data.autoevaluacion = {};
  SST_ESTANDARES[fase].grupos.forEach(function(g){
    g.items.forEach(function(item){ data.autoevaluacion[item.id] = val; });
  });
  saveSSTData(data);
  renderSST();
  sstSetTab('autoevaluacion');
}

function sstToggleGrupo(id) {
  let el = document.getElementById('sst-grp-' + id);
  const arrow = document.getElementById('sst-arrow-' + id);
  if (!el) return;
  const hidden = el.style.display === 'none';
  el.style.display = hidden ? 'flex' : 'none';
  if (!hidden) {} else el.style.flexDirection = 'column';
  if (arrow) arrow.textContent = hidden ? '▼' : '▶';
}

// ═══════════════════════════════════════════
// TAB: PLAN DE TRABAJO ANUAL
// ═══════════════════════════════════════════
function _sstPlan(data) {
  const actividades = data.plan || [];
  let html = '<div style="display:flex;flex-direction:column;gap:16px">';
  html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px">';
  html += '<h3 style="font-size:14px;font-weight:700;margin:0 0 14px;color:var(--text)">➕ Nueva Actividad del Plan</h3>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">';
  html += '<input id="sst-plan-actividad" placeholder="Descripción de la actividad*" style="padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;grid-column:1/-1">';
  html += '<select id="sst-plan-categoria" style="padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">' +
    '<option value="recursos">Recursos / Talento Humano</option>' +
    '<option value="gestion">Gestión Integral</option>' +
    '<option value="salud">Gestión de la Salud</option>' +
    '<option value="peligros">Peligros y Riesgos</option>' +
    '<option value="emergencias">Amenazas / Emergencias</option>' +
    '<option value="verificar">Verificación / Auditoría</option>' +
    '<option value="mejora">Mejoramiento continuo</option>' +
  '</select>';
  html += '<input id="sst-plan-responsable" placeholder="Responsable" style="padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '<input id="sst-plan-fecha" type="date" style="padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '<input id="sst-plan-recurso" placeholder="Recurso / presupuesto (opcional)" style="padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '<input id="sst-plan-indicador" placeholder="Indicador de cumplimiento (opcional)" style="padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '</div>';
  html += '<button onclick="sstGuardarActividad()" class="btn" style="background:var(--teal);color:#fff">Agregar actividad</button>';
  html += '</div>';

  if (actividades.length === 0) {
    html += '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:14px">No hay actividades en el plan de trabajo.</div>';
  } else {
    const CATCOLORS = { recursos:'#6366f1', gestion:'#0ea5e9', salud:'#10b981', peligros:'#f59e0b', emergencias:'#ef4444', verificar:'#8b5cf6', mejora:'#06b6d4' };
    const pend = actividades.filter(function(a){ return a.estado==='pendiente'; }).length;
    const proc = actividades.filter(function(a){ return a.estado==='en_proceso'; }).length;
    const done = actividades.filter(function(a){ return a.estado==='completada'; }).length;
    html += '<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap">';
    html += '<span style="font-size:12px;padding:3px 10px;border-radius:10px;background:rgba(245,158,11,.12);color:#b45309">⏳ ' + pend + ' pendientes</span>';
    html += '<span style="font-size:12px;padding:3px 10px;border-radius:10px;background:rgba(14,165,233,.12);color:#0369a1">🔄 ' + proc + ' en proceso</span>';
    html += '<span style="font-size:12px;padding:3px 10px;border-radius:10px;background:rgba(16,185,129,.12);color:#065f46">✅ ' + done + ' completadas</span>';
    html += '</div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px">';
    actividades.forEach(function(act, i) {
      let color = CATCOLORS[act.categoria] || '#64748b';
      const vencido = act.fecha && new Date(act.fecha) < new Date() && act.estado !== 'completada';
      html += '<div style="background:var(--card);border:1px solid var(--border);border-left:4px solid ' + color + ';border-radius:10px;padding:12px 16px;display:flex;align-items:flex-start;gap:10px">';
      html += '<div style="flex:1">';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">' + act.actividad + '</div>';
      html += '<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--text-muted)">';
      html += '<span>👤 ' + (act.responsable || '—') + '</span>';
      html += '<span' + (vencido?' style="color:#ef4444;font-weight:700"':'') + '>📅 ' + (act.fecha || '—') + (vencido?' &#9888; VENCIDA':'') + '</span>';
      if (act.recurso) html += '<span>💰 ' + act.recurso + '</span>';
      if (act.indicador) html += '<span>📏 ' + act.indicador + '</span>';
      html += '</div></div>';
      html += '<div style="display:flex;gap:6px;align-items:center;flex-shrink:0">';
      html += '<select onchange="sstEstadoActividad(' + i + ',this.value)" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--text);font-size:11px">';
      ['pendiente','en_proceso','completada'].forEach(function(s) {
        html += '<option value="' + s + '"' + (act.estado===s?' selected':'') + '>' + (s==='pendiente'?'⏳ Pendiente':s==='en_proceso'?'🔄 En proceso':'✅ Completada') + '</option>';
      });
      html += '</select>';
      html += '<button onclick="sstEliminarActividad(' + i + ')" style="padding:5px 8px;background:rgba(239,68,68,.1);color:#fca5a5;border:1px solid rgba(239,68,68,.3);border-radius:6px;cursor:pointer;font-size:11px">🗑</button>';
      html += '</div></div>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function sstGuardarActividad() {
  const actividad  = (document.getElementById('sst-plan-actividad')||{}).value || '';
  const categoria  = (document.getElementById('sst-plan-categoria')||{}).value || 'recursos';
  const responsable= (document.getElementById('sst-plan-responsable')||{}).value || '';
  let fecha      = (document.getElementById('sst-plan-fecha')||{}).value || '';
  const recurso    = (document.getElementById('sst-plan-recurso')||{}).value || '';
  const indicador  = (document.getElementById('sst-plan-indicador')||{}).value || '';
  if (!actividad.trim()) { if (typeof toast==='function') toast('Ingrese la descripción de la actividad','warning'); return; }
  let data = loadSSTData();
  if (!data.plan) data.plan = [];
  data.plan.push({ actividad: actividad.trim(), categoria, responsable, fecha, recurso, indicador, estado: 'pendiente', createdAt: new Date().toISOString() });
  saveSSTData(data);
  if (typeof toast==='function') toast('Actividad agregada al plan','success');
  if (typeof logAction==='function') logAction('sst_plan_add','sst','Actividad SST: '+actividad.trim());
  renderSST(); sstSetTab('plan');
}

function sstEstadoActividad(i, estado) {
  let data = loadSSTData();
  if (data.plan && data.plan[i]) { data.plan[i].estado = estado; saveSSTData(data); }
  sstSetTab('plan');
}

function sstEliminarActividad(i) {
  nlConfirm('¿Eliminar esta actividad del plan?','Eliminar','#ef4444').then(function(ok){
    if (!ok) return;
    let data = loadSSTData();
    if (data.plan) { data.plan.splice(i,1); saveSSTData(data); }
    if (typeof toast==='function') toast('Actividad eliminada','info');
    renderSST(); sstSetTab('plan');
  });
}

// ═══════════════════════════════════════════
// TAB: VENCIMIENTOS SST
// ═══════════════════════════════════════════
function _sstVencimientos(data) {
  let venc = data.vencimientos_sst || [];
  let hoy  = new Date(); hoy.setHours(0,0,0,0);
  let html = '<div style="display:flex;flex-direction:column;gap:16px">';

  html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px">';
  html += '<h3 style="font-size:14px;font-weight:700;margin:0 0 14px;color:var(--text)">➕ Nuevo Vencimiento SST</h3>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">';
  html += '<select id="sst-venc-tipo" style="padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  SST_VENCIMIENTOS_TIPO.forEach(function(t){ html += '<option value="' + t.id + '">' + t.label + '</option>'; });
  html += '</select>';
  html += '<input id="sst-venc-desc" placeholder="Detalle (trabajador / área / cargo)" style="padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '<input id="sst-venc-fecha" type="date" style="padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '<input id="sst-venc-responsable" placeholder="Responsable de gestión" style="padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '</div>';
  html += '<button onclick="sstGuardarVencimiento()" class="btn" style="background:var(--teal);color:#fff">Registrar vencimiento</button>';
  html += '</div>';

  if (venc.length === 0) {
    html += '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:14px">No hay vencimientos SST registrados.</div>';
  } else {
    const sorted = venc.slice().sort(function(a,b){ return new Date(a.fecha)-new Date(b.fecha); });
    html += '<div style="display:flex;flex-direction:column;gap:6px">';
    sorted.forEach(function(v, i) {
      let fv = new Date(v.fecha); fv.setHours(0,0,0,0);
      let dias = Math.round((fv - hoy) / 86400000);
      const urgency = dias < 0 ? 'vencido' : dias <= 7 ? 'critico' : dias <= 30 ? 'proximo' : 'ok';
      const colors  = { vencido:'#ef4444', critico:'#f97316', proximo:'#f59e0b', ok:'#10b981' };
      const bgColors= { vencido:'rgba(239,68,68,.08)', critico:'rgba(249,115,22,.08)', proximo:'rgba(245,158,11,.06)', ok:'transparent' };
      const diasLabel = urgency==='vencido' ? '&#9888; VENCIDO' : 'Vence en ' + dias + 'd';
      html += '<div style="background:var(--card);border:1px solid var(--border);background:' + bgColors[urgency] + ';border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px">';
      html += '<div style="width:8px;height:8px;border-radius:50%;background:' + colors[urgency] + ';flex-shrink:0"></div>';
      html += '<div style="flex:1">';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text)">' + v.label + (v.desc?' — <span style="font-weight:400">' + v.desc + '</span>':'') + '</div>';
      html += '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">📅 ' + v.fecha + ' · 👤 ' + (v.responsable||'—') + '</div>';
      html += '</div>';
      html += '<span style="font-size:12px;font-weight:700;color:' + colors[urgency] + ';white-space:nowrap;padding:3px 8px;background:' + colors[urgency] + '22;border-radius:8px">' + diasLabel + '</span>';
      html += '<button onclick="sstEliminarVencimiento(' + i + ')" style="padding:5px 8px;background:rgba(239,68,68,.1);color:#fca5a5;border:1px solid rgba(239,68,68,.3);border-radius:6px;cursor:pointer;font-size:11px">🗑</button>';
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function sstGuardarVencimiento() {
  const tipoEl  = document.getElementById('sst-venc-tipo');
  const tipoId  = tipoEl ? tipoEl.value : '';
  const tipoData= SST_VENCIMIENTOS_TIPO.find(function(t){ return t.id===tipoId; });
  const desc    = (document.getElementById('sst-venc-desc')||{}).value || '';
  let fecha   = (document.getElementById('sst-venc-fecha')||{}).value || '';
  const resp    = (document.getElementById('sst-venc-responsable')||{}).value || '';
  if (!fecha) { if (typeof toast==='function') toast('Seleccione la fecha de vencimiento','warning'); return; }
  let data = loadSSTData();
  if (!data.vencimientos_sst) data.vencimientos_sst = [];
  data.vencimientos_sst.push({ id: tipoId, label: tipoData ? tipoData.label : tipoId, desc, fecha, responsable: resp });
  saveSSTData(data);
  if (typeof toast==='function') toast('Vencimiento SST registrado','success');
  renderSST(); sstSetTab('vencimientos');
}

function sstEliminarVencimiento(i) {
  nlConfirm('¿Eliminar este vencimiento SST?','Eliminar','#ef4444').then(function(ok){
    if (!ok) return;
    let data = loadSSTData();
    if (data.vencimientos_sst) { data.vencimientos_sst.splice(i,1); saveSSTData(data); }
    renderSST(); sstSetTab('vencimientos');
  });
}

// ═══════════════════════════════════════════
// TAB: DASHBOARD / RESUMEN
// ═══════════════════════════════════════════
function _sstDashboard(data, score) {
  let plan  = data.plan || [];
  let venc  = data.vencimientos_sst || [];
  let hoy   = new Date(); hoy.setHours(0,0,0,0);
  let estandar = SST_ESTANDARES[score.fase];
  let saved = data.autoevaluacion || {};

  let totalItems = 0, noCumple = 0, cumple = 0, parcial = 0;
  estandar.grupos.forEach(function(g){ g.items.forEach(function(item){
    totalItems++;
    if (saved[item.id]==='cumple') cumple++;
    else if (saved[item.id]==='parcial') parcial++;
    else noCumple++;
  }); });
  const evaluados = Object.keys(saved).filter(function(k){ return saved[k]; }).length;

  const pendientes  = plan.filter(function(a){ return a.estado==='pendiente'; }).length;
  const enProceso   = plan.filter(function(a){ return a.estado==='en_proceso'; }).length;
  const completadas = plan.filter(function(a){ return a.estado==='completada'; }).length;
  const vencProximos= venc.filter(function(v){ var fv=new Date(v.fecha); fv.setHours(0,0,0,0); return fv>=hoy && (fv-hoy)<=30*86400000; }).length;
  const vencidos    = venc.filter(function(v){ var fv=new Date(v.fecha); fv.setHours(0,0,0,0); return fv<hoy; }).length;

  let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:20px">';
  [
    { label:'Evaluados', val: evaluados+'/'+totalItems, color:'#6366f1', icon:'📋' },
    { label:'Cumplen',   val: cumple,   color:'#10b981', icon:'✅' },
    { label:'Parciales', val: parcial,  color:'#f59e0b', icon:'⚡' },
    { label:'No cumplen',val: noCumple, color:'#ef4444', icon:'✗' },
    { label:'Plan pendiente', val: pendientes, color:'#f59e0b', icon:'⏳' },
    { label:'Venc. próximos', val: vencProximos, color:'#f97316', icon:'⏰' },
    { label:'Venc. vencidos', val: vencidos, color:'#ef4444', icon:'&#9888;' },
  ].forEach(function(c){
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;cursor:pointer" onclick="sstSetTab(\'autoevaluacion\')">';
    html += '<div style="font-size:18px;margin-bottom:2px">' + c.icon + '</div>';
    html += '<div style="font-size:26px;font-weight:800;color:' + c.color + '">' + c.val + '</div>';
    html += '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + c.label + '</div>';
    html += '</div>';
  });
  html += '</div>';

  // Grupos por cumplimiento
  html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:16px">';
  html += '<h3 style="font-size:13px;font-weight:700;color:var(--text);margin:0 0 14px">Cumplimiento por grupo</h3>';
  estandar.grupos.forEach(function(g) {
    let gTotal = 0, gObtenido = 0;
    g.items.forEach(function(item){
      gTotal += item.puntos;
      if (saved[item.id]==='cumple') gObtenido += item.puntos;
      else if (saved[item.id]==='parcial') gObtenido += item.puntos*0.5;
    });
    const gPct = gTotal > 0 ? Math.round(gObtenido/gTotal*100) : 0;
    const gColor = gPct < 60 ? '#ef4444' : gPct < 85 ? '#f59e0b' : '#10b981';
    html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
    html += '<div style="font-size:12px;color:var(--text);min-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + g.nombre + '</div>';
    html += '<div style="flex:1;background:var(--bg);border-radius:4px;height:6px;overflow:hidden"><div style="height:100%;width:' + gPct + '%;background:' + gColor + ';border-radius:4px"></div></div>';
    html += '<div style="font-size:12px;font-weight:700;color:' + gColor + ';min-width:36px;text-align:right">' + gPct + '%</div>';
    html += '</div>';
  });
  html += '</div>';

  // Acciones recomendadas
  html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px">';
  html += '<h3 style="font-size:13px;font-weight:700;color:var(--text);margin:0 0 12px">🎯 Acciones recomendadas</h3>';
  const acciones = [];
  if (evaluados < totalItems) acciones.push({ icon:'📋', txt:'Completar autoevaluación — ' + (totalItems-evaluados) + ' estándar(es) sin responder', tab:'autoevaluacion', color:'#6366f1' });
  if (vencidos > 0) acciones.push({ icon:'&#9888;', txt: vencidos + ' vencimiento(s) SST vencido(s) — atención urgente', tab:'vencimientos', color:'#ef4444' });
  if (vencProximos > 0) acciones.push({ icon:'⏰', txt: vencProximos + ' vencimiento(s) en los próximos 30 días', tab:'vencimientos', color:'#f97316' });
  if (pendientes > 3) acciones.push({ icon:'📝', txt: pendientes + ' actividades pendientes en el plan de trabajo', tab:'plan', color:'#f59e0b' });
  if (noCumple > 0) acciones.push({ icon:'✗', txt: noCumple + ' estándar(es) sin cumplir — revisar plan de mejora', tab:'autoevaluacion', color:'#ef4444' });
  if (acciones.length === 0) acciones.push({ icon:'✅', txt:'SG-SST al día — continúe con el seguimiento periódico', tab:'dashboard', color:'#10b981' });
  acciones.slice(0,5).forEach(function(a){
    html += '<div onclick="sstSetTab(\'' + a.tab + '\')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;margin-bottom:6px;background:var(--bg);border-left:3px solid ' + a.color + '">';
    html += '<span style="font-size:16px">' + a.icon + '</span>';
    html += '<span style="font-size:13px;color:var(--text)">' + a.txt + '</span>';
    html += '<span style="margin-left:auto;color:var(--text-muted);font-size:14px">→</span>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// ═══════════════════════════════════════════
// TAB: INFORME PDF
// ═══════════════════════════════════════════
function _sstInforme(data, score) {
  return '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px;text-align:center">' +
    '<div style="font-size:40px;margin-bottom:12px">🖨️</div>' +
    '<h3 style="font-size:16px;font-weight:700;color:var(--text);margin:0 0 8px">Informe de Autoevaluación SG-SST</h3>' +
    '<p style="font-size:13px;color:var(--text-muted);margin:0 0 20px;max-width:400px;margin-left:auto;margin-right:auto">' +
      'Genera un informe completo en PDF con logo, score, tabla de estándares, plan de trabajo y vencimientos — listo para presentar a la ARL o a la alta dirección.' +
    '</p>' +
    '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
      '<button onclick="sstExportarPDF()" class="btn" style="background:var(--teal);color:#fff;padding:12px 28px;font-size:14px">📄 Generar PDF</button>' +
      '<button onclick="sstExportarTexto()" class="btn" style="background:var(--card);color:var(--text);border:1px solid var(--border);padding:12px 20px;font-size:14px">📝 Exportar .txt</button>' +
    '</div>' +
    '<p style="font-size:11px;color:var(--text-muted);margin-top:14px">El PDF se abre en una nueva ventana — usa Ctrl+P / Cmd+P para guardar como PDF.</p>' +
  '</div>';
}

function sstExportarPDF() {
  let score = calcSSTScore();
  let data  = loadSSTData();
  let estandar = SST_ESTANDARES[score.fase];
  let saved = data.autoevaluacion || {};
  let fecha = new Date().toLocaleDateString('es-CO', {year:'numeric',month:'long',day:'numeric'});
  let ipsNombre = localStorage.getItem('normalis_ips_nombre') || 'IPS';
  const cfg = {}; try { cfg = JSON.parse(localStorage.getItem('normalis_cfg')||'{}'); } catch(e){}
  let color = score.semaforo==='critico'?'#dc2626':score.semaforo==='moderado'?'#d97706':'#059669';

  // Plan de trabajo
  let plan = data.plan || [];
  let venc = data.vencimientos_sst || [];

  // Items por estado
  const cumpleItems=[], parcialItems=[], noItems=[], sinEvalItems=[];
  estandar.grupos.forEach(function(g){
    g.items.forEach(function(item){
      let estado = saved[item.id];
      const obj = {num: item.num, texto: item.texto, puntos: item.puntos, grupo: g.nombre};
      if (estado==='cumple') cumpleItems.push(obj);
      else if (estado==='parcial') parcialItems.push(obj);
      else if (estado==='no') noItems.push(obj);
      else sinEvalItems.push(obj);
    });
  });

  const tblRow = function(num, texto, estado, pts, color2) {
    return '<tr><td style="padding:6px 10px;font-family:monospace;font-size:11px;color:#64748b;white-space:nowrap">' + num + '</td>' +
      '<td style="padding:6px 10px;font-size:12px">' + texto + '</td>' +
      '<td style="padding:6px 10px;text-align:center"><span style="background:' + color2 + ';color:#fff;border-radius:12px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap">' + estado + '</span></td>' +
      '<td style="padding:6px 10px;text-align:right;font-size:12px;font-weight:600">' + pts + '</td></tr>';
  };

  let allRows = '';
  estandar.grupos.forEach(function(g) {
    allRows += '<tr><td colspan="4" style="background:#f1f5f9;padding:8px 10px;font-weight:700;font-size:12px;color:#1e293b;border-top:2px solid #e2e8f0">' + g.nombre + '</td></tr>';
    g.items.forEach(function(item) {
      let estado = saved[item.id];
      const lbl = estado==='cumple'?'✓ CUMPLE':estado==='parcial'?'⚡ PARCIAL':estado==='no'?'✗ NO CUMPLE':'○ SIN EVALUAR';
      const col = estado==='cumple'?'#059669':estado==='parcial'?'#d97706':estado==='no'?'#dc2626':'#94a3b8';
      allRows += tblRow(item.num, item.texto, lbl, item.puntos+' pts', col);
    });
  });

  const planRows = plan.map(function(a){
    const st = a.estado==='completada'?'✅':a.estado==='en_proceso'?'🔄':'⏳';
    return '<tr><td style="padding:5px 8px;font-size:12px">' + a.actividad + '</td>' +
      '<td style="padding:5px 8px;font-size:11px;color:#64748b">' + (a.responsable||'—') + '</td>' +
      '<td style="padding:5px 8px;font-size:11px;color:#64748b">' + (a.fecha||'—') + '</td>' +
      '<td style="padding:5px 8px;text-align:center">' + st + ' ' + (a.estado||'pendiente') + '</td></tr>';
  }).join('');

  const vencRows = venc.map(function(v){
    let fv = new Date(v.fecha); var hoy = new Date();
    let dias = Math.round((fv-hoy)/86400000);
    const urgColor = dias<0?'#dc2626':dias<=30?'#d97706':'#059669';
    return '<tr><td style="padding:5px 8px;font-size:12px">' + v.label + (v.desc?' — '+v.desc:'') + '</td>' +
      '<td style="padding:5px 8px;font-size:11px">' + v.fecha + '</td>' +
      '<td style="padding:5px 8px;font-size:11px;color:#64748b">' + (v.responsable||'—') + '</td>' +
      '<td style="padding:5px 8px;text-align:center;font-weight:700;color:' + urgColor + '">' + (dias<0?'VENCIDO':dias+' días') + '</td></tr>';
  }).join('');

  let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Informe SG-SST — '+ipsNombre+'</title>' +
  '<style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;padding:0;color:#1e293b;font-size:13px}' +
  '.page{max-width:800px;margin:0 auto;padding:30px}' +
  'table{width:100%;border-collapse:collapse;margin-bottom:20px}' +
  'th{background:#1e293b;color:#fff;padding:8px 10px;text-align:left;font-size:12px}' +
  'tr:nth-child(even){background:#f8fafc}' +
  'tr:hover{background:#f1f5f9}' +
  'h2{font-size:16px;font-weight:700;margin:20px 0 8px;border-bottom:2px solid #00544B;padding-bottom:6px;color:#00544B}' +
  '@media print{.no-print{display:none}.page{padding:15px}body{font-size:11px}}' +
  '</style></head><body><div class="page">' +

  // Header
  '<div style="background:#00544B;color:#fff;padding:24px 28px;border-radius:12px;margin-bottom:24px">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">' +
      '<div>' +
        '<div style="font-size:11px;opacity:.7;margin-bottom:4px">INFORME DE AUTOEVALUACIÓN</div>' +
        '<div style="font-size:22px;font-weight:800">SG-SST</div>' +
        '<div style="font-size:13px;opacity:.85;margin-top:2px">Res. 0312/2019 · Decreto 1072/2015</div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div style="font-size:11px;opacity:.7">IPS</div>' +
        '<div style="font-size:16px;font-weight:700">' + ipsNombre + '</div>' +
        (cfg.nit ? '<div style="font-size:12px;opacity:.8">NIT: ' + cfg.nit + '</div>' : '') +
        '<div style="font-size:12px;opacity:.8">Fecha: ' + fecha + '</div>' +
      '</div>' +
    '</div>' +
  '</div>' +

  // Score
  '<div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap">' +
    '<div style="flex:1;min-width:180px;background:#f8fafc;border:2px solid ' + color + ';border-radius:12px;padding:20px;text-align:center">' +
      '<div style="font-size:56px;font-weight:800;color:' + color + ';line-height:1">' + score.pct + '%</div>' +
      '<div style="font-size:12px;color:#64748b;margin-top:4px">Cumplimiento general</div>' +
    '</div>' +
    '<div style="flex:2;min-width:240px;background:#f8fafc;border-radius:12px;padding:20px">' +
      '<div style="font-size:14px;font-weight:700;color:' + color + ';margin-bottom:8px">' + score.label + '</div>' +
      '<div style="background:#e2e8f0;border-radius:6px;height:12px;margin-bottom:10px"><div style="width:' + score.pct + '%;height:100%;background:' + color + ';border-radius:6px"></div></div>' +
      '<div style="font-size:12px;color:#64748b">' + score.obtenido + ' / ' + score.total + ' puntos · ' + estandar.label + '</div>' +
      '<div style="display:flex;gap:12px;margin-top:10px;font-size:12px">' +
        '<span style="color:#059669">✓ Cumple: ' + cumpleItems.length + '</span>' +
        '<span style="color:#d97706">⚡ Parcial: ' + parcialItems.length + '</span>' +
        '<span style="color:#dc2626">✗ No cumple: ' + noItems.length + '</span>' +
        '<span style="color:#94a3b8">○ Sin evaluar: ' + sinEvalItems.length + '</span>' +
      '</div>' +
    '</div>' +
  '</div>' +

  // Tabla estándares
  '<h2>Autoevaluación de Estándares Mínimos</h2>' +
  '<table><thead><tr><th style="width:70px">Estándar</th><th>Descripción</th><th style="width:110px;text-align:center">Estado</th><th style="width:55px;text-align:right">Puntos</th></tr></thead><tbody>' +
  allRows + '</tbody></table>' +

  // Plan de trabajo
  (plan.length > 0 ?
    '<h2>Plan de Trabajo Anual</h2><table><thead><tr><th>Actividad</th><th>Responsable</th><th>Fecha</th><th style="width:100px">Estado</th></tr></thead><tbody>' + planRows + '</tbody></table>'
    : '') +

  // Vencimientos
  (venc.length > 0 ?
    '<h2>Vencimientos SST</h2><table><thead><tr><th>Actividad</th><th>Fecha</th><th>Responsable</th><th style="width:80px">Estado</th></tr></thead><tbody>' + vencRows + '</tbody></table>'
    : '') +

  // Firma
  '<div style="margin-top:40px;border-top:1px solid #e2e8f0;padding-top:20px;display:flex;gap:40px;flex-wrap:wrap">' +
    '<div style="flex:1;min-width:180px">' +
      '<div style="height:50px;border-bottom:1px solid #1e293b;margin-bottom:6px"></div>' +
      '<div style="font-size:11px;color:#64748b">Responsable SG-SST</div>' +
    '</div>' +
    '<div style="flex:1;min-width:180px">' +
      '<div style="height:50px;border-bottom:1px solid #1e293b;margin-bottom:6px"></div>' +
      '<div style="font-size:11px;color:#64748b">Representante Legal</div>' +
    '</div>' +
    '<div style="flex:1;min-width:180px">' +
      '<div style="height:50px;border-bottom:1px solid #1e293b;margin-bottom:6px"></div>' +
      '<div style="font-size:11px;color:#64748b">COPASST / Vigía SST</div>' +
    '</div>' +
  '</div>' +
  '<div style="margin-top:20px;font-size:10px;color:#94a3b8;text-align:center">Generado por NormaLis — normalis.co · ' + fecha + '</div>' +

  // Botón imprimir
  '<div class="no-print" style="position:fixed;bottom:24px;right:24px;display:flex;gap:8px">' +
    '<button onclick="window.print()" style="background:#00544B;color:#fff;border:none;border-radius:10px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2)">🖨️ Imprimir / Guardar PDF</button>' +
    '<button onclick="window.close()" style="background:#f1f5f9;color:#1e293b;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;font-size:14px;cursor:pointer">✕ Cerrar</button>' +
  '</div>' +

  '</div></body></html>';

  const win = window.open('','_blank','width=900,height=700,scrollbars=yes');
  if (win) {
    win.document.write(html);
    win.document.close();
    if (typeof toast==='function') toast('Informe generado — usa Ctrl+P para guardar como PDF','success');
  } else {
    if (typeof toast==='function') toast('Activa las ventanas emergentes del navegador para ver el informe','warning');
  }
}

function sstExportarTexto() {
  let score = calcSSTScore();
  let data  = loadSSTData();
  let estandar = SST_ESTANDARES[score.fase];
  let saved = data.autoevaluacion || {};
  let fecha = new Date().toLocaleDateString('es-CO');
  let ipsNombre = localStorage.getItem('normalis_ips_nombre') || 'IPS';
  const lines = [
    'INFORME SG-SST — ' + ipsNombre,
    'Fecha: ' + fecha + ' | ' + estandar.label,
    'Cumplimiento: ' + score.pct + '% (' + score.obtenido + '/' + score.total + ' pts)',
    'Estado: ' + score.label, '',
    '═══ AUTOEVALUACIÓN (Res. 0312/2019) ═══',
  ];
  estandar.grupos.forEach(function(g){
    lines.push('\n[' + g.nombre + ']');
    g.items.forEach(function(item){
      const est = saved[item.id]==='cumple'?'✓ CUMPLE':saved[item.id]==='parcial'?'⚡ PARCIAL':saved[item.id]==='no'?'✗ NO CUMPLE':'○ SIN EVALUAR';
      lines.push('  ' + est + ' [' + item.num + '] ' + item.texto + ' (' + item.puntos + ' pts)');
    });
  });
  lines.push('\n═══ PLAN DE TRABAJO ═══');
  (data.plan||[]).forEach(function(a){ lines.push('  [' + (a.estado||'pendiente').toUpperCase() + '] ' + a.actividad + ' | ' + (a.responsable||'—') + ' | ' + (a.fecha||'—')); });
  lines.push('\n═══ VENCIMIENTOS SST ═══');
  (data.vencimientos_sst||[]).forEach(function(v){ lines.push('  ' + v.label + (v.desc?' — '+v.desc:'') + ' | ' + v.fecha + ' | ' + (v.responsable||'—')); });
  lines.push('\nGenerado por NormaLis — normalis.co');
  const blob = new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='reporte-sst-' + fecha.replace(/\//g,'-') + '.txt'; a.click();
  URL.revokeObjectURL(url);
  if (typeof toast==='function') toast('Reporte SST exportado como .txt','success');
}

// ═══════════════════════════════════════════
// NAV HOOK — registra en _moduleHooks tras DOMContentLoaded
// El módulo carga antes que el script inline (línea 3356+),
// por eso usamos 'load' para garantizar que _moduleHooks exista.
// ═══════════════════════════════════════════
window.addEventListener('load', function() {
  if (typeof _moduleHooks !== 'undefined') {
    _moduleHooks['sst'] = function() { sstLoadFirestore(); };
  }
  // También registrar viewTitle si está disponible
  if (typeof viewTitles !== 'undefined') {
    viewTitles['sst'] = ['SG-SST','Autoevaluación Res. 0312/2019 · Plan de trabajo · Vencimientos'];
  }
});

// END:normalis-sst.js — NormaLis integrity seal
