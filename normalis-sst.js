// normalis-sst.js
// NormaLis — Módulo SG-SST (Sistema de Gestión de Seguridad y Salud en el Trabajo)
// Res. 0312/2019 — Ministerio de Trabajo Colombia
// ─────────────────────────────────────────────

// ═══════════════════════════════════════════
// ESTÁNDARES MÍNIMOS — RES. 0312/2019
// ═══════════════════════════════════════════

var SST_ESTANDARES = {
  // FASE I — Menos de 10 trabajadores (Clase I y II riesgo)
  fase1: {
    label: 'Fase I — Menos de 10 trabajadores',
    total_puntos: 100,
    ciclo: 'PHVA',
    grupos: [
      {
        id: 'recursos',
        nombre: 'I. Recursos',
        puntos: 10,
        items: [
          { id: 'f1_01', texto: 'Responsable del SG-SST asignado y con formación en SST (50 horas)', puntos: 10 }
        ]
      },
      {
        id: 'gestion_integral',
        nombre: 'II. Gestión Integral del SG-SST',
        puntos: 15,
        items: [
          { id: 'f1_02', texto: 'Política de SST firmada, fechada, comunicada y publicada', puntos: 5 },
          { id: 'f1_03', texto: 'Objetivos del SG-SST definidos, medibles y coherentes con la política', puntos: 5 },
          { id: 'f1_04', texto: 'Evaluación inicial del SG-SST realizada (año en curso)', puntos: 5 }
        ]
      },
      {
        id: 'gestion_salud',
        nombre: 'III. Gestión de la Salud',
        puntos: 20,
        items: [
          { id: 'f1_05', texto: 'Afiliación a ARL, EPS y Fondo de Pensiones de todos los trabajadores', puntos: 5 },
          { id: 'f1_06', texto: 'Exámenes médicos ocupacionales de ingreso realizados', puntos: 5 },
          { id: 'f1_07', texto: 'Restricciones y recomendaciones médico-laborales comunicadas al trabajador', puntos: 5 },
          { id: 'f1_08', texto: 'Información al médico evaluador sobre los perfiles de cargo y riesgos', puntos: 5 }
        ]
      },
      {
        id: 'gestion_peligros',
        nombre: 'IV. Gestión de Peligros y Riesgos',
        puntos: 30,
        items: [
          { id: 'f1_09', texto: 'Identificación de peligros con participación de todos los niveles de empresa', puntos: 10 },
          { id: 'f1_10', texto: 'Mantenimiento preventivo, predictivo y correctivo documentado', puntos: 10 },
          { id: 'f1_11', texto: 'Entrega de EPP a trabajadores y registros de entrega', puntos: 10 }
        ]
      },
      {
        id: 'gestion_amenazas',
        nombre: 'V. Gestión de Amenazas',
        puntos: 10,
        items: [
          { id: 'f1_12', texto: 'Plan de prevención, preparación y respuesta ante emergencias', puntos: 10 }
        ]
      },
      {
        id: 'verificacion',
        nombre: 'VI. Verificación del SG-SST',
        puntos: 5,
        items: [
          { id: 'f1_13', texto: 'Acciones preventivas y/o correctivas documentadas ante no conformidades', puntos: 5 }
        ]
      },
      {
        id: 'mejoramiento',
        nombre: 'VII. Mejoramiento',
        puntos: 10,
        items: [
          { id: 'f1_14', texto: 'Acciones de mejora implementadas y verificadas', puntos: 10 }
        ]
      }
    ]
  },

  // FASE II — 11 a 50 trabajadores (todos los niveles de riesgo)
  fase2: {
    label: 'Fase II — 11 a 50 trabajadores',
    total_puntos: 100,
    ciclo: 'PHVA',
    grupos: [
      {
        id: 'recursos',
        nombre: 'I. Recursos (10 pts)',
        puntos: 10,
        items: [
          { id: 'f2_01', texto: 'Responsable SST con licencia en SSO y formación mínima 50 horas', puntos: 4 },
          { id: 'f2_02', texto: 'Vigía SST o COPASST elegido, registrado y en funcionamiento', puntos: 4 },
          { id: 'f2_03', texto: 'Programa de capacitación en SST anual con ejecución documentada', puntos: 2 }
        ]
      },
      {
        id: 'gestion_integral',
        nombre: 'II. Gestión Integral (15 pts)',
        puntos: 15,
        items: [
          { id: 'f2_04', texto: 'Política de SST firmada, publicada y comunicada a todos', puntos: 3 },
          { id: 'f2_05', texto: 'Objetivos del SG-SST medibles, coherentes con política', puntos: 3 },
          { id: 'f2_06', texto: 'Evaluación inicial del SG-SST documentada y actualizada', puntos: 3 },
          { id: 'f2_07', texto: 'Plan anual de trabajo del SG-SST con responsables y cronograma', puntos: 3 },
          { id: 'f2_08', texto: 'Archivo y retención documental del SG-SST establecido', puntos: 3 }
        ]
      },
      {
        id: 'gestion_salud',
        nombre: 'III. Gestión de la Salud (20 pts)',
        puntos: 20,
        items: [
          { id: 'f2_09', texto: 'Afiliación a SGSS de todos los trabajadores (ARL, EPS, AFP)', puntos: 4 },
          { id: 'f2_10', texto: 'Exámenes médicos: ingreso, periódicos y egreso realizados', puntos: 4 },
          { id: 'f2_11', texto: 'Actividades de promoción y prevención en salud ejecutadas', puntos: 4 },
          { id: 'f2_12', texto: 'Custodia de historias clínicas ocupacionales garantizada', puntos: 4 },
          { id: 'f2_13', texto: 'Restricciones y recomendaciones médico-laborales implementadas', puntos: 4 }
        ]
      },
      {
        id: 'gestion_peligros',
        nombre: 'IV. Gestión de Peligros y Riesgos (30 pts)',
        puntos: 30,
        items: [
          { id: 'f2_14', texto: 'Identificación de peligros en todos los cargos y areas', puntos: 6 },
          { id: 'f2_15', texto: 'Evaluación y valoración de riesgos documentada', puntos: 6 },
          { id: 'f2_16', texto: 'Medidas de prevención y control de peligros implementadas', puntos: 6 },
          { id: 'f2_17', texto: 'Mantenimiento preventivo de instalaciones, equipos y herramientas', puntos: 6 },
          { id: 'f2_18', texto: 'Entrega y uso de EPP con registros actualizados', puntos: 6 }
        ]
      },
      {
        id: 'gestion_amenazas',
        nombre: 'V. Gestión de Amenazas (10 pts)',
        puntos: 10,
        items: [
          { id: 'f2_19', texto: 'Plan de emergencias estructurado con brigadas y simulacros', puntos: 5 },
          { id: 'f2_20', texto: 'Brigadistas de emergencias conformados y capacitados', puntos: 5 }
        ]
      },
      {
        id: 'verificacion',
        nombre: 'VI. Verificación (5 pts)',
        puntos: 5,
        items: [
          { id: 'f2_21', texto: 'Investigación de accidentes e incidentes de trabajo realizada', puntos: 3 },
          { id: 'f2_22', texto: 'Identificación de causas de incidentes, accidentes y enfermedades laborales', puntos: 2 }
        ]
      },
      {
        id: 'mejoramiento',
        nombre: 'VII. Mejoramiento (10 pts)',
        puntos: 10,
        items: [
          { id: 'f2_23', texto: 'Acciones preventivas y correctivas del SG-SST documentadas', puntos: 5 },
          { id: 'f2_24', texto: 'Revisión anual por la alta dirección con resultados documentados', puntos: 5 }
        ]
      }
    ]
  },

  // FASE III — Más de 50 trabajadores (todos los niveles de riesgo)
  fase3: {
    label: 'Fase III — Más de 50 trabajadores',
    total_puntos: 100,
    ciclo: 'PHVA',
    grupos: [
      {
        id: 'planear',
        nombre: 'PLANEAR — Recursos, Gestión Integral y Gestión Salud (25 pts)',
        puntos: 25,
        items: [
          { id: 'f3_01', texto: 'Responsable SST con licencia vigente, tiempo dedicado y formación certificada', puntos: 4 },
          { id: 'f3_02', texto: 'COPASST conformado, registrado, en funcionamiento y con actas', puntos: 4 },
          { id: 'f3_03', texto: 'Comité de Convivencia Laboral conformado y funcionando', puntos: 3 },
          { id: 'f3_04', texto: 'Programa de capacitacion anual ejecutado con evaluacion de efectividad', puntos: 2 },
          { id: 'f3_05', texto: 'Política de SST vigente, comunicada y revisada al menos 1 vez por año', puntos: 2 },
          { id: 'f3_06', texto: 'Evaluación inicial del SG-SST actualizada en el último año', puntos: 2 },
          { id: 'f3_07', texto: 'Plan anual de trabajo con metas, indicadores, responsables y presupuesto', puntos: 4 },
          { id: 'f3_08', texto: 'Afiliacion SGSS completa y al dia para todos los trabajadores', puntos: 4 }
        ]
      },
      {
        id: 'hacer_salud',
        nombre: 'HACER — Gestión de la Salud (20 pts)',
        puntos: 20,
        items: [
          { id: 'f3_09', texto: 'Perfil sociodemografico de trabajadores actualizado (último año)', puntos: 4 },
          { id: 'f3_10', texto: 'Exámenes médicos ocupacionales: ingreso, periódicos y egreso', puntos: 4 },
          { id: 'f3_11', texto: 'Actividades de PYP en salud ejecutadas con evidencia', puntos: 4 },
          { id: 'f3_12', texto: 'Custodia de historias clínicas ocupacionales con IPS autorizada', puntos: 4 },
          { id: 'f3_13', texto: 'Programa de vigilancia epidemiológica activo para riesgos prioritarios', puntos: 4 }
        ]
      },
      {
        id: 'hacer_peligros',
        nombre: 'HACER — Gestión de Peligros y Riesgos (30 pts)',
        puntos: 30,
        items: [
          { id: 'f3_14', texto: 'Matriz de peligros y riesgos actualizada (GTC-45) con todos los cargos', puntos: 6 },
          { id: 'f3_15', texto: 'Medidas de prevención y control priorizadas e implementadas', puntos: 6 },
          { id: 'f3_16', texto: 'Inspecciones de seguridad programadas y documentadas', puntos: 5 },
          { id: 'f3_17', texto: 'Mantenimiento preventivo documentado con cronograma', puntos: 5 },
          { id: 'f3_18', texto: 'Entrega, seguimiento y reposición de EPP con registros', puntos: 4 },
          { id: 'f3_19', texto: 'Señalización, demarcación y normas de seguridad implementadas', puntos: 4 }
        ]
      },
      {
        id: 'hacer_amenazas',
        nombre: 'HACER — Gestión de Amenazas (10 pts)',
        puntos: 10,
        items: [
          { id: 'f3_20', texto: 'Plan de emergencias con análisis de vulnerabilidad, recursos y procedimientos', puntos: 4 },
          { id: 'f3_21', texto: 'Brigadas de emergencia conformadas, capacitadas y dotadas', puntos: 3 },
          { id: 'f3_22', texto: 'Simulacros de emergencia realizados al menos 1 vez al año con informe', puntos: 3 }
        ]
      },
      {
        id: 'verificar',
        nombre: 'VERIFICAR (10 pts)',
        puntos: 10,
        items: [
          { id: 'f3_23', texto: 'Investigación de ATEL con planes de acción y seguimiento', puntos: 4 },
          { id: 'f3_24', texto: 'Medición de indicadores del SG-SST (estructura, proceso, resultado)', puntos: 3 },
          { id: 'f3_25', texto: 'Auditoría anual al SG-SST realizada con informe y plan de mejora', puntos: 3 }
        ]
      },
      {
        id: 'actuar',
        nombre: 'ACTUAR — Mejoramiento (5 pts)',
        puntos: 5,
        items: [
          { id: 'f3_26', texto: 'Acciones preventivas y correctivas cerradas y verificadas', puntos: 3 },
          { id: 'f3_27', texto: 'Revisión anual por la alta dirección documentada y con compromisos', puntos: 2 }
        ]
      }
    ]
  }
};

