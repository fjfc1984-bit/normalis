// normalis-checklist.js
// NormaLis — Motor de Lista de Chequeo por Servicio (Res. 3100/2019)
// Compatible con Firebase Compat SDK y vanilla JS
// ─────────────────────────────────────────────

// ══════════════════════════════════════════════
// ESTADO GLOBAL DEL CHECKLIST
// ══════════════════════════════════════════════
var checklistState = {
  data: null,          // JSON del servicio cargado
  respuestas: {},      // { 'TH-001': 'cumple', ... }
  auditoriaId: null,
  orgId: null,
  sedeId: null,
  guardadoTimer: null
};

var ETIQUETAS_RESP = {
  cumple: 'Cumple',
  cumple_parcialmente: 'Cumple Parcialmente',
  no_cumple: 'No Cumple',
  no_aplica: 'No Aplica'
};

var VALORES_RESP = { cumple: 100, cumple_parcialmente: 50, no_cumple: 0, no_aplica: null };
var ICONOS_EST   = { TH:'👤', IF:'🏗️', DO:'🔧', MD:'💊', PP:'📋', HC:'📁', IS:'🔗' };

// ══════════════════════════════════════════════
// FUNCIÓN PRINCIPAL — cargar checklist de un servicio
// ══════════════════════════════════════════════
function cargarChecklist(codigoServicio, containerId, orgId, sedeId, auditoriaId) {
  var container = document.getElementById(containerId || 'checklist-container');
  if (!container) { console.warn('[Normalis] Contenedor no encontrado'); return; }

  checklistState.orgId  = orgId  || (window.currentUser && window.currentUser.orgId) || 'demo';
  checklistState.sedeId = sedeId || 'sede_principal';

  container.innerHTML = '<div class="normalis-loading"><div class="normalis-spinner"></div><p>Cargando checklist...</p></div>';

  fetch('data/estandares/checklist-' + codigoServicio + '.json')
    .then(function(r) {
      if (!r.ok) throw new Error('No se encontró el checklist para servicio ' + codigoServicio);
      return r.json();
    })
    .then(function(data) {
      checklistState.data = data;

      if (auditoriaId) {
        checklistState.auditoriaId = auditoriaId;
        _cargarRespuestasFirestore(auditoriaId, function() {
          _renderChecklist(container);
        });
      } else {
        checklistState.auditoriaId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);
        _crearAuditoriaFirestore();
        _renderChecklist(container);
      }
    })
    .catch(function(err) {
      console.error('[Normalis Checklist]', err);
      container.innerHTML = '<div style="color:#ef4444;padding:20px;text-align:center">❌ ' + err.message + '</div>';
    });
}

