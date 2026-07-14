// normalis-bitacora.js
// NormaLis — Gobernanza — bitácora de auditoría interna
// ─────────────────────────────────────────────

// ═══════════════════════════════════════════
// GOBERNANZA — BITÁCORA DE AUDITORÍA
// ═══════════════════════════════════════════
var BIT_PAGE = 0;
var BIT_PAGE_SIZE = 20;

function logAction(modulo, accion, detalle) {
  var logs = JSON.parse(localStorage.getItem('normalis_bitacora') || '[]');
  var user = 'Usuario';
  try {
    if (window.firebase && firebase.auth().currentUser) {
      user = firebase.auth().currentUser.displayName || firebase.auth().currentUser.email || 'Usuario';
    }
  } catch(e) {}
  logs.unshift({
    ts: new Date().toISOString(),
    usuario: user,
    modulo: modulo,
    accion: accion,
    detalle: detalle || ''
  });
  // Keep last 1000 records
  if (logs.length > 1000) logs = logs.slice(0, 1000);
  localStorage.setItem('normalis_bitacora', JSON.stringify(logs));
}

function renderBitacora() {
  var logs = JSON.parse(localStorage.getItem('normalis_bitacora') || '[]');
  var search = (document.getElementById('bit-search')?.value || '').toLowerCase();
  var modFil = document.getElementById('bit-modulo')?.value || '';
  var fechaFil = document.getElementById('bit-fecha')?.value || '';

  var filtered = logs.filter(l => {
    var matchSearch = !search || l.usuario.toLowerCase().includes(search) || l.accion.toLowerCase().includes(search) || l.detalle.toLowerCase().includes(search);
    var matchMod = !modFil || l.modulo === modFil;
    var matchFecha = !fechaFil || l.ts.startsWith(fechaFil);
    return matchSearch && matchMod && matchFecha;
  });

  // KPIs
  var hoy = new Date().toISOString().substring(0,10);
  var semStart = new Date(); semStart.setDate(semStart.getDate() - 7);
  document.getElementById('bit-total').textContent = logs.length;
  document.getElementById('bit-hoy').textContent = logs.filter(l => l.ts.startsWith(hoy)).length;
  document.getElementById('bit-semana').textContent = logs.filter(l => new Date(l.ts) >= semStart).length;
  var users = [...new Set(logs.map(l => l.usuario))];
  document.getElementById('bit-usuarios').textContent = users.length;

  var tbody = document.getElementById('bit-tbody');
  var empty = document.getElementById('bit-empty');
  var pagination = document.getElementById('bit-pagination');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    pagination.innerHTML = '';
    return;
  }
  empty.style.display = 'none';

  var start = BIT_PAGE * BIT_PAGE_SIZE;
  var page = filtered.slice(start, start + BIT_PAGE_SIZE);
  var modColors = {
    'PQRS':'#6366f1','Incidentes':'#ef4444','Vencimientos':'#8b5cf6',
    'PAMEC':'#10b981','Talento':'#3b82f6','Documentos':'#f59e0b',
    'Consentimientos':'#06b6d4','Firma':'#84cc16','Simulacro':'#f97316','Sistema':'#64748b'
  };

  tbody.innerHTML = page.map(l => {
    var d = new Date(l.ts);
    var fecha = d.toLocaleDateString('es-CO') + ' ' + d.toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'});
    var color = modColors[l.modulo] || '#64748b';
    return `<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
      <td style="padding:12px 16px;font-size:12px;color:#64748b;white-space:nowrap">${fecha}</td>
      <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#1e293b">${l.usuario}</td>
      <td style="padding:12px 16px"><span style="background:${color}15;color:${color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${l.modulo}</span></td>
      <td style="padding:12px 16px;font-size:13px;color:#374151">${l.accion}</td>
      <td style="padding:12px 16px;font-size:12px;color:#64748b">${l.detalle}</td>
    </tr>`;
  }).join('');

  var total = filtered.length;
  var pages = Math.ceil(total / BIT_PAGE_SIZE);
  pagination.innerHTML = `<span>${start+1}–${Math.min(start+BIT_PAGE_SIZE,total)} de ${total} registros</span>
    <div style="display:flex;gap:6px">
      ${BIT_PAGE > 0 ? '<button onclick="bitPage(-1)" style="padding:4px 12px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:#fff">← Anterior</button>' : ''}
      ${BIT_PAGE < pages-1 ? '<button onclick="bitPage(1)" style="padding:4px 12px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:#fff">Siguiente →</button>' : ''}
    </div>`;
}

function bitPage(dir) {
  BIT_PAGE += dir;
  renderBitacora();
}

function clearBitacoraFilters() {
  document.getElementById('bit-search').value = '';
  document.getElementById('bit-modulo').value = '';
  document.getElementById('bit-fecha').value = '';
  BIT_PAGE = 0;
  renderBitacora();
}

function exportBitacoraCSV() {
  var logs = JSON.parse(localStorage.getItem('normalis_bitacora') || '[]');
  var csv = 'Fecha,Usuario,Módulo,Acción,Detalle\n';
  logs.forEach(l => {
    var d = new Date(l.ts).toLocaleString('es-CO');
    csv += [d, l.usuario, l.modulo, l.accion, l.detalle].map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',') + '\n';
  });
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'bitacora-normalis-' + new Date().toISOString().substring(0,10) + '.csv';
  link.click();
  logAction('Sistema', 'Exportó bitácora CSV', logs.length + ' registros');
}