// ═══════════════════════════════════════════
// VENCIMIENTOS SST PREDEFINIDOS
// ═══════════════════════════════════════════
var SST_VENCIMIENTOS_TIPO = [
  { id: 'exam_med', label: 'Examen médico ocupacional', frecuencia: 'Anual o según concepto médico' },
  { id: 'copasst', label: 'Reunión COPASST / Vigía SST', frecuencia: 'Mensual obligatoria' },
  { id: 'simulacro', label: 'Simulacro de emergencias', frecuencia: 'Mínimo 1 vez al año' },
  { id: 'capacitacion', label: 'Capacitación SST al personal', frecuencia: 'Según programa anual' },
  { id: 'inspeccion', label: 'Inspección de seguridad', frecuencia: 'Según cronograma' },
  { id: 'epp', label: 'Reposición de EPP', frecuencia: 'Según vida útil' },
  { id: 'revision_alta', label: 'Revisión alta dirección SG-SST', frecuencia: 'Anual mínimo' },
  { id: 'auditoria', label: 'Auditoría interna SG-SST', frecuencia: 'Anual mínimo' },
  { id: 'actualizacion_matriz', label: 'Actualización matriz de peligros', frecuencia: 'Anual o ante cambios' },
  { id: 'renovacion_licencia', label: 'Renovación licencia SSO responsable', frecuencia: 'Según vencimiento' },
];