// ══════════════════════════════════════════════
// FIRESTORE
// ══════════════════════════════════════════════
function _crearAuditoriaFirestore() {
  if (typeof firebase === 'undefined') return;
  var ref = firebase.firestore()
    .collection('organizations').doc(checklistState.orgId)
    .collection('sedes').doc(checklistState.sedeId)
    .collection('auditorias').doc(checklistState.auditoriaId);

  var user = firebase.auth().currentUser;
  ref.set({
    codigoServicio: checklistState.data.servicio.codigo,
    nombreServicio: checklistState.data.servicio.nombre,
    estado: 'en_progreso',
    puntajeTotal: 0,
    respuestas: {},
    auditor: user ? { uid: user.uid, email: user.email } : { uid: 'anonimo' },
    creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
    actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function _cargarRespuestasFirestore(auditoriaId, cb) {
  if (typeof firebase === 'undefined') { cb(); return; }
  firebase.firestore()
    .collection('organizations').doc(checklistState.orgId)
    .collection('sedes').doc(checklistState.sedeId)
    .collection('auditorias').doc(auditoriaId)
    .get()
    .then(function(snap) {
      if (snap.exists) checklistState.respuestas = snap.data().respuestas || {};
      cb();
    })
    .catch(function() { cb(); });
}

function _guardarFirestore() {
  clearTimeout(checklistState.guardadoTimer);
  checklistState.guardadoTimer = setTimeout(function() {
    _actualizarEstadoGuardado('guardando');
    var puntaje = _calcularPuntaje();

    if (typeof firebase !== 'undefined') {
      firebase.firestore()
        .collection('organizations').doc(checklistState.orgId)
        .collection('sedes').doc(checklistState.sedeId)
        .collection('auditorias').doc(checklistState.auditoriaId)
        .set({
          respuestas: checklistState.respuestas,
          puntajeTotal: puntaje.total,
          puntajePorEstandar: puntaje.porEstandar,
          estado: _estadoDesde(puntaje.total),
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        .then(function() { _actualizarEstadoGuardado('guardado'); })
        .catch(function() { _actualizarEstadoGuardado('error'); });
    } else {
      // Sin Firebase: guardar en localStorage como fallback
      localStorage.setItem('normalis_checklist_' + checklistState.auditoriaId, JSON.stringify({
        respuestas: checklistState.respuestas,
        puntaje: puntaje.total,
        fecha: new Date().toISOString()
      }));
      _actualizarEstadoGuardado('guardado');
    }
  }, 400);
}

// ══════════════════════════════════════════════
// CÁLCULO DE PUNTAJE
// ══════════════════════════════════════════════
function _calcularPuntaje() {
  if (!checklistState.data) return { total: 0, porEstandar: {} };
  var porEstandar = {};
  var totalPonderado = 0;

  checklistState.data.estandares.forEach(function(est) {
    var suma = 0, pesoTotal = 0;
    est.criterios.forEach(function(crit) {
      var resp = checklistState.respuestas[crit.id];
      if (!resp || resp === 'no_aplica') return;
      var valor = VALORES_RESP[resp] !== undefined ? VALORES_RESP[resp] : 0;
      suma += valor * crit.peso;
      pesoTotal += crit.peso * 100;
    });
    var puntaje = pesoTotal > 0 ? Math.round((suma / pesoTotal) * 100) : 0;
    porEstandar[est.id] = { nombre: est.nombre, puntaje: puntaje, peso: est.peso_porcentual };
    totalPonderado += puntaje * (est.peso_porcentual / 100);
  });

  return { total: Math.round(totalPonderado), porEstandar: porEstandar };
}

function _estadoDesde(puntaje) {
  if (puntaje >= 90) return 'HABILITADO';
  if (puntaje >= 75) return 'HABILITADO CON PLAN';
  if (puntaje >= 60) return 'EN RIESGO';
  return 'NO HABILITADO';
}

function _colorDesde(puntaje) {
  if (puntaje >= 90) return '#22c55e';
  if (puntaje >= 75) return '#f59e0b';
  if (puntaje >= 60) return '#f97316';
  return '#ef4444';
}

function _totalCriterios() {
  if (!checklistState.data) return 0;
  return checklistState.data.estandares.reduce(function(s, e) { return s + e.criterios.length; }, 0);
}

// ══════════════════════════════════════════════
// RENDER PRINCIPAL
// ══════════════════════════════════════════════
function _renderChecklist(container) {
  var d = checklistState.data;
  var puntaje = _calcularPuntaje();
  var color = _colorDesde(puntaje.total);
  var total = _totalCriterios();

  var html = '<div class="chk-wrap">';

  // ─── Cabecera ───
  html += '<div class="chk-header">';
  html += '<div><span class="chk-badge-codigo">Servicio ' + d.servicio.codigo + '</span>';
  html += '<h2 class="chk-titulo">' + d.servicio.nombre + '</h2>';
  html += '<p class="chk-base-legal">' + d.servicio.resolucion_base + '</p></div>';
  html += '<div class="chk-puntaje-total">';
  html += '<div class="chk-puntaje-num" id="chk-puntaje-num" style="color:' + color + '">' + puntaje.total + '%</div>';
  html += '<div class="chk-estado-badge" id="chk-estado-badge" style="background:' + color + '">' + _estadoDesde(puntaje.total) + '</div>';
  html += '<div class="chk-guardado" id="chk-guardado-status">✅ Listo</div>';
  html += '</div></div>';

  // ─── Barra de progreso ───
  var respondidos = Object.keys(checklistState.respuestas).length;
  var pct = total > 0 ? Math.round((respondidos / total) * 100) : 0;
  html += '<div class="chk-progreso">';
  html += '<div class="chk-progreso-label"><span>Progreso</span><span id="chk-criterios-txt">' + respondidos + ' / ' + total + ' criterios</span></div>';
  html += '<div class="chk-barra-fondo"><div class="chk-barra-fill" id="chk-barra-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
  html += '</div>';

  // ─── Chips de estándares ───
  html += '<div class="chk-chips">';
  d.estandares.forEach(function(est) {
    var p = (puntaje.porEstandar[est.id] || {}).puntaje || 0;
    html += '<span class="chk-chip" onclick="document.getElementById(\'chk-est-' + est.id + '\').scrollIntoView({behavior:\'smooth\'})">';
    html += ICONOS_EST[est.id] + ' ' + est.nombre + ' <strong id="chk-chip-' + est.id + '">' + p + '%</strong></span>';
  });
  html += '</div>';

  // ─── Estándares ───
  d.estandares.forEach(function(est) {
    var p = (puntaje.porEstandar[est.id] || {}).puntaje || 0;
    html += '<div class="chk-estandar" id="chk-est-' + est.id + '">';
    html += '<div class="chk-est-header">';
    html += '<span class="chk-est-icon">' + (ICONOS_EST[est.id] || '📌') + '</span>';
    html += '<div class="chk-est-info"><h3>' + est.nombre + '</h3><p>' + est.descripcion + '</p></div>';
    html += '<div class="chk-est-puntaje" id="chk-est-p-' + est.id + '">' + p + '%</div>';
    html += '</div>';
    html += '<div class="chk-criterios">';

    est.criterios.forEach(function(crit) {
      var resp = checklistState.respuestas[crit.id] || '';
      var cardClass = 'chk-criterio' + (resp ? ' chk-resp-' + resp : '');
      html += '<div class="' + cardClass + '" id="chk-crit-' + crit.id + '" data-estandar="' + est.id + '">';

      // Header del criterio
      html += '<div class="chk-crit-header">';
      html += '<span class="chk-crit-codigo">' + crit.id + '</span>';
      if (crit.obligatorio) html += '<span class="chk-crit-obligatorio">Obligatorio</span>';
      html += '<span class="chk-crit-peso">Peso: ' + crit.peso + '</span>';
      html += '</div>';

      // Descripción
      html += '<p class="chk-crit-desc">' + crit.descripcion + '</p>';

      // Opciones de respuesta
      html += '<div class="chk-opciones">';
      ['cumple', 'cumple_parcialmente', 'no_cumple', 'no_aplica'].forEach(function(valor) {
        var checked = resp === valor ? 'checked' : '';
        html += '<label class="chk-opcion">';
        html += '<input type="radio" name="crit-' + crit.id + '" value="' + valor + '" ' + checked + ' onchange="registrarRespuestaChecklist(\'' + crit.id + '\',\'' + valor + '\',\'' + est.id + '\')">';
        html += '<span class="chk-opcion-txt chk-opt-' + valor + '">' + ETIQUETAS_RESP[valor] + '</span>';
        html += '</label>';
      });
      html += '</div>';

      // Evidencias (ocultas por defecto, se muestran si no cumple / parcial)
      var showEv = (resp === 'no_cumple' || resp === 'cumple_parcialmente') ? '' : 'display:none';
      html += '<div class="chk-evidencias" id="chk-ev-' + crit.id + '" style="' + showEv + '">';
      html += '<p class="chk-ev-titulo">📎 Evidencias requeridas:</p><ul>';
      crit.evidencias_requeridas.forEach(function(ev) { html += '<li>' + ev + '</li>'; });
      html += '</ul>';
      if (crit.link_verificacion) {
        html += '<a href="' + crit.link_verificacion + '" target="_blank" rel="noopener noreferrer" class="chk-link-verif">🔗 Verificar en línea</a>';
      }
      html += '</div>';

      // Orientación
      html += '<details class="chk-orientacion"><summary>💡 Orientación</summary>';
      html += '<p>' + crit.orientacion + '</p>';
      html += '<p class="chk-hallazgo-tip"><strong>Hallazgo típico:</strong> ' + crit.hallazgo_tipico + '</p>';
      html += '</details>';
      html += '</div>'; // cierra .chk-criterio
    });

    html += '</div></div>'; // cierra .chk-criterios y .chk-estandar
  });

  // ─── Panel de hallazgos (oculto hasta completar) ───
  html += '<div class="chk-hallazgos-panel" id="chk-hallazgos-panel" style="display:none">';
  html += '<h3>📋 Hallazgos identificados</h3>';
  html += '<div id="chk-lista-hallazgos"></div>';
  html += '<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">';
  html += '<button class="btn btn-primary" onclick="exportarInformeChecklist()">📄 Exportar informe PDF</button>';
  html += '</div></div>';

  html += '</div>'; // cierra .chk-wrap
  container.innerHTML = html;

  // Restaurar estado visual de respuestas previas
  Object.keys(checklistState.respuestas).forEach(function(critId) {
    _actualizarEstiloCriterio(critId, checklistState.respuestas[critId]);
  });

  _actualizarUI();
}

// ══════════════════════════════════════════════
// INTERACCIÓN — REGISTRO DE RESPUESTAS
// ══════════════════════════════════════════════
function registrarRespuestaChecklist(criterioId, valor, estandarId) {
  checklistState.respuestas[criterioId] = valor;

  _actualizarEstiloCriterio(criterioId, valor);

  // Mostrar/ocultar evidencias
  var evDiv = document.getElementById('chk-ev-' + criterioId);
  if (evDiv) {
    evDiv.style.display = (valor === 'no_cumple' || valor === 'cumple_parcialmente') ? 'block' : 'none';
  }

  _actualizarUI();
  _actualizarEstadoGuardado('guardando');
  _guardarFirestore();
}

function _actualizarEstiloCriterio(criterioId, valor) {
  var card = document.getElementById('chk-crit-' + criterioId);
  if (!card) return;
  card.className = card.className.replace(/chk-resp-\S+/g, '').trim();
  if (valor) card.classList.add('chk-resp-' + valor);
}

// ══════════════════════════════════════════════
// ACTUALIZACIÓN DE UI
// ══════════════════════════════════════════════
function _actualizarUI() {
  var puntaje  = _calcularPuntaje();
  var color    = _colorDesde(puntaje.total);
  var respondidos = Object.keys(checklistState.respuestas).length;
  var total    = _totalCriterios();

  // Puntaje total
  var numEl = document.getElementById('chk-puntaje-num');
  if (numEl) { numEl.textContent = puntaje.total + '%'; numEl.style.color = color; }

  var estadoEl = document.getElementById('chk-estado-badge');
  if (estadoEl) { estadoEl.textContent = _estadoDesde(puntaje.total); estadoEl.style.background = color; }

  // Barra
  var barraEl = document.getElementById('chk-barra-fill');
  if (barraEl) { barraEl.style.width = (total > 0 ? Math.round((respondidos / total) * 100) : 0) + '%'; barraEl.style.background = color; }

  var textoEl = document.getElementById('chk-criterios-txt');
  if (textoEl) textoEl.textContent = respondidos + ' / ' + total + ' criterios';

  // Chips y puntaje por estándar
  Object.keys(puntaje.porEstandar).forEach(function(id) {
    var p = puntaje.porEstandar[id].puntaje;
    var chipEl = document.getElementById('chk-chip-' + id);
    if (chipEl) chipEl.textContent = p + '%';
    var pEl = document.getElementById('chk-est-p-' + id);
    if (pEl) pEl.textContent = p + '%';
  });

  // Mostrar hallazgos cuando todos estén respondidos
  if (respondidos >= total && total > 0) _renderHallazgos();

  // Actualizar sidebar global de Normalis si existe
  var sbScore = document.getElementById('sb-score-val');
  if (sbScore) sbScore.textContent = puntaje.total;
}

function _renderHallazgos() {
  var panel = document.getElementById('chk-hallazgos-panel');
  var lista = document.getElementById('chk-lista-hallazgos');
  if (!panel || !lista || !checklistState.data) return;

  var hallazgos = [];
  checklistState.data.estandares.forEach(function(est) {
    est.criterios.forEach(function(crit) {
      var resp = checklistState.respuestas[crit.id];
      if (resp === 'no_cumple' || resp === 'cumple_parcialmente') {
        hallazgos.push({ est: est.nombre, crit: crit, resp: resp });
      }
    });
  });

  if (hallazgos.length === 0) {
    lista.innerHTML = '<p style="color:#22c55e;font-weight:700">✅ Sin hallazgos. El servicio cumple todos los criterios.</p>';
  } else {
    var html = '';
    hallazgos.forEach(function(h) {
      var color = h.resp === 'no_cumple' ? '#ef4444' : '#f59e0b';
      html += '<div style="border-left:3px solid ' + color + ';padding:10px 14px;margin-bottom:10px;background:#f8fafc;border-radius:0 8px 8px 0">';
      html += '<div style="display:flex;gap:8px;font-size:12px;font-weight:700;margin-bottom:4px">';
      html += '<span style="color:#005294">' + h.est + '</span>';
      html += '<span style="color:' + color + '">' + ETIQUETAS_RESP[h.resp] + '</span></div>';
      html += '<p style="font-size:12px;margin:0">' + h.crit.descripcion + '</p>';
      html += '<p style="font-size:11px;color:#64748b;margin:4px 0 0;font-style:italic">' + h.crit.hallazgo_tipico + '</p>';
      html += '</div>';
    });
    lista.innerHTML = html;
  }
  panel.style.display = 'block';
}

function _actualizarEstadoGuardado(estado) {
  var el = document.getElementById('chk-guardado-status');
  if (!el) return;
  var textos = { guardando: '⏳ Guardando...', guardado: '✅ Guardado', error: '❌ Error al guardar' };
  el.textContent = textos[estado] || '';
}

// ══════════════════════════════════════════════
// EXPORTAR INFORME PDF
// (Extiende el printAuditReport existente con datos del checklist)
// ══════════════════════════════════════════════
function exportarInformeChecklist() {
  if (!checklistState.data) return;
  var puntaje   = _calcularPuntaje();
  var hallazgos = _obtenerHallazgos();
  var d         = checklistState.data;
  var color     = _colorDesde(puntaje.total);
  var estado    = _estadoDesde(puntaje.total);
  var hoy       = new Date().toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // Plan de mejoramiento automático por estándar
  var PLAZOS = { TH:'30 días', IF:'60 días', DO:'30 días', MD:'15 días', PP:'30 días', HC:'30 días', IS:'45 días' };
  var RESPONSABLES = { TH:'Rep. Legal / RRHH', IF:'Rep. Legal / Infraestructura', DO:'Coord. Dotación', MD:'Responsable Farmacia', PP:'Coord. Calidad', HC:'Coord. Asistencial', IS:'Rep. Legal' };

  var areasHTML = '';
  Object.keys(puntaje.porEstandar).forEach(function(id) {
    var p = puntaje.porEstandar[id];
    var c = p.puntaje >= 85 ? '#10b981' : p.puntaje >= 60 ? '#f59e0b' : '#ef4444';
    areasHTML += '<tr><td>' + (ICONOS_EST[id] || '') + ' ' + p.nombre + '</td>';
    areasHTML += '<td style="text-align:center;font-weight:700;color:' + c + '">' + p.puntaje + '%</td>';
    areasHTML += '<td>' + p.peso + '%</td></tr>';
  });

  var hallazgosHTML = '';
  var planHTML = '';
  if (hallazgos.length === 0) {
    hallazgosHTML = '<tr><td colspan="3" style="color:#10b981;text-align:center">✅ Sin hallazgos detectados</td></tr>';
    planHTML = '<tr><td colspan="4" style="color:#10b981;text-align:center">✅ Sin acciones correctivas requeridas</td></tr>';
  } else {
    hallazgos.forEach(function(h, i) {
      var c = h.resp === 'no_cumple' ? '#ef4444' : '#f59e0b';
      hallazgosHTML += '<tr><td style="color:' + c + '">' + ETIQUETAS_RESP[h.resp] + '</td>';
      hallazgosHTML += '<td>' + h.estandarNombre + ' — ' + h.crit.id + '</td>';
      hallazgosHTML += '<td style="font-size:11px">' + h.crit.descripcion.slice(0, 100) + '…</td></tr>';
      var estId = h.crit.id.split('-')[0];
      planHTML += '<tr><td>' + (i+1) + '</td><td>' + h.crit.id + '</td>';
      planHTML += '<td style="font-size:11px">' + h.crit.hallazgo_tipico.replace(/^(No existe|Ausencia de|Ausencia total de)/, 'Implementar') + '</td>';
      planHTML += '<td>' + (RESPONSABLES[estId] || 'Responsable asignado') + '</td>';
      planHTML += '<td>' + (PLAZOS[estId] || '30 días') + '</td></tr>';
    });
  }

  var w = window.open('', '_blank', 'width=900,height=700');
  w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Informe NormaLis — ' + d.servicio.nombre + '</title>');
  w.document.write('<style>');
  w.document.write('*{box-sizing:border-box}body{font-family:\'Segoe UI\',sans-serif;font-size:12px;color:#1e293b;margin:0;padding:30px 40px;max-width:860px}');
  w.document.write('.cover{text-align:center;padding:32px 0;border-bottom:3px solid #0ea5e9;margin-bottom:28px}');
  w.document.write('.score-hero{background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;border-radius:12px;padding:24px 28px;margin-bottom:20px;display:flex;align-items:center;gap:28px}');
  w.document.write('.score-big{font-size:68px;font-weight:900;line-height:1;color:' + color + '}');
  w.document.write('h2{font-size:13px;font-weight:800;color:#0284c7;border-bottom:2px solid #0ea5e9;padding-bottom:4px;margin:20px 0 10px}');
  w.document.write('table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}');
  w.document.write('th{background:#0ea5e9;color:#fff;padding:7px 10px;text-align:left;font-weight:700}');
  w.document.write('td{padding:7px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top}');
  w.document.write('tr:nth-child(even) td{background:#f8fafc}');
  w.document.write('.footer{margin-top:28px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8}');
  w.document.write('@media print{body{padding:15px 20px}.score-hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}}');
  w.document.write('</style></head><body>');

  w.document.write('<div class="cover">');
  w.document.write('<h1 style="font-size:20px;font-weight:900">INFORME DE AUTOEVALUACIÓN DE HABILITACIÓN</h1>');
  w.document.write('<p style="color:#64748b">Servicio: ' + d.servicio.nombre + ' (Código ' + d.servicio.codigo + ') · ' + d.servicio.resolucion_base + '</p>');
  w.document.write('<p style="color:#64748b">Fecha: ' + hoy + '</p></div>');

  w.document.write('<div class="score-hero">');
  w.document.write('<div class="score-big">' + puntaje.total + '</div>');
  w.document.write('<div><h2 style="color:#f1f5f9;border:none;margin:0 0 6px">Puntaje de cumplimiento / 100</h2>');
  w.document.write('<span style="background:rgba(255,255,255,.15);color:#fff;border-radius:20px;padding:4px 14px;font-weight:700;font-size:12px">' + estado + '</span>');
  w.document.write('<p style="color:#94a3b8;font-size:11px;margin-top:8px">Hallazgos: ' + hallazgos.length + ' · Criterios respondidos: ' + Object.keys(checklistState.respuestas).length + ' / ' + _totalCriterios() + '</p>');
  w.document.write('</div></div>');

  w.document.write('<h2>📊 Puntaje por Estándar</h2>');
  w.document.write('<table><tr><th>Estándar</th><th>Puntaje</th><th>Peso en total</th></tr>' + areasHTML + '</table>');

  w.document.write('<h2>🔴 Hallazgos (' + hallazgos.length + ')</h2>');
  w.document.write('<table><tr><th>Estado</th><th>Criterio</th><th>Descripción</th></tr>' + hallazgosHTML + '</table>');

  w.document.write('<h2>📌 Plan de Mejoramiento Automático</h2>');
  w.document.write('<table><tr><th>#</th><th>Criterio</th><th>Acción correctiva</th><th>Responsable</th><th>Plazo</th></tr>' + planHTML + '</table>');

  w.document.write('<div class="footer">NormaLis · Autoevaluación de Habilitación · ' + hoy + ' · Este informe es orientativo. No reemplaza la visita oficial de la Secretaría de Salud.</div>');
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 400);
}

function _obtenerHallazgos() {
  var hallazgos = [];
  if (!checklistState.data) return hallazgos;
  checklistState.data.estandares.forEach(function(est) {
    est.criterios.forEach(function(crit) {
      var resp = checklistState.respuestas[crit.id];
      if (resp === 'no_cumple' || resp === 'cumple_parcialmente') {
        hallazgos.push({ estandarId: est.id, estandarNombre: est.nombre, crit: crit, resp: resp });
      }
    });
  });
  return hallazgos;
}

// ══════════════════════════════════════════════
// CSS INJECTADO (si no hay normalis-styles.css actualizado)
// ══════════════════════════════════════════════
(function() {
  if (document.getElementById('normalis-checklist-styles')) return;
  var style = document.createElement('style');
  style.id = 'normalis-checklist-styles';
  style.textContent = [
    '.chk-wrap{max-width:860px;margin:0 auto}',
    '.chk-header{background:#fff;border-radius:10px;padding:20px 24px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start;border:1px solid #e2e8f0;gap:16px}',
    '.chk-badge-codigo{background:#005294;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;display:inline-block;margin-bottom:6px}',
    '.chk-titulo{font-size:18px;font-weight:800;color:#1e293b;margin:0}',
    '.chk-base-legal{font-size:11px;color:#94a3b8;margin:4px 0 0}',
    '.chk-puntaje-total{text-align:center;flex-shrink:0}',
    '.chk-puntaje-num{font-size:32px;font-weight:900;color:#005294;transition:color .3s}',
    '.chk-estado-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;color:#fff;display:inline-block;margin-top:4px}',
    '.chk-guardado{font-size:10px;color:#94a3b8;margin-top:6px}',
    '.chk-progreso{background:#fff;border-radius:10px;padding:14px 20px;border:1px solid #e2e8f0;margin-bottom:14px}',
    '.chk-progreso-label{display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:6px}',
    '.chk-barra-fondo{background:#e2e8f0;border-radius:20px;height:8px;overflow:hidden}',
    '.chk-barra-fill{height:100%;background:#005294;border-radius:20px;transition:width .4s ease,background .3s}',
    '.chk-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}',
    '.chk-chip{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:6px 14px;font-size:12px;cursor:pointer;transition:border-color .15s}',
    '.chk-chip:hover{border-color:#005294}',
    '.chk-estandar{background:#fff;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:14px;overflow:hidden}',
    '.chk-est-header{display:flex;align-items:center;gap:12px;padding:14px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0}',
    '.chk-est-icon{font-size:22px;flex-shrink:0}',
    '.chk-est-info h3{font-size:14px;font-weight:800;margin:0}',
    '.chk-est-info p{font-size:11px;color:#94a3b8;margin:2px 0 0}',
    '.chk-est-puntaje{margin-left:auto;font-size:18px;font-weight:900;color:#005294}',
    '.chk-criterios{padding:10px}',
    '.chk-criterio{border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:8px;transition:border-color .2s}',
    '.chk-resp-cumple{border-color:#22c55e;background:#f0fdf4}',
    '.chk-resp-cumple_parcialmente{border-color:#f59e0b;background:#fffbeb}',
    '.chk-resp-no_cumple{border-color:#ef4444;background:#fef2f2}',
    '.chk-resp-no_aplica{border-color:#94a3b8;opacity:.7}',
    '.chk-crit-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}',
    '.chk-crit-codigo{background:#005294;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px}',
    '.chk-crit-obligatorio{background:#fef3c7;color:#92400e;font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px}',
    '.chk-crit-peso{margin-left:auto;font-size:11px;color:#94a3b8}',
    '.chk-crit-desc{font-size:13px;line-height:1.5;color:#1e293b;margin-bottom:10px}',
    '.chk-opciones{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}',
    '.chk-opcion{cursor:pointer}',
    '.chk-opcion input{display:none}',
    '.chk-opcion-txt{font-size:12px;font-weight:600;padding:5px 12px;border-radius:20px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;user-select:none;display:block;transition:all .15s}',
    '.chk-opcion input:checked + .chk-opt-cumple{background:#22c55e;color:#fff;border-color:#22c55e}',
    '.chk-opcion input:checked + .chk-opt-cumple_parcialmente{background:#f59e0b;color:#fff;border-color:#f59e0b}',
    '.chk-opcion input:checked + .chk-opt-no_cumple{background:#ef4444;color:#fff;border-color:#ef4444}',
    '.chk-opcion input:checked + .chk-opt-no_aplica{background:#94a3b8;color:#fff;border-color:#94a3b8}',
    '.chk-evidencias{background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 12px;margin:6px 0;font-size:12px}',
    '.chk-ev-titulo{font-weight:700;margin-bottom:6px}',
    '.chk-evidencias ul{padding-left:16px}',
    '.chk-evidencias li{margin-bottom:3px}',
    '.chk-link-verif{display:inline-block;margin-top:6px;font-size:11px;color:#005294}',
    '.chk-orientacion{margin-top:6px;font-size:12px}',
    '.chk-orientacion summary{cursor:pointer;color:#94a3b8;user-select:none}',
    '.chk-orientacion p{margin-top:5px;line-height:1.5;color:#1e293b}',
    '.chk-hallazgo-tip{color:#ef4444;font-style:italic;margin-top:3px}',
    '.chk-hallazgos-panel{background:#fff;border-radius:10px;border:1px solid #e2e8f0;padding:18px;margin-top:16px}',
    '.chk-hallazgos-panel h3{font-size:15px;font-weight:800;margin-bottom:14px}'
  ].join('');
  document.head.appendChild(style);
})();

// END:normalis-checklist.js — NormaLis integrity seal