function exportBitacoraPDF() {
  var logs = JSON.parse(localStorage.getItem('normalis_bitacora') || '[]').slice(0,100);
  var w = window.open('','_blank');
  w.document.write('<html><head><title>Bitácora de Gobernanza — NormaLis</title>');
  w.document.write('<style>body{font-family:Arial,sans-serif;padding:30px;font-size:12px}h1{color:#6366f1;margin-bottom:4px}p{color:#64748b;margin-top:0}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f8fafc;padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;font-size:11px;color:#64748b}td{padding:8px;border-bottom:1px solid #f1f5f9;font-size:11px}tr:hover td{background:#f8fafc}</style></head><body>');
  w.document.write('<h1>📋 Bitácora de Gobernanza</h1>');
  w.document.write('<p>NormaLis · Generado: ' + new Date().toLocaleString('es-CO') + ' · Mostrando últimos ' + logs.length + ' registros</p>');
  w.document.write('<table><tr><th>Fecha y Hora</th><th>Usuario</th><th>Módulo</th><th>Acción</th><th>Detalle</th></tr>');
  logs.forEach(l => {
    w.document.write('<tr><td>' + new Date(l.ts).toLocaleString('es-CO') + '</td><td>' + l.usuario + '</td><td>' + l.modulo + '</td><td>' + l.accion + '</td><td>' + l.detalle + '</td></tr>');
  });
  w.document.write('</table></body></html>');
  w.print();
  logAction('Sistema', 'Exportó bitácora PDF', logs.length + ' registros');
}

// ── Patch existing save functions to log actions ──
var _origSavePQRS = window.savePQRS;
window.savePQRS = function() {
  var tipo = document.getElementById('pqrs-tipo')?.value || '';
  var nombre = document.getElementById('pqrs-nombre')?.value || '';
  if (_origSavePQRS) _origSavePQRS();
  logAction('PQRS', 'Registró nueva PQRS', tipo + ' de ' + nombre);
};

var _origSaveInc = window.saveIncidente;
window.saveIncidente = function() {
  var tipo = document.getElementById('inc-tipo')?.value || '';
  var sev = document.getElementById('inc-severidad')?.value || '';
  if (_origSaveInc) _origSaveInc();
  logAction('Incidentes', 'Registró evento adverso', tipo + ' — severidad ' + sev);
};

var _origSaveVenc = window.saveVenc;
window.saveVenc = function() {
  var prof = document.getElementById('venc-profesional')?.value || '';
  var tipo = document.getElementById('venc-tipo')?.value || '';
  if (_origSaveVenc) _origSaveVenc();
  logAction('Vencimientos', 'Agregó documento de personal', tipo + ' — ' + prof);
};

var _origPamecAutoeval = window.pamecGuardarAutoeval;
window.pamecGuardarAutoeval = function() {
  if (_origPamecAutoeval) _origPamecAutoeval();
  logAction('PAMEC', 'Guardó autoevaluación PAMEC', 'Fase de autoevaluación actualizada');
};

var _origPamecProceso = window.pamecGuardarProceso;
window.pamecGuardarProceso = function() {
  if (_origPamecProceso) _origPamecProceso();
  logAction('PAMEC', 'Guardó proceso de mejora', 'Proceso registrado en plan de mejoramiento');
};

var _origPamecAccion = window.pamecGuardarAccion;
window.pamecGuardarAccion = function() {
  if (_origPamecAccion) _origPamecAccion();
  logAction('PAMEC', 'Guardó acción de mejora', 'Acción registrada en plan de mejoramiento');
};

var _origFirmar = window.firmarDoc;
window.firmarDoc = function() {
  if (_origFirmar) _origFirmar();
  logAction('Firma', 'Firmó documento digitalmente', 'Documento firmado y versionado');
};

var _origSignCon = window.signCon;
window.signCon = function() {
  if (_origSignCon) _origSignCon();
  logAction('Consentimientos', 'Firmó consentimiento informado', 'Consentimiento completado');
};

var _origSaveProf = window.saveNewProfesional;
window.saveNewProfesional = function() {
  var nombre = document.getElementById('prof-nombre')?.value || document.getElementById('new-prof-nombre')?.value || '';
  if (_origSaveProf) _origSaveProf();
  logAction('Talento', 'Agregó profesional', nombre);
};

// Log login event on page load
(function() {
  try {
    if (window.firebase) {
      firebase.auth().onAuthStateChanged(function(user) {
        if (user) logAction('Sistema', 'Inicio de sesión', user.email || user.displayName || 'Usuario');
      });
    }
  } catch(e) {}
})();

// Init bitacora on nav
var _prevNavBit = window.nav;
window.nav = function(sec) {
  if (typeof _prevNavBit === 'function') _prevNavBit(sec);
  if (sec === 'bitacora') { BIT_PAGE = 0; setTimeout(renderBitacora, 100); }
};



// END:normalis-bitacora.js — NormaLis integrity seal