// ═══════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════
function loadSSTData() {
  try { return JSON.parse(localStorage.getItem('normalis_sst') || '{}'); } catch(e) { return {}; }
}
function saveSSTData(data) {
  try { localStorage.setItem('normalis_sst', JSON.stringify(data)); } catch(e) {}
}

// ═══════════════════════════════════════════
// CALCULAR SCORE
// ═══════════════════════════════════════════
function calcSSTScore() {
  var data = loadSSTData();
  var fase = data.fase || 'fase1';
  var estandar = SST_ESTANDARES[fase];
  var saved = data.autoevaluacion || {};
  var total = 0, obtenido = 0;
  estandar.grupos.forEach(function(g) {
    g.items.forEach(function(item) {
      total += item.puntos;
      if (saved[item.id] === 'cumple') obtenido += item.puntos;
      else if (saved[item.id] === 'parcial') obtenido += Math.floor(item.puntos * 0.5);
    });
  });
  var pct = total > 0 ? Math.round(obtenido / total * 100) : 0;
  var semaforo = pct < 60 ? 'critico' : pct < 85 ? 'moderado' : 'aceptable';
  var label = pct < 60 ? '🔴 Crítico — Riesgo alto de sanción' : pct < 85 ? '🟡 Moderado — Requiere mejoras' : '🟢 Aceptable — SG-SST en orden';
  return { pct: pct, obtenido: obtenido, total: total, semaforo: semaforo, label: label, fase: fase };
}

