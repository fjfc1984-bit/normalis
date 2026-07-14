// normalis-simulacro.js
// NormaLis — Módulo de simulacro de visita de la Secretaría de Salud
// ─────────────────────────────────────────────

// ═══════════════════════════════════════════
// MÓDULO SIMULACRO SECRETARÍA
// ═══════════════════════════════════════════
var SIMULACRO_CRITERIOS = [
  { cat:'🏗️ Infraestructura y Dotación', items:[
    'Las áreas cumplen con metros cuadrados mínimos por servicio habilitado',
    'Señalización de emergencias, rutas de evacuación y extintores vigentes',
    'Baños diferenciados para usuarios y personal, con acceso para discapacitados',
    'Iluminación y ventilación adecuada en todas las áreas',
    'Equipos biomédicos con mantenimiento preventivo documentado y vigente',
    'Inventario de dotación actualizado y disponible para verificación'
  ]},
  { cat:'👥 Talento Humano', items:[
    'Hojas de vida del personal con soportes completos y actualizados',
    'Tarjetas profesionales vigentes de todo el personal asistencial',
    'Contratos laborales o de prestación de servicios firmados y vigentes',
    'Certificados de soporte vital (SVB/SVA) vigentes según aplique',
    'Inducción y reinducción documentada para el personal',
    'Carné de vacunación del personal asistencial al día'
  ]},
  { cat:'📋 Procesos y Procedimientos', items:[
    'Manual de funciones y procedimientos actualizado y socializado',
    'Protocolos de atención por servicio habilitado disponibles',
    'Protocolo de bioseguridad y manejo de residuos hospitalarios',
    'Consentimientos informados por procedimiento disponibles',
    'Protocolo de referencia y contrarreferencia establecido',
    'Guías de práctica clínica adoptadas y disponibles'
  ]},
  { cat:'📊 Sistema de Gestión de Calidad', items:[
    'PAMEC actualizado con autoevaluación del año en curso',
    'Indicadores de calidad con metas, resultados y análisis',
    'Plan de mejoramiento vigente con acciones y responsables',
    'Actas de comités (COPASO, farmacia, infecciones) al día',
    'Registro de eventos adversos e incidentes documentado',
    'Sistema de PQRS activo con seguimiento y cierre documentado'
  ]},
  { cat:'💊 Medicamentos y Dispositivos', items:[
    'Botiquín de urgencias completo y con medicamentos vigentes',
    'Control de temperatura de neveras de medicamentos',
    'Inventario de medicamentos sin vencidos en stock',
    'Dispositivos médicos con registro INVIMA vigente',
    'Programa de gestión de residuos peligrosos activo'
  ]}
];

function renderSimulacro() {
  var container = document.getElementById('simulacro-sections');
  if (!container) return;
  var saved = JSON.parse(localStorage.getItem('normalis_simulacro') || '{}');
  var totalItems = 0, checkedItems = 0;
  container.innerHTML = SIMULACRO_CRITERIOS.map((cat, ci) => {
    totalItems += cat.items.length;
    var catChecked = cat.items.filter((item, ii) => saved[ci+'-'+ii]).length;
    checkedItems += catChecked;
    return `<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#f8fafc;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleSimCat(${ci})">
        <div style="font-weight:700;font-size:14px">${cat.cat}</div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:12px;color:${catChecked===cat.items.length?'#10b981':'#64748b'}">${catChecked}/${cat.items.length}</span>
          <span id="sim-arrow-${ci}">▼</span>
        </div>
      </div>
      <div id="sim-cat-${ci}" style="padding:14px 18px;display:flex;flex-direction:column;gap:10px">
        ${cat.items.map((item, ii) => `<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:13px">
          <input type="checkbox" ${saved[ci+'-'+ii]?'checked':''} onchange="toggleSimItem(${ci},${ii},this.checked)" style="margin-top:2px;width:16px;height:16px;flex-shrink:0">
          <span style="color:${saved[ci+'-'+ii]?'#10b981':'#374151'}">${item}</span>
        </label>`).join('')}
      </div>
    </div>`;
  }).join('');
  var pct = totalItems ? Math.round(checkedItems/totalItems*100) : 0;
  document.getElementById('sim-score').textContent = pct + '%';
  document.getElementById('sim-counts').textContent = checkedItems + ' / ' + totalItems + ' criterios';
  var status = pct === 100 ? '✅ Listo para visita' : pct >= 80 ? '🟡 Casi listo' : pct >= 50 ? '🟠 En proceso' : '🔴 Requiere atención';
  document.getElementById('sim-status').textContent = status;
}
function toggleSimCat(ci) {
  var el = document.getElementById('sim-cat-'+ci);
  var arrow = document.getElementById('sim-arrow-'+ci);
  el.style.display = el.style.display === 'none' ? 'flex' : 'none';
  el.style.flexDirection = 'column';
  arrow.textContent = el.style.display === 'none' ? '▶' : '▼';
}
function toggleSimItem(ci, ii, checked) {
  var saved = JSON.parse(localStorage.getItem('normalis_simulacro') || '{}');
  saved[ci+'-'+ii] = checked;
  localStorage.setItem('normalis_simulacro', JSON.stringify(saved));
  renderSimulacro();
}
function resetSimulacro() {
  if (confirm('¿Reiniciar el simulacro? Se borrarán todas las respuestas.')) {
    localStorage.removeItem('normalis_simulacro');
    renderSimulacro();
  }
}

// Init new modules on nav
var _navWrap2026 = window.nav;
window.nav = function(sec) {
  if (typeof _navWrap2026 === 'function') _navWrap2026(sec);
  if (sec === 'pqrs') { setTimeout(renderPQRS, 100); }
  if (sec === 'incidentes') { setTimeout(renderIncidentes, 100); }
  if (sec === 'vencimientos-personal') { setTimeout(renderVencimientos, 100); }
  if (sec === 'simulacro') { setTimeout(renderSimulacro, 100); }
};