// ═══════════════════════════════════════════
// RENDER PRINCIPAL
// ═══════════════════════════════════════════
function renderSST() {
  var container = document.getElementById('sst-container');
  if (!container) return;
  var data = loadSSTData();
  var score = calcSSTScore();
  var activeTab = data.activeTab || 'dashboard';

  container.innerHTML =
    '<div style="max-width:900px;margin:0 auto;padding:0 0 40px">' +
      // Header
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">' +
        '<div>' +
          '<h2 style="font-size:22px;font-weight:700;color:var(--text);margin:0">SG-SST</h2>' +
          '<p style="font-size:13px;color:var(--text-muted);margin:4px 0 0">Sistema de Gestión de Seguridad y Salud en el Trabajo · Res. 0312/2019</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button onclick="sstSetTab(\'autoevaluacion\')" class="btn btn-sm" style="background:var(--teal);color:#fff">Autoevaluación</button>' +
          '<button onclick="sstSetTab(\'plan\')" class="btn btn-sm">Plan de Trabajo</button>' +
          '<button onclick="sstSetTab(\'vencimientos\')" class="btn btn-sm">Vencimientos</button>' +
        '</div>' +
      '</div>' +
      // Score card
      _sstScoreCard(score) +
      // Tabs content
      '<div id="sst-tab-content">' + _sstTabContent(activeTab, data, score) + '</div>' +
    '</div>';
}

function sstSetTab(tab) {
  var data = loadSSTData();
  data.activeTab = tab;
  saveSSTData(data);
  var el = document.getElementById('sst-tab-content');
  if (el) el.innerHTML = _sstTabContent(tab, data, calcSSTScore());
}

// ═══════════════════════════════════════════
// SCORE CARD
// ═══════════════════════════════════════════
function _sstScoreCard(score) {
  var color = score.semaforo === 'critico' ? '#ef4444' : score.semaforo === 'moderado' ? '#f59e0b' : '#10b981';
  var data = loadSSTData();
  var faseLabel = SST_ESTANDARES[score.fase] ? SST_ESTANDARES[score.fase].label : 'Fase I';
  return '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:24px">' +
    '<div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">' +
      '<div style="text-align:center;min-width:100px">' +
        '<div style="font-size:52px;font-weight:800;color:' + color + ';line-height:1">' + score.pct + '%</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">Cumplimiento</div>' +
      '</div>' +
      '<div style="flex:1;min-width:200px">' +
        '<div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px">' + score.label + '</div>' +
        '<div style="background:var(--bg);border-radius:8px;height:10px;overflow:hidden;margin-bottom:8px">' +
          '<div style="height:100%;width:' + score.pct + '%;background:' + color + ';border-radius:8px;transition:.4s"></div>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">' + score.obtenido + ' / ' + score.total + ' puntos · ' + faseLabel + '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
        '<select onchange="sstCambiarFase(this.value)" style="padding:6px 12px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:13px">' +
          '<option value="fase1"' + (score.fase==='fase1'?' selected':'') + '>&lt; 10 trabajadores</option>' +
          '<option value="fase2"' + (score.fase==='fase2'?' selected':'') + '>11 a 50 trabajadores</option>' +
          '<option value="fase3"' + (score.fase==='fase3'?' selected':'') + '>Más de 50 trabajadores</option>' +
        '</select>' +
        '<button onclick="sstExportarReporte()" class="btn btn-sm" style="font-size:12px">📄 Exportar reporte</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function sstCambiarFase(fase) {
  var data = loadSSTData();
  data.fase = fase;
  data.autoevaluacion = {};
  saveSSTData(data);
  renderSST();
  if (typeof toast === 'function') toast('Fase actualizada — autoevaluación reiniciada', 'info');
}

// ═══════════════════════════════════════════
// TAB CONTENT ROUTER
// ═══════════════════════════════════════════
function _sstTabContent(tab, data, score) {
  if (tab === 'autoevaluacion') return _sstAutoEval(data, score);
  if (tab === 'plan') return _sstPlan(data);
  if (tab === 'vencimientos') return _sstVencimientos(data);
  return _sstDashboard(data, score);
}

// ═══════════════════════════════════════════
// TAB: AUTOEVALUACIÓN
// ═══════════════════════════════════════════
function _sstAutoEval(data, score) {
  var estandar = SST_ESTANDARES[score.fase];
  var saved = (data.autoevaluacion || {});
  var html = '<div style="display:flex;flex-direction:column;gap:16px">';

  estandar.grupos.forEach(function(grupo) {
    var grpCumple = grupo.items.filter(function(i){ return saved[i.id]==='cumple'; }).length;
    var grpTotal = grupo.items.length;
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden">';
    html += '<div style="padding:14px 18px;background:var(--bg);display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="sstToggleGrupo(\'' + grupo.id + '\')">';
    html += '<div style="font-weight:700;font-size:14px;color:var(--text)">' + grupo.nombre + '</div>';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<span style="font-size:12px;color:' + (grpCumple===grpTotal?'#10b981':'var(--text-muted)') + '">' + grpCumple + '/' + grpTotal + '</span>';
    html += '<span id="sst-arrow-' + grupo.id + '">▼</span></div></div>';
    html += '<div id="sst-grp-' + grupo.id + '" style="padding:16px 18px;display:flex;flex-direction:column;gap:12px">';

    grupo.items.forEach(function(item) {
      var val = saved[item.id] || '';
      html += '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px;background:var(--bg);border-radius:8px">';
      html += '<div style="flex:1">';
      html += '<div style="font-size:13px;color:var(--text);margin-bottom:6px">' + item.texto + '</div>';
      html += '<div style="font-size:11px;color:var(--text-muted)">Puntaje: ' + item.puntos + ' pts</div>';
      html += '</div>';
      html += '<div style="display:flex;flex-direction:column;gap:4px;min-width:110px">';
      html += '<button onclick="sstSetItem(\'' + item.id + '\',\'cumple\')" style="padding:4px 10px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:600;' + (val==='cumple'?'background:#10b981;color:#fff':'background:var(--card);color:var(--text-muted);border:1px solid var(--border)') + '">✓ Cumple</button>';
      html += '<button onclick="sstSetItem(\'' + item.id + '\',\'parcial\')" style="padding:4px 10px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:600;' + (val==='parcial'?'background:#f59e0b;color:#fff':'background:var(--card);color:var(--text-muted);border:1px solid var(--border)') + '">⚡ Parcial</button>';
      html += '<button onclick="sstSetItem(\'' + item.id + '\',\'no\')" style="padding:4px 10px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:600;' + (val==='no'?'background:#ef4444;color:#fff':'background:var(--card);color:var(--text-muted);border:1px solid var(--border)') + '">✗ No cumple</button>';
      html += '</div></div>';
    });

    html += '</div></div>';
  });

  html += '</div>';
  return html;
}

function sstSetItem(id, val) {
  var data = loadSSTData();
  if (!data.autoevaluacion) data.autoevaluacion = {};
  data.autoevaluacion[id] = val;
  saveSSTData(data);
  // Update score card
  var scoreCard = document.querySelector('[style*="52px"][style*="font-weight:800"]');
  var newScore = calcSSTScore();
  var scoreEl = scoreCard ? scoreCard.parentElement.parentElement.parentElement : null;
  if (scoreEl) {
    var color = newScore.semaforo==='critico'?'#ef4444':newScore.semaforo==='moderado'?'#f59e0b':'#10b981';
    var numEl = scoreEl.querySelector('[style*="52px"]');
    if (numEl) numEl.textContent = newScore.pct + '%';
  }
  // Re-render the button row
  renderSST();
  sstSetTab('autoevaluacion');
}

function sstToggleGrupo(id) {
  var el = document.getElementById('sst-grp-' + id);
  var arrow = document.getElementById('sst-arrow-' + id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'flex' : 'none';
  el.style.flexDirection = 'column';
  if (arrow) arrow.textContent = el.style.display === 'none' ? '▶' : '▼';
}

// ═══════════════════════════════════════════
// TAB: PLAN DE TRABAJO ANUAL
// ═══════════════════════════════════════════
function _sstPlan(data) {
  var actividades = data.plan || [];
  var html = '<div style="display:flex;flex-direction:column;gap:16px">';

  // Form nueva actividad
  html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px">';
  html += '<h3 style="font-size:15px;font-weight:700;margin:0 0 16px;color:var(--text)">Nueva Actividad</h3>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';
  html += '<input id="sst-plan-actividad" placeholder="Descripción de la actividad" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px;grid-column:1/-1">';
  html += '<select id="sst-plan-categoria" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '<option value="recursos">Recursos</option>';
  html += '<option value="salud">Gestión Salud</option>';
  html += '<option value="peligros">Peligros y Riesgos</option>';
  html += '<option value="emergencias">Gestión Amenazas</option>';
  html += '<option value="mejora">Mejoramiento</option>';
  html += '</select>';
  html += '<input id="sst-plan-responsable" placeholder="Responsable" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '<input id="sst-plan-fecha" type="date" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '<input id="sst-plan-recurso" placeholder="Recurso / presupuesto (opcional)" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '</div>';
  html += '<button onclick="sstGuardarActividad()" class="btn" style="background:var(--teal);color:#fff">Agregar actividad</button>';
  html += '</div>';

  // Lista actividades
  if (actividades.length === 0) {
    html += '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:14px">No hay actividades en el plan de trabajo. Agregue la primera arriba.</div>';
  } else {
    var CATCOLORS = { recursos:'#6366f1', salud:'#10b981', peligros:'#f59e0b', emergencias:'#ef4444', mejora:'#0ea5e9' };
    html += '<div style="display:flex;flex-direction:column;gap:8px">';
    actividades.forEach(function(act, i) {
      var color = CATCOLORS[act.categoria] || '#64748b';
      var vencido = act.fecha && new Date(act.fecha) < new Date() && act.estado !== 'completada';
      html += '<div style="background:var(--card);border:1px solid var(--border);border-left:4px solid ' + color + ';border-radius:10px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px">';
      html += '<div style="flex:1">';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">' + act.actividad + '</div>';
      html += '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--text-muted)">';
      html += '<span>👤 ' + (act.responsable || '—') + '</span>';
      html += '<span' + (vencido?' style="color:#ef4444;font-weight:600"':'') + '>📅 ' + (act.fecha || '—') + (vencido?' ⚠️':'') + '</span>';
      if (act.recurso) html += '<span>💰 ' + act.recurso + '</span>';
      html += '</div></div>';
      html += '<div style="display:flex;gap:6px;align-items:center">';
      html += '<select onchange="sstEstadoActividad(' + i + ',this.value)" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--text);font-size:12px">';
      ['pendiente','en_proceso','completada'].forEach(function(s) {
        html += '<option value="' + s + '"' + (act.estado===s?' selected':'') + '>' + (s==='pendiente'?'⏳ Pendiente':s==='en_proceso'?'🔄 En proceso':'✅ Completada') + '</option>';
      });
      html += '</select>';
      html += '<button onclick="sstEliminarActividad(' + i + ')" style="padding:4px 8px;background:rgba(239,68,68,.1);color:#fca5a5;border:1px solid rgba(239,68,68,.3);border-radius:6px;cursor:pointer;font-size:12px">🗑</button>';
      html += '</div></div>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function sstGuardarActividad() {
  var actividad = (document.getElementById('sst-plan-actividad')||{}).value || '';
  var categoria = (document.getElementById('sst-plan-categoria')||{}).value || 'recursos';
  var responsable = (document.getElementById('sst-plan-responsable')||{}).value || '';
  var fecha = (document.getElementById('sst-plan-fecha')||{}).value || '';
  var recurso = (document.getElementById('sst-plan-recurso')||{}).value || '';
  if (!actividad.trim()) { if (typeof toast==='function') toast('Ingrese la descripción de la actividad','warning'); return; }
  var data = loadSSTData();
  if (!data.plan) data.plan = [];
  data.plan.push({ actividad: actividad.trim(), categoria: categoria, responsable: responsable, fecha: fecha, recurso: recurso, estado: 'pendiente', createdAt: new Date().toISOString() });
  saveSSTData(data);
  if (typeof toast==='function') toast('Actividad agregada al plan','success');
  if (typeof logAction==='function') logAction('sst_plan_add', 'sst', 'Actividad SST: ' + actividad.trim());
  renderSST(); sstSetTab('plan');
}

function sstEstadoActividad(i, estado) {
  var data = loadSSTData();
  if (data.plan && data.plan[i]) { data.plan[i].estado = estado; saveSSTData(data); }
  renderSST(); sstSetTab('plan');
}

function sstEliminarActividad(i) {
  nlConfirm('¿Eliminar esta actividad del plan?', 'Eliminar', '#ef4444').then(function(ok) {
    if (!ok) return;
    var data = loadSSTData();
    if (data.plan) { data.plan.splice(i, 1); saveSSTData(data); }
    if (typeof toast==='function') toast('Actividad eliminada','info');
    renderSST(); sstSetTab('plan');
  });
}

// ═══════════════════════════════════════════
// TAB: VENCIMIENTOS SST
// ═══════════════════════════════════════════
function _sstVencimientos(data) {
  var venc = data.vencimientos_sst || [];
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  var html = '<div style="display:flex;flex-direction:column;gap:16px">';

  // Form nuevo vencimiento
  html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px">';
  html += '<h3 style="font-size:15px;font-weight:700;margin:0 0 16px;color:var(--text)">Nuevo Vencimiento SST</h3>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';
  html += '<select id="sst-venc-tipo" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  SST_VENCIMIENTOS_TIPO.forEach(function(t) { html += '<option value="' + t.id + '">' + t.label + '</option>'; });
  html += '</select>';
  html += '<input id="sst-venc-desc" placeholder="Detalle (quién / qué área)" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '<input id="sst-venc-fecha" type="date" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '<input id="sst-venc-responsable" placeholder="Responsable" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:13px">';
  html += '</div>';
  html += '<button onclick="sstGuardarVencimiento()" class="btn" style="background:var(--teal);color:#fff">Agregar vencimiento</button>';
  html += '</div>';

  // Lista
  if (venc.length === 0) {
    html += '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:14px">No hay vencimientos SST registrados.</div>';
  } else {
    var sorted = venc.slice().sort(function(a,b){ return new Date(a.fecha)-new Date(b.fecha); });
    html += '<div style="display:flex;flex-direction:column;gap:8px">';
    sorted.forEach(function(v, i) {
      var fv = new Date(v.fecha); fv.setHours(0,0,0,0);
      var dias = Math.round((fv-hoy)/(86400000));
      var urgency = dias < 0 ? 'vencido' : dias <= 7 ? 'critico' : dias <= 30 ? 'proximo' : 'ok';
      var colors = { vencido:'#ef4444', critico:'#f97316', proximo:'#f59e0b', ok:'#10b981' };
      var labels = { vencido:'VENCIDO', critico:'Vence en ' + dias + 'd', proximo:'Vence en ' + dias + 'd', ok:'Vence en ' + dias + 'd' };
      html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px">';
      html += '<div style="width:10px;height:10px;border-radius:50%;background:' + colors[urgency] + ';flex-shrink:0"></div>';
      html += '<div style="flex:1">';
      html += '<div style="font-size:13px;font-weight:600;color:var(--text)">' + v.label + (v.desc ? ' — ' + v.desc : '') + '</div>';
      html += '<div style="font-size:12px;color:var(--text-muted);margin-top:2px">📅 ' + v.fecha + ' · 👤 ' + (v.responsable||'—') + '</div>';
      html += '</div>';
      html += '<span style="font-size:12px;font-weight:700;color:' + colors[urgency] + ';white-space:nowrap">' + labels[urgency] + '</span>';
      html += '<button onclick="sstEliminarVencimiento(' + i + ')" style="padding:4px 8px;background:rgba(239,68,68,.1);color:#fca5a5;border:1px solid rgba(239,68,68,.3);border-radius:6px;cursor:pointer;font-size:12px">🗑</button>';
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function sstGuardarVencimiento() {
  var tipoEl = document.getElementById('sst-venc-tipo');
  var tipoId = tipoEl ? tipoEl.value : '';
  var tipoData = SST_VENCIMIENTOS_TIPO.find(function(t){ return t.id===tipoId; });
  var desc = (document.getElementById('sst-venc-desc')||{}).value || '';
  var fecha = (document.getElementById('sst-venc-fecha')||{}).value || '';
  var responsable = (document.getElementById('sst-venc-responsable')||{}).value || '';
  if (!fecha) { if (typeof toast==='function') toast('Seleccione la fecha de vencimiento','warning'); return; }
  var data = loadSSTData();
  if (!data.vencimientos_sst) data.vencimientos_sst = [];
  data.vencimientos_sst.push({ id: tipoId, label: tipoData ? tipoData.label : tipoId, desc: desc, fecha: fecha, responsable: responsable });
  saveSSTData(data);
  if (typeof toast==='function') toast('Vencimiento SST registrado','success');
  renderSST(); sstSetTab('vencimientos');
}

function sstEliminarVencimiento(i) {
  nlConfirm('¿Eliminar este vencimiento SST?', 'Eliminar', '#ef4444').then(function(ok) {
    if (!ok) return;
    var data = loadSSTData();
    if (data.vencimientos_sst) { data.vencimientos_sst.splice(i,1); saveSSTData(data); }
    renderSST(); sstSetTab('vencimientos');
  });
}

// ═══════════════════════════════════════════
// DASHBOARD (tab por defecto)
// ═══════════════════════════════════════════
function _sstDashboard(data, score) {
  var plan = data.plan || [];
  var venc = data.vencimientos_sst || [];
  var hoy = new Date(); hoy.setHours(0,0,0,0);

  var pendientes = plan.filter(function(a){ return a.estado==='pendiente'; }).length;
  var completadas = plan.filter(function(a){ return a.estado==='completada'; }).length;
  var vencProximos = venc.filter(function(v){
    var fv = new Date(v.fecha); fv.setHours(0,0,0,0);
    return (fv-hoy) <= 30*86400000 && fv >= hoy;
  }).length;
  var vencidos = venc.filter(function(v){
    var fv = new Date(v.fecha); fv.setHours(0,0,0,0);
    return fv < hoy;
  }).length;

  var estandar = SST_ESTANDARES[score.fase];
  var saved = data.autoevaluacion || {};
  var totalItems = 0, noCumple = 0;
  estandar.grupos.forEach(function(g){ g.items.forEach(function(item){ totalItems++; if(saved[item.id]==='no'||!saved[item.id]) noCumple++; }); });
  var evaluados = Object.keys(saved).length;

  var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px">';
  var cards = [
    { label:'Ítems evaluados', val: evaluados + '/' + totalItems, color:'#6366f1' },
    { label:'Sin cumplir', val: noCumple, color:'#ef4444' },
    { label:'Act. plan pendientes', val: pendientes, color:'#f59e0b' },
    { label:'Act. completadas', val: completadas, color:'#10b981' },
    { label:'Vencimientos próximos', val: vencProximos, color:'#f97316' },
    { label:'Vencimientos vencidos', val: vencidos, color:'#ef4444' },
  ];
  cards.forEach(function(c){
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">';
    html += '<div style="font-size:30px;font-weight:800;color:' + c.color + '">' + c.val + '</div>';
    html += '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">' + c.label + '</div>';
    html += '</div>';
  });
  html += '</div>';

  // Quick actions
  html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px">';
  html += '<h3 style="font-size:14px;font-weight:700;color:var(--text);margin:0 0 12px">Acciones recomendadas</h3>';
  var acciones = [];
  if (evaluados < totalItems) acciones.push({ icon:'📋', txt:'Completar la autoevaluación — ' + (totalItems-evaluados) + ' ítems sin responder', tab:'autoevaluacion' });
  if (vencidos > 0) acciones.push({ icon:'⚠️', txt: vencidos + ' vencimiento(s) SST vencido(s) — revisar urgente', tab:'vencimientos' });
  if (vencProximos > 0) acciones.push({ icon:'⏰', txt: vencProximos + ' vencimiento(s) en los próximos 30 días', tab:'vencimientos' });
  if (pendientes > 3) acciones.push({ icon:'📝', txt: pendientes + ' actividades pendientes en el plan de trabajo', tab:'plan' });
  if (acciones.length === 0) acciones.push({ icon:'✅', txt:'SG-SST al día — continúe con el seguimiento periódico', tab:'autoevaluacion' });

  acciones.forEach(function(a){
    html += '<div onclick="sstSetTab(\'' + a.tab + '\')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;margin-bottom:6px;background:var(--bg)">';
    html += '<span style="font-size:18px">' + a.icon + '</span>';
    html += '<span style="font-size:13px;color:var(--text)">' + a.txt + '</span>';
    html += '<span style="margin-left:auto;color:var(--text-muted)">→</span>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// ═══════════════════════════════════════════
// EXPORTAR REPORTE
// ═══════════════════════════════════════════
function sstExportarReporte() {
  var score = calcSSTScore();
  var data = loadSSTData();
  var estandar = SST_ESTANDARES[score.fase];
  var saved = data.autoevaluacion || {};
  var fecha = new Date().toLocaleDateString('es-CO');
  var ipsNombre = localStorage.getItem('normalis_ips_nombre') || 'IPS';

  var lines = [
    'REPORTE SG-SST — ' + ipsNombre,
    'Fecha: ' + fecha + ' | ' + estandar.label,
    'Cumplimiento: ' + score.pct + '% (' + score.obtenido + '/' + score.total + ' pts)',
    'Estado: ' + score.label,
    '',
    '═══ AUTOEVALUACIÓN ═══',
  ];
  estandar.grupos.forEach(function(g){
    lines.push('\n[' + g.nombre + ']');
    g.items.forEach(function(item){
      var estado = saved[item.id] === 'cumple' ? '✓ CUMPLE' : saved[item.id] === 'parcial' ? '⚡ PARCIAL' : saved[item.id] === 'no' ? '✗ NO CUMPLE' : '○ SIN EVALUAR';
      lines.push('  ' + estado + ' — ' + item.texto + ' (' + item.puntos + ' pts)');
    });
  });
  lines.push('\n═══ PLAN DE TRABAJO ═══');
  (data.plan||[]).forEach(function(a){ lines.push('  [' + (a.estado||'pendiente').toUpperCase() + '] ' + a.actividad + ' | ' + (a.responsable||'—') + ' | ' + (a.fecha||'—')); });
  lines.push('\n═══ VENCIMIENTOS SST ═══');
  (data.vencimientos_sst||[]).forEach(function(v){ lines.push('  ' + v.label + (v.desc?' — '+v.desc:'') + ' | ' + v.fecha + ' | ' + (v.responsable||'—')); });
  lines.push('\nGenerado por NormaLis — normalis.co');

  var blob = new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href=url; a.download='reporte-sst-' + fecha.replace(/\//g,'-') + '.txt'; a.click();
  URL.revokeObjectURL(url);
  if (typeof toast==='function') toast('Reporte SST exportado','success');
}

// Init nav hook
var _navWrap_sst = window.nav;
window.nav = function(sec) {
  if (typeof _navWrap_sst === 'function') _navWrap_sst(sec);
  if (sec === 'sst') { setTimeout(renderSST, 100); }
};

// END:normalis-sst.js — NormaLis integrity seal
