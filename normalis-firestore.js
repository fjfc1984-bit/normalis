// normalis-firestore.js
// NormaLis — Capa de sincronización Firestore — persistencia en la nube
// ─────────────────────────────────────────────

// ═══════════════════════════════════════════
// ESCALABILIDAD — CAPA DE SINCRONIZACIÓN FIRESTORE
// ═══════════════════════════════════════════

// Claves de localStorage que se sincronizan con Firestore
var FS_KEYS = [
  'normalis_pqrs',
  'normalis_incidentes',
  'normalis_vencimientos',
  'normalis_bitacora',
  'normalis_simulacro',
  'th_profesionales',
  'normalis_pamec_autoeval',
  'normalis_pamec_procesos',
  'normalis_pamec_acciones',
  'normalis_pamec_fase',
  'normalis_consentimientos',
  'normalis_versiones',
  'normalis_cal_eventos',
  'normalis_roi_data',
  // R2-fix: configuración IPS sincronizada a Firestore
  'normalis_cfg',
  'normalis_ips_nombre',
  'normalis_ips_ciudad'
];

var fsSync = {
  _db: null,
  _userId: null,
  _online: true,

  init: function() {
    // BUG #5 FIX: ya no registra onAuthStateChanged aquí.
    // La sincronización arranca desde hideAuthScreen() (normativa-app-v2.html)
    // solo después de que el rol del usuario ha sido verificado en Firestore.
    try {
      if (!window.firebase || !firebase.firestore) return;
      this._db = firebase.firestore();
      // Online/offline detection
      window.addEventListener('online', function() {
        fsSync._online = true;
        fsSync.setSyncStatus('synced');
        if (fsSync._userId) FS_KEYS.forEach(k => fsSync.push(k));
      });
      window.addEventListener('offline', function() {
        fsSync._online = false;
        fsSync.setSyncStatus('offline');
      });
    } catch(e) {
      console.warn('[NormaLis] Firestore no disponible:', e.message);
    }
  },

  startForUser: function(uid, email) {
    // Llamado desde hideAuthScreen() tras verificación de rol exitosa
    if (!uid) return;
    this._userId = uid;
    if (this._db) {
      this.pullAll();
      logAction('Sistema', 'Datos sincronizados desde la nube', email || uid);
    }
    // R5c: verificar vencimientos al login y enviar recordatorio si hay urgentes
    setTimeout(function() { checkVencimientosReminder(email); }, 4000);
  },

  getRef: function(key) {
    if (!this._db || !this._userId) return null;
    return this._db.collection('ips').doc(this._userId).collection('data').doc(key);
  },

  push: function(key) {
    if (!this._online || !this._userId) return;
    var ref = this.getRef(key);
    if (!ref) return;
    var raw = localStorage.getItem(key);
    if (!raw) return;
    this.setSyncStatus('syncing');
    ref.set({ data: raw, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
      .then(function() { fsSync.setSyncStatus('synced'); })
      .catch(function(e) { fsSync.setSyncStatus('error'); console.warn('[fsSync] push error:', e); });
  },

  pull: function(key) {
    var ref = this.getRef(key);
    if (!ref) return Promise.resolve();
    return ref.get().then(function(doc) {
      if (doc.exists && doc.data().data) {
        localStorage.setItem(key, doc.data().data);
      }
    }).catch(function(e) { console.warn('[fsSync] pull error:', key, e); });
  },

  pullAll: function() {
    if (!this._userId) return;
    this.setSyncStatus('syncing');
    Promise.all(FS_KEYS.map(k => this.pull(k)))
      .then(function() { fsSync.setSyncStatus('synced'); })
      .catch(function() { fsSync.setSyncStatus('error'); });
  },

  setSyncStatus: function(status) {
    var dot = document.getElementById('sync-dot');
    var text = document.getElementById('sync-text');
    if (!dot || !text) return;
    var states = {
      synced:  { color: '#10b981', label: '☁️ Sincronizado' },
      syncing: { color: '#f59e0b', label: '⏳ Sincronizando...' },
      offline: { color: '#94a3b8', label: '📴 Sin conexión' },
      error:   { color: '#ef4444', label: '⚠️ Error de sync' }
    };
    var s = states[status] || states.synced;
    dot.style.background = s.color;
    text.textContent = s.label;
  }
};

// ── Patch save functions to also push to Firestore ──
(function patchSaves() {
  // Helper: after any localStorage.setItem, push to Firestore
  var origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    origSetItem(key, value);
    if (FS_KEYS.includes(key)) {
      setTimeout(function() { fsSync.push(key); }, 0);
    }
  };
})();

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() { fsSync.init(); }, 1500);
});

// XAI CONSULTOR NORMATIVO EXPLICABLE

function buildUserContext() {
  var hoy = new Date();
  hoy.setHours(0,0,0,0);
  var en30 = new Date(hoy); en30.setDate(en30.getDate()+30);
  var pqrs = JSON.parse(localStorage.getItem('normalis_pqrs')||'[]');
  var pqrsPend = pqrs.filter(function(p){return p.estado==='Pendiente';}).length;
  var pqrsTotal = pqrs.length;
  var incs = JSON.parse(localStorage.getItem('normalis_incidentes')||'[]');
  var incCriticos = incs.filter(function(i){return i.severidad==='critico'&&i.estado!=='Cerrado';});
  var incAbiertos = incs.filter(function(i){return i.estado==='Abierto';}).length;
  var docs = JSON.parse(localStorage.getItem('normalis_vencimientos')||'[]');
  var vencidos = docs.filter(function(d){return new Date(d.fecha)<hoy;});
  var proximos = docs.filter(function(d){var f=new Date(d.fecha);return f>=hoy&&f<=en30;});
  var simSaved = JSON.parse(localStorage.getItem('normalis_simulacro')||'{}');
  var simTotal = 27;
  var simChecked = Object.values(simSaved).filter(Boolean).length;
  var simPct = Math.round(simChecked/simTotal*100);
  var pamecFase = parseInt(localStorage.getItem('normalis_pamec_fase')||'1');
  var pamecProcs = JSON.parse(localStorage.getItem('normalis_pamec_procesos')||'[]');
  var pamecAcciones = JSON.parse(localStorage.getItem('normalis_pamec_acciones')||'[]');
  var logs = JSON.parse(localStorage.getItem('normalis_bitacora')||'[]');
  var ultimaActividad = logs.length > 0 ? new Date(logs[0].ts) : null;
  var diasSinActividad = ultimaActividad ? Math.round((new Date()-ultimaActividad)/(1000*60*60*24)) : null;
  var profesionales = JSON.parse(localStorage.getItem('th_profesionales')||'[]');
  return {
    pqrs: { total: pqrsTotal, pendientes: pqrsPend },
    incidentes: { criticos_abiertos: incCriticos.length, abiertos: incAbiertos, detalle: incCriticos.slice(0,3) },
    vencimientos: { vencidos: vencidos.length, proximos30: proximos.length, detalle_vencidos: vencidos.slice(0,3), detalle_proximos: proximos.slice(0,3) },
    simulacro: { pct: simPct, completados: simChecked, total: simTotal },
    pamec: { fase: pamecFase, procesos: pamecProcs.length, acciones: pamecAcciones.length },
    talento: { profesionales: profesionales.length },
    actividad: { dias_sin_actividad: diasSinActividad },
    resumen_riesgo: calcularRiesgoGlobal({ pqrsPend: pqrsPend, incCriticos: incCriticos.length, vencidos: vencidos.length, simPct: simPct, pamecFase: pamecFase })
  };
}

function calcularRiesgoGlobal(d) {
  var score = 100;
  if (d.incCriticos > 0) score -= d.incCriticos * 15;
  if (d.vencidos > 0) score -= d.vencidos * 10;
  if (d.pqrsPend > 3) score -= 10;
  if (d.simPct < 50) score -= 20;
  else if (d.simPct < 80) score -= 10;
  if (d.pamecFase < 2) score -= 10;
  score = Math.max(0, Math.min(100, score));
  var nivel = score >= 80 ? 'BAJO' : score >= 60 ? 'MEDIO' : score >= 40 ? 'ALTO' : 'CRITICO';
  return { score: score, nivel: nivel };
}

function xaiResponder(pregunta) {
  var ctx = buildUserContext();
  var q = pregunta.toLowerCase().trim();
  var resp = '';
  if (q.indexOf('visit')>=0 || q.indexOf('secret')>=0 || q.indexOf('habilitac')>=0 || q.indexOf('prepar')>=0 || q.indexOf('listo')>=0 || q.indexOf('lista')>=0) {
    var riesgo = ctx.resumen_riesgo;
    var problemas = [];
    var acciones = [];
    if (ctx.incidentes.criticos_abiertos > 0) {
      problemas.push('<li><b>' + ctx.incidentes.criticos_abiertos + ' evento(s) critico(s) abiertos</b></li>');
      acciones.push('<a href="#" onclick="nav(\x27incidentes\x27);return false" style="color:#ef4444;font-weight:600">Ir a Incidentes</a>');
    }
    if (ctx.vencimientos.vencidos > 0) {
      var nombres = ctx.vencimientos.detalle_vencidos.map(function(d){return d.profesional+' ('+d.tipo+')';}).join(', ');
      problemas.push('<li><b>' + ctx.vencimientos.vencidos + ' doc(s) VENCIDOS</b>: ' + nombres + '</li>');
      acciones.push('<a href="#" onclick="nav(\x27vencimientos-personal\x27);return false" style="color:#8b5cf6;font-weight:600">Actualizar docs</a>');
    }
    if (ctx.vencimientos.proximos30 > 0) {
      problemas.push('<li><b>' + ctx.vencimientos.proximos30 + ' doc(s) vencen en 30 dias</b></li>');
    }
    if (ctx.simulacro.pct < 80) {
      problemas.push('<li><b>Simulacro al ' + ctx.simulacro.pct + '%</b> (' + ctx.simulacro.completados + '/' + ctx.simulacro.total + ')</li>');
      acciones.push('<a href="#" onclick="nav(\x27simulacro\x27);return false" style="color:#f59e0b;font-weight:600">Completar simulacro</a>');
    }
    if (ctx.pqrs.pendientes > 3) {
      problemas.push('<li><b>' + ctx.pqrs.pendientes + ' PQRS pendientes</b></li>');
      acciones.push('<a href="#" onclick="nav(\x27pqrs\x27);return false" style="color:#6366f1;font-weight:600">Gestionar PQRS</a>');
    }
    if (ctx.pamec.fase < 2) {
      problemas.push('<li><b>PAMEC en fase inicial</b></li>');
      acciones.push('<a href="#" onclick="nav(\x27pamec\x27);return false" style="color:#10b981;font-weight:600">Avanzar PAMEC</a>');
    }
    var scoreColor = riesgo.score>=80?'#10b981':riesgo.score>=60?'#f59e0b':riesgo.score>=40?'#ef4444':'#7f1d1d';
    resp = '<div style="background:#f8fafc;border-radius:12px;padding:16px;margin:8px 0">';
    resp += '<div style="font-size:15px;font-weight:700;margin-bottom:12px">Preparacion: <span style="color:' + scoreColor + '">' + riesgo.score + '% - Riesgo ' + riesgo.nivel + '</span></div>';
    if (problemas.length === 0) {
      resp += '<p style="color:#10b981;font-weight:600">Sin riesgos criticos detectados. Estas listo para la visita.</p>';
    } else {
      resp += '<div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:6px">EVIDENCIA DE TUS DATOS</div>';
      resp += '<ul style="margin:0 0 10px;padding-left:18px;font-size:13px">' + problemas.join('') + '</ul>';
      resp += '<div style="font-size:11px;color:#64748b;margin-bottom:10px">Normativa: Res. 3100/2019 - Res. 465/2025 - Ley 1438/2011</div>';
      if (acciones.length > 0) {
        resp += '<div style="display:flex;flex-wrap:wrap;gap:8px;font-size:13px">' + acciones.join('') + '</div>';
      }
    }
    resp += '</div>';
  } else if (q.indexOf('pqrs')>=0 || q.indexOf('peticion')>=0 || q.indexOf('queja')>=0 || q.indexOf('reclamo')>=0) {
    resp = '<div style="background:#f8fafc;border-radius:12px;padding:16px;margin:8px 0"><b>Estado de PQRS</b><ul style="margin:8px 0;padding-left:18px;font-size:13px"><li>Total: <b>' + ctx.pqrs.total + '</b></li><li>Pendientes: <b style="color:' + (ctx.pqrs.pendientes>0?'#ef4444':'#10b981') + '">' + ctx.pqrs.pendientes + '</b></li></ul><div style="font-size:12px;color:#64748b">Res. 2063/2021: max 15 dias habiles.</div>' + (ctx.pqrs.pendientes>0?'<div style="margin-top:8px"><a href="#" onclick="nav(\x27pqrs\x27);return false" style="color:#6366f1;font-size:13px;font-weight:600">Gestionar PQRS pendientes</a></div>':'') + '</div>';
  } else if (q.indexOf('incident')>=0 || q.indexOf('evento')>=0 || q.indexOf('adverso')>=0) {
    resp = '<div style="background:#f8fafc;border-radius:12px;padding:16px;margin:8px 0"><b>Incidentes y Eventos Adversos</b><ul style="margin:8px 0;padding-left:18px;font-size:13px"><li>Abiertos: <b style="color:' + (ctx.incidentes.abiertos>0?'#ef4444':'#10b981') + '">' + ctx.incidentes.abiertos + '</b></li><li>Criticos: <b style="color:' + (ctx.incidentes.criticos_abiertos>0?'#ef4444':'#10b981') + '">' + ctx.incidentes.criticos_abiertos + '</b></li></ul><div style="font-size:12px;color:#64748b">Res. 256/2016 y 4816/2008: reporte en max 72h.</div>' + (ctx.incidentes.criticos_abiertos>0?'<div style="margin-top:8px"><a href="#" onclick="nav(\x27incidentes\x27);return false" style="color:#ef4444;font-size:13px;font-weight:600">Atender eventos criticos</a></div>':'') + '</div>';
  } else if (q.indexOf('vencim')>=0 || q.indexOf('tarjeta')>=0 || q.indexOf('certificad')>=0 || q.indexOf('licencia')>=0) {
    var nomV = ctx.vencimientos.detalle_vencidos.length>0?' ('+ctx.vencimientos.detalle_vencidos.map(function(d){return d.profesional;}).join(', ')+')':'';
    resp = '<div style="background:#f8fafc;border-radius:12px;padding:16px;margin:8px 0"><b>Documentos del Personal</b><ul style="margin:8px 0;padding-left:18px;font-size:13px"><li>Vencidos: <b style="color:' + (ctx.vencimientos.vencidos>0?'#ef4444':'#10b981') + '">' + ctx.vencimientos.vencidos + '</b>' + nomV + '</li><li>Por vencer 30d: <b style="color:' + (ctx.vencimientos.proximos30>0?'#f59e0b':'#10b981') + '">' + ctx.vencimientos.proximos30 + '</b></li><li>Profesionales: <b>' + ctx.talento.profesionales + '</b></li></ul><div style="font-size:12px;color:#64748b">Res. 3100/2019: tarjetas vigentes obligatorias.</div><div style="margin-top:8px"><a href="#" onclick="nav(\x27vencimientos-personal\x27);return false" style="color:#8b5cf6;font-size:13px;font-weight:600">Ver vencimientos</a></div></div>';
  } else if (q.indexOf('pamec')>=0 || q.indexOf('mejora')>=0 || q.indexOf('calidad')>=0) {
    resp = '<div style="background:#f8fafc;border-radius:12px;padding:16px;margin:8px 0"><b>Estado del PAMEC</b><ul style="margin:8px 0;padding-left:18px;font-size:13px"><li>Fase: <b>' + ctx.pamec.fase + ' de 4</b></li><li>Procesos: <b>' + ctx.pamec.procesos + '</b></li><li>Acciones: <b>' + ctx.pamec.acciones + '</b></li></ul><div style="font-size:12px;color:#64748b">Res. 256/2016 y Decreto 1011/2006: PAMEC obligatorio en SOGC.</div><div style="margin-top:8px"><a href="#" onclick="nav(\x27pamec\x27);return false" style="color:#10b981;font-size:13px;font-weight:600">Ir al PAMEC</a></div></div>';
  } else {
    var r2 = ctx.resumen_riesgo;
    var cR2 = r2.score>=80?'#10b981':r2.score>=60?'#f59e0b':r2.score>=40?'#ef4444':'#7f1d1d';
    resp = '<div style="background:#f8fafc;border-radius:12px;padding:16px;margin:8px 0"><div style="font-size:14px;font-weight:700;color:'+cR2+';margin-bottom:8px">Riesgo ' + r2.nivel + ' (' + r2.score + '/100)</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px"><div>PQRS pend: <b>' + ctx.pqrs.pendientes + '</b></div><div>Inc. criticos: <b>' + ctx.incidentes.criticos_abiertos + '</b></div><div>Docs vencidos: <b>' + ctx.vencimientos.vencidos + '</b></div><div>Vencen 30d: <b>' + ctx.vencimientos.proximos30 + '</b></div><div>Simulacro: <b>' + ctx.simulacro.pct + '%</b></div><div>PAMEC: <b>fase ' + ctx.pamec.fase + '</b></div></div><p style="font-size:12px;color:#64748b;margin:10px 0 0">Preguntame sobre: visita/habilitacion, PQRS, incidentes, vencimientos o PAMEC.</p></div>';
  }
  return resp;
}

// BUG #1 FIX: preservar sendMainChat de normalis-chat.js (Cloudflare Worker) si ya existe
var _prevSendMainChat = window.sendMainChat;

window.sendMainChat = function() {
  // Si normalis-chat.js ya definió sendMainChat (Worker Gemini), usarla
  if (typeof _prevSendMainChat === 'function') {
    return _prevSendMainChat();
  }
  // Fallback: xaiResponder local (sin conexión o sin Worker)
  var input = document.getElementById('main-chat-input');
  if (!input) return;
  var pregunta = input.value.trim();
  if (!pregunta) return;
  input.value = '';
  var msgs = document.getElementById('main-chat-msgs');
  if (!msgs) return;
  msgs.innerHTML += '<div style="display:flex;justify-content:flex-end;margin:8px 0"><div style="background:#6366f1;color:#fff;padding:10px 14px;border-radius:12px 12px 2px 12px;max-width:80%;font-size:13px">'+pregunta+'</div></div>';
  var tid = 'typing-' + Date.now();
  msgs.innerHTML += '<div id="'+tid+'" style="display:flex;align-items:center;gap:8px;margin:8px 0"><div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px">&#129302;</div><div style="background:#f1f5f9;padding:10px 14px;border-radius:12px;font-size:13px;color:#64748b">Analizando tus datos...</div></div>';
  msgs.scrollTop = msgs.scrollHeight;
  setTimeout(function() {
    var t = document.getElementById(tid);
    if (t) t.remove();
    var respuesta = xaiResponder(pregunta);
    var ts = new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
    msgs.innerHTML += '<div style="display:flex;align-items:flex-start;gap:8px;margin:8px 0"><div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px">&#129302;</div><div style="flex:1">'+respuesta+'<div style="font-size:10px;color:#94a3b8;margin-top:4px">XAI - datos reales - '+ts+'</div></div></div>';
    msgs.scrollTop = msgs.scrollHeight;
    if (typeof logAction === 'function') logAction('Sistema','Consulta XAI',pregunta.substring(0,60));
  }, 800);
};

window.sendChatQ = function(q) {
  var inp = document.getElementById('main-chat-input');
  if (inp) inp.value = q;
  window.sendMainChat();
};

// SUPERVISION — Error Tracking + Analytics + Dashboard

(function() {
  var MAX_ERRORS = 200;
  function saveError(err) {
    try {
      var errors = JSON.parse(localStorage.getItem('normalis_errores') || '[]');
      errors.unshift(err);
      if (errors.length > MAX_ERRORS) errors = errors.slice(0, MAX_ERRORS);
      localStorage.setItem('normalis_errores', JSON.stringify(errors));
    } catch(e) {}
  }
  window.onerror = function(msg, src, line, col, error) {
    var entry = {
      ts: new Date().toISOString(),
      tipo: 'JS_ERROR',
      mensaje: String(msg).substring(0, 200),
      archivo: (src || '').split('/').pop(),
      linea: line,
      columna: col,
      stack: error && error.stack ? error.stack.substring(0, 300) : ''
    };
    saveError(entry);
    return false;
  };
  window.addEventListener('unhandledrejection', function(e) {
    var entry = {
      ts: new Date().toISOString(),
      tipo: 'PROMISE_ERROR',
      mensaje: String(e.reason && e.reason.message ? e.reason.message : e.reason).substring(0, 200),
      archivo: '',
      linea: 0,
      columna: 0,
      stack: e.reason && e.reason.stack ? e.reason.stack.substring(0, 300) : ''
    };
    saveError(entry);
  });
})();

function trackEvent(categoria, accion, valor) {
  try {
    var analytics = JSON.parse(localStorage.getItem('normalis_analytics') || '[]');
    analytics.unshift({ ts: new Date().toISOString(), categoria: categoria, accion: accion, valor: valor || '' });
    if (analytics.length > 500) analytics = analytics.slice(0, 500);
    localStorage.setItem('normalis_analytics', JSON.stringify(analytics));
  } catch(e) {}
}

(function() {
  var _navSuperv = window.nav;
  window.nav = function(sec) {
    trackEvent('navegacion', 'modulo_visitado', sec);
    if (sec === 'supervision') { setTimeout(renderSupervision, 100); }
    if (typeof _navSuperv === 'function') _navSuperv(sec);
  };
})();

(function() {
  var _origChatSuperv = window.sendMainChat;
  window.sendMainChat = function() {
    var inp = document.getElementById('main-chat-input');
    if (inp && inp.value.trim()) trackEvent('xai', 'consulta', inp.value.trim().substring(0, 60));
    if (typeof _origChatSuperv === 'function') _origChatSuperv();
  };
})();

window.addEventListener('load', function() {
  try {
    var nav = window.performance && window.performance.timing;
    if (nav) { var lt = nav.loadEventEnd - nav.navigationStart; if (lt > 0) trackEvent('performance', 'page_load_ms', lt); }
  } catch(e) {}
});

function renderSupervision() {
  var errors = JSON.parse(localStorage.getItem('normalis_errores') || '[]');
  var analytics = JSON.parse(localStorage.getItem('normalis_analytics') || '[]');
  var navEvents = analytics.filter(function(e) { return e.categoria === 'navegacion'; });
  var xaiEvents = analytics.filter(function(e) { return e.categoria === 'xai'; });
  var perfEvents = analytics.filter(function(e) { return e.categoria === 'performance' && e.accion === 'page_load_ms'; });
  var moduleCounts = {};
  navEvents.forEach(function(e) { moduleCounts[e.valor] = (moduleCounts[e.valor] || 0) + 1; });
  var topModules = Object.entries(moduleCounts).sort(function(a,b){return b[1]-a[1];}).slice(0,6);
  var avgLoad = perfEvents.length > 0 ? Math.round(perfEvents.reduce(function(s,e){return s+parseInt(e.valor||0);},0)/perfEvents.length) : null;
  var fsStatus = 'Listo';
  try { var st = document.getElementById('sync-text'); if (st) fsStatus = st.textContent || 'Listo'; } catch(ex) {}
  var errorsHoy = errors.filter(function(e){return new Date(e.ts)>new Date(Date.now()-86400000);});
  var errColor = errorsHoy.length===0?'#10b981':errorsHoy.length<5?'#f59e0b':'#ef4444';
  var html = '<div style="padding:24px;max-width:960px;margin:0 auto">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px"><div><h2 style="margin:0;font-size:22px;font-weight:800">Supervision del Sistema</h2><p style="margin:4px 0 0;color:#64748b;font-size:13px">Monitoreo en tiempo real de NormaLis</p></div><button onclick="renderSupervision()" style="background:#6366f1;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">Actualizar</button></div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px">';
  html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px"><div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">Errores hoy</div><div style="font-size:28px;font-weight:800;color:'+errColor+'">'+errorsHoy.length+'</div><div style="font-size:11px;color:#94a3b8">Total: '+errors.length+'</div></div>';
  html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px"><div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">Consultas XAI</div><div style="font-size:28px;font-weight:800;color:#6366f1">'+xaiEvents.length+'</div><div style="font-size:11px;color:#94a3b8">en total</div></div>';
  html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px"><div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">Navegaciones</div><div style="font-size:28px;font-weight:800;color:#8b5cf6">'+navEvents.length+'</div><div style="font-size:11px;color:#94a3b8">cambios modulo</div></div>';
  html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px"><div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">Carga prom.</div><div style="font-size:28px;font-weight:800;color:'+(avgLoad&&avgLoad<3000?'#10b981':avgLoad&&avgLoad<6000?'#f59e0b':'#ef4444')+'">'+(avgLoad?avgLoad+'ms':'--')+'</div><div style="font-size:11px;color:#94a3b8">tiempo pagina</div></div>';
  html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px"><div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase">Firestore</div><div style="font-size:18px;font-weight:800;color:#10b981;margin-top:6px">'+fsStatus+'</div></div>';
  html += '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">';
  html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px"><div style="font-weight:700;font-size:15px;margin-bottom:16px">Modulos mas usados</div>';
  if (topModules.length===0) {
    html += '<p style="color:#94a3b8;font-size:13px">Sin datos. Navega por los modulos para generar estadisticas.</p>';
  } else {
    var maxC = topModules[0][1];
    topModules.forEach(function(m){
      var pct = Math.round(m[1]/maxC*100);
      html += '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span style="font-weight:600">'+m[0]+'</span><span style="color:#64748b">'+m[1]+'x</span></div><div style="background:#f1f5f9;border-radius:99px;height:6px"><div style="background:#6366f1;border-radius:99px;height:6px;width:'+pct+'%"></div></div></div>';
    });
  }
  html += '</div>';
  html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px"><div style="font-weight:700;font-size:15px;margin-bottom:16px">Ultimas consultas XAI</div>';
  if (xaiEvents.length===0) {
    html += '<p style="color:#94a3b8;font-size:13px">Sin consultas aun.</p>';
  } else {
    xaiEvents.slice(0,6).forEach(function(e){
      var t = new Date(e.ts).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
      html += '<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px"><span style="color:#94a3b8;font-size:11px">'+t+'</span> '+e.valor+'</div>';
    });
  }
  html += '</div></div>';
  html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><div style="font-weight:700;font-size:15px">Log de errores</div>';
  if (errors.length>0) html += '<button onclick="localStorage.removeItem(\x27normalis_errores\x27);renderSupervision();" style="background:#fee2e2;color:#ef4444;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">Limpiar</button>';
  html += '</div>';
  if (errors.length===0) {
    html += '<div style="text-align:center;padding:20px;color:#10b981;font-weight:600">Sin errores registrados</div>';
  } else {
    html += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f8fafc"><th style="padding:8px;text-align:left;color:#64748b">Hora</th><th style="padding:8px;text-align:left;color:#64748b">Tipo</th><th style="padding:8px;text-align:left;color:#64748b">Mensaje</th><th style="padding:8px;text-align:left;color:#64748b">Archivo</th><th style="padding:8px;text-align:left;color:#64748b">Linea</th></tr></thead><tbody>';
    errors.slice(0,20).forEach(function(e){
      var t = new Date(e.ts).toLocaleString('es-CO',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
      var tc = e.tipo==='JS_ERROR'?'#ef4444':'#f59e0b';
      html += '<tr style="border-top:1px solid #f1f5f9"><td style="padding:8px;color:#64748b;white-space:nowrap">'+t+'</td><td style="padding:8px"><span style="background:'+tc+'22;color:'+tc+';padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">'+e.tipo+'</span></td><td style="padding:8px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+e.mensaje+'</td><td style="padding:8px;color:#64748b">'+e.archivo+'</td><td style="padding:8px;color:#64748b">'+e.linea+'</td></tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</div></div>';
  var view = document.getElementById('view-supervision');
  if (view) view.innerHTML = html;
}

// ADOPCION — Onboarding Wizard + Demo Data + Aha Moment

function cargarDatosDemo() {
  var hoy = new Date();
  function addDias(d) { var f = new Date(hoy); f.setDate(f.getDate()+d); return f.toISOString().split('T')[0]; }
  var venc = [
    { id: 'v1', profesional: 'Dr. Carlos Mendoza', tipo: 'Tarjeta Profesional', fecha: addDias(-15), estado: 'Vencido' },
    { id: 'v2', profesional: 'Enf. Sandra Rios', tipo: 'Certificado ACLS', fecha: addDias(-5), estado: 'Vencido' },
    { id: 'v3', profesional: 'Dr. Luis Herrera', tipo: 'Tarjeta Profesional', fecha: addDias(12), estado: 'Vigente' },
    { id: 'v4', profesional: 'Aux. Martha Cano', tipo: 'Certificado Vacunas', fecha: addDias(25), estado: 'Vigente' }
  ];
  localStorage.setItem('normalis_vencimientos', JSON.stringify(venc));
  var incs = [
    { id: 'i1', fecha: addDias(-3), tipo: 'Caida de paciente', severidad: 'critico', estado: 'Abierto', descripcion: 'Paciente cayo de la camilla durante traslado', area: 'Urgencias' },
    { id: 'i2', fecha: addDias(-10), tipo: 'Error de medicacion', severidad: 'moderado', estado: 'En seguimiento', descripcion: 'Dosis incorrecta administrada, sin consecuencias graves', area: 'Hospitalizacion' }
  ];
  localStorage.setItem('normalis_incidentes', JSON.stringify(incs));
  var pqrs = [
    { id: 'p1', fecha: addDias(-8), tipo: 'Queja', descripcion: 'Tiempo de espera excesivo en consulta externa', estado: 'Pendiente', usuario: 'Anonimo' },
    { id: 'p2', fecha: addDias(-12), tipo: 'Peticion', descripcion: 'Solicitud de historia clinica', estado: 'Pendiente', usuario: 'Juan Garcia' },
    { id: 'p3', fecha: addDias(-20), tipo: 'Felicitacion', descripcion: 'Excelente atencion del personal de enfermeria', estado: 'Respondido', usuario: 'Maria Lopez' }
  ];
  localStorage.setItem('normalis_pqrs', JSON.stringify(pqrs));
  var simData = {};
  for (var i = 1; i <= 14; i++) simData['item_' + i] = true;
  localStorage.setItem('normalis_simulacro', JSON.stringify(simData));
  localStorage.setItem('normalis_pamec_fase', '1');
  var profs = [
    { id: 'pr1', nombre: 'Dr. Carlos Mendoza', cargo: 'Medico General', especialidad: 'Medicina General' },
    { id: 'pr2', nombre: 'Enf. Sandra Rios', cargo: 'Enfermera Jefe', especialidad: 'Enfermeria' },
    { id: 'pr3', nombre: 'Dr. Luis Herrera', cargo: 'Medico Especialista', especialidad: 'Cirugia General' },
    { id: 'pr4', nombre: 'Aux. Martha Cano', cargo: 'Auxiliar de Enfermeria', especialidad: '' }
  ];
  localStorage.setItem('th_profesionales', JSON.stringify(profs));
}

function iniciarAhaMoment(nombreIPS) {
  var modal = document.getElementById('onboarding-modal');
  if (modal) modal.style.display = 'none';
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);background:#6366f1;color:#fff;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:700;z-index:9999;box-shadow:0 8px 32px rgba(99,102,241,.4);transition:opacity .5s;white-space:nowrap';
  toast.textContent = 'Bienvenido a NormaLis, ' + nombreIPS + '! Generando tu diagnostico...';
  document.body.appendChild(toast);
  setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 500); }, 3500);
  // R4: ir directo a auditoría (flujo principal de valor)
  var tipoInput = document.getElementById('ob-tipo');
  var tipoServicio = tipoInput ? tipoInput.value : '';
  if (tipoServicio) localStorage.setItem('normalis_ob_tipo', tipoServicio);
  setTimeout(function() {
    try { nav('auditoria'); } catch(e) { try { nav('chat'); } catch(e2) {} }
    setTimeout(function() {
      // Mostrar tooltip de bienvenida en la sección de auditoría
      var cardTitle = document.querySelector('.card-title, [class*="card"] [style*="font-weight:800"]');
      if (!cardTitle) return;
    }, 500);
  }, 600);
  localStorage.setItem('normalis_onboarding_done', '1');
  localStorage.setItem('normalis_ips_nombre', nombreIPS);
  if (typeof trackEvent === 'function') trackEvent('onboarding', 'completado', nombreIPS);
}

function mostrarOnboarding() {
  if (localStorage.getItem('normalis_onboarding_done')) return;
  var html = '<div id="onboarding-modal" style="position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)">';
  html += '<div style="background:#fff;border-radius:20px;width:100%;max-width:500px;margin:16px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.3)">';
  html += '<div style="height:4px;background:#f1f5f9"><div id="ob-progress" style="height:4px;background:linear-gradient(90deg,#6366f1,#8b5cf6);width:25%;transition:width .4s"></div></div>';
  html += '<div id="ob-steps">';
  html += '<div id="ob-step-1" style="padding:40px">';
  html += '<div style="font-size:48px;text-align:center;margin-bottom:16px">&#127973;</div>';
  html += '<h2 style="text-align:center;font-size:22px;font-weight:800;margin:0 0 12px">Bienvenido a NormaLis</h2>';
  html += '<p style="text-align:center;color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.6">Tu copiloto de habilitacion para IPS colombianas.<br>En 2 minutos tendras tu primer diagnostico normativo.</p>';
  html += '<div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:24px;font-size:13px;color:#374151;display:flex;flex-direction:column;gap:8px"><div><b>Paso 1:</b> Datos basicos de tu IPS</div><div><b>Paso 2:</b> Cargar datos de ejemplo</div><div><b>Paso 3:</b> Tu primer diagnostico XAI</div></div>';
  html += '<button onclick="obNext(2)" style="width:100%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:14px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">Comenzar</button>';
  html += '</div>';
  html += '<div id="ob-step-2" style="padding:40px;display:none">';
  html += '<h2 style="font-size:20px;font-weight:800;margin:0 0 6px">Datos de tu IPS</h2>';
  html += '<p style="color:#64748b;font-size:13px;margin:0 0 20px">Solo lo esencial para personalizar tu experiencia.</p>';
  html += '<div style="display:flex;flex-direction:column;gap:14px">';
  html += '<div><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px">Nombre de la IPS *</label><input id="ob-nombre" type="text" placeholder="Ej: Clinica San Rafael" style="width:100%;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;outline:none"></div>';
  html += '<div><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px">Ciudad</label><input id="ob-ciudad" type="text" placeholder="Ej: Bogota" style="width:100%;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;outline:none"></div>';
  html += '<div><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px">Tipo de servicio</label><select id="ob-tipo" style="width:100%;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;background:#fff"><option value="">Seleccionar...</option><option>Consulta Externa</option><option>Urgencias</option><option>Hospitalizacion</option><option>Quirurgico</option><option>Laboratorio</option><option>Imagenes Diagnosticas</option><option>Salud Mental</option><option>Rehabilitacion</option><option>Odontologia</option></select></div>';
  html += '</div>';
  html += '<div style="display:flex;gap:12px;margin-top:24px">';
  html += '<button onclick="obNext(1)" style="flex:1;background:#f1f5f9;color:#374151;border:none;padding:14px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer">Atras</button>';
  html += '<button onclick="obValidarPaso2()" style="flex:2;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:14px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">Continuar</button>';
  html += '</div></div>';
  html += '<div id="ob-step-3" style="padding:40px;display:none">';
  html += '<div style="font-size:40px;text-align:center;margin-bottom:16px">&#128202;</div>';
  html += '<h2 style="font-size:20px;font-weight:800;margin:0 0 8px;text-align:center">Como quieres empezar?</h2>';
  html += '<p style="color:#64748b;font-size:13px;margin:0 0 20px;text-align:center">Te recomendamos datos de ejemplo para ver el potencial de inmediato.</p>';
  html += '<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px">';
  html += '<div id="ob-opt-demo" onclick="obSeleccionarOpcion(\x27demo\x27)" style="border:2px solid #6366f1;background:#eef2ff;border-radius:12px;padding:16px;cursor:pointer"><div style="font-weight:700;font-size:14px;color:#4338ca">Cargar datos de ejemplo (Recomendado)</div><div style="font-size:12px;color:#6366f1;margin-top:4px">Veras tu diagnostico en segundos. Puedes reemplazarlos con tus datos reales despues.</div></div>';
  html += '<div id="ob-opt-vacio" onclick="obSeleccionarOpcion(\x27vacio\x27)" style="border:2px solid #e2e8f0;border-radius:12px;padding:16px;cursor:pointer"><div style="font-weight:700;font-size:14px;color:#374151">Empezar desde cero</div><div style="font-size:12px;color:#64748b;margin-top:4px">Ingresar mis propios datos manualmente.</div></div>';
  html += '</div>';
  html += '<div style="display:flex;gap:12px">';
  html += '<button onclick="obNext(2)" style="flex:1;background:#f1f5f9;color:#374151;border:none;padding:14px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer">Atras</button>';
  html += '<button onclick="obFinalizar()" style="flex:2;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:14px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">Ver mi diagnostico</button>';
  html += '</div></div>';
  html += '<div id="ob-step-4" style="padding:48px;display:none;text-align:center">';
  html += '<div style="font-size:48px;margin-bottom:20px">&#129302;</div>';
  html += '<h2 style="font-size:20px;font-weight:800;margin:0 0 8px">Analizando tu IPS...</h2>';
  html += '<p style="color:#64748b;font-size:14px;margin:0 0 24px">El Consultor XAI esta preparando tu diagnostico normativo.</p>';
  html += '<div style="background:#f1f5f9;border-radius:99px;height:8px;overflow:hidden"><div id="ob-loader-bar" style="background:linear-gradient(90deg,#6366f1,#8b5cf6);height:8px;width:0%;transition:width 1.5s ease"></div></div>';
  html += '</div></div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  window._obOpcion = 'demo';
}

function obNext(step) {
  for (var i = 1; i <= 4; i++) {
    var el = document.getElementById('ob-step-' + i);
    if (el) el.style.display = i === step ? 'block' : 'none';
  }
  var pcts = {1:'25%',2:'50%',3:'75%',4:'100%'};
  var prog = document.getElementById('ob-progress');
  if (prog) prog.style.width = pcts[step] || '25%';
}

function obValidarPaso2() {
  var nombre = document.getElementById('ob-nombre');
  if (!nombre || !nombre.value.trim()) {
    if (nombre) { nombre.style.borderColor = '#ef4444'; nombre.focus(); }
    return;
  }
  obNext(3);
}

function obSeleccionarOpcion(opcion) {
  window._obOpcion = opcion;
  var demo = document.getElementById('ob-opt-demo');
  var vacio = document.getElementById('ob-opt-vacio');
  if (opcion === 'demo') {
    if (demo) { demo.style.borderColor = '#6366f1'; demo.style.background = '#eef2ff'; }
    if (vacio) { vacio.style.borderColor = '#e2e8f0'; vacio.style.background = '#fff'; }
  } else {
    if (vacio) { vacio.style.borderColor = '#6366f1'; vacio.style.background = '#eef2ff'; }
    if (demo) { demo.style.borderColor = '#e2e8f0'; demo.style.background = '#fff'; }
  }
}

function obFinalizar() {
  var nombreInput = document.getElementById('ob-nombre');
  var ciudadInput = document.getElementById('ob-ciudad');
  var nombre = (nombreInput && nombreInput.value.trim()) ? nombreInput.value.trim() : 'Mi IPS';
  var ciudad = ciudadInput ? ciudadInput.value.trim() : '';
  obNext(4);
  var bar = document.getElementById('ob-loader-bar');
  if (bar) setTimeout(function() { bar.style.width = '100%'; }, 100);
  if (window._obOpcion === 'demo') cargarDatosDemo();
  if (ciudad) localStorage.setItem('normalis_ips_ciudad', ciudad);
  setTimeout(function() { iniciarAhaMoment(nombre); }, 1500);
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(mostrarOnboarding, 900);
});

// ROI REESTRUCTURADO v2
function renderROI() {
  var SMLMV = 1300000;
  var html = '<div style="padding:24px;max-width:960px;margin:0 auto">';
  html += '<div style="margin-bottom:24px"><h2 style="margin:0 0 4px;font-size:22px;font-weight:800">Calculadora de ROI</h2><p style="margin:0;color:#64748b;font-size:13px">Cuanto cuesta NO tener NormaLis — basado en sanciones reales Ley 1438/2011 y Res. 3100/2019</p></div>';
  html += '<div id="roi-result-card" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:28px;color:#fff;margin-bottom:24px"><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px"><div><div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Costo anual del riesgo</div><div id="roi-costo-riesgo" style="font-size:28px;font-weight:800">$0</div><div style="font-size:11px;opacity:.7">sin NormaLis</div></div><div><div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Inversion NormaLis/ano</div><div id="roi-costo-normalis" style="font-size:28px;font-weight:800">$0</div><div style="font-size:11px;opacity:.7">suscripcion anual</div></div><div><div style="font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">ROI estimado</div><div id="roi-multiplier" style="font-size:36px;font-weight:900">0x</div><div style="font-size:11px;opacity:.7">retorno sobre inversion</div></div></div></div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">';
  html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px"><div style="font-weight:700;font-size:15px;margin-bottom:16px;color:#374151">Perfil de tu IPS</div>';
  html += '<div style="margin-bottom:16px"><label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:6px">Tipo de IPS</label><select id="roi-tipo-ips" onchange="calcROIv2()" style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;background:#fff"><option value="basica">Basica (Consulta Externa / Laboratorio)</option><option value="media" selected>Media (Urgencias / Hospitalizacion)</option><option value="alta">Alta complejidad (Quirurgico / UCI)</option></select></div>';
  html += '<div style="margin-bottom:16px"><label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">No. de sedes: <span id="roi-val-sedes" style="color:#6366f1;font-weight:700">1</span></label><input type="range" id="roi-sedes" min="1" max="10" value="1" oninput="document.getElementById(\x27roi-val-sedes\x27).textContent=this.value;calcROIv2()" style="width:100%"></div>';
  html += '<div style="margin-bottom:16px"><label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Profesionales: <span id="roi-val-prof" style="color:#6366f1;font-weight:700">8</span></label><input type="range" id="roi-prof" min="2" max="50" value="8" oninput="document.getElementById(\x27roi-val-prof\x27).textContent=this.value;calcROIv2()" style="width:100%"></div>';
  html += '<div><label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Horas/mes gestion normativa: <span id="roi-val-horas" style="color:#6366f1;font-weight:700">20</span>h</label><input type="range" id="roi-horas" min="4" max="80" value="20" oninput="document.getElementById(\x27roi-val-horas\x27).textContent=this.value;calcROIv2()" style="width:100%"></div></div>';
  html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px"><div style="font-weight:700;font-size:15px;margin-bottom:16px;color:#374151">Nivel de riesgo actual</div>';
  html += '<div style="margin-bottom:16px"><label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Prob. NC critica en proxima visita: <span id="roi-val-prob" style="color:#ef4444;font-weight:700">40</span>%</label><input type="range" id="roi-prob" min="5" max="95" value="40" oninput="document.getElementById(\x27roi-val-prob\x27).textContent=this.value;calcROIv2()" style="width:100%"><div style="font-size:11px;color:#94a3b8;margin-top:4px">IPS sin sistema de gestion: 60-80% historico Supersalud</div></div>';
  html += '<div style="margin-bottom:16px"><label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">NC criticas esperadas: <span id="roi-val-nc-crit" style="color:#ef4444;font-weight:700">3</span></label><input type="range" id="roi-nc-crit" min="0" max="15" value="3" oninput="document.getElementById(\x27roi-val-nc-crit\x27).textContent=this.value;calcROIv2()" style="width:100%"><div style="font-size:11px;color:#94a3b8;margin-top:4px">Multa: 100-500 SMLMV c/u (Ley 1438/2011 Art.131)</div></div>';
  html += '<div style="margin-bottom:16px"><label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">NC leves esperadas: <span id="roi-val-nc-leve" style="color:#f59e0b;font-weight:700">5</span></label><input type="range" id="roi-nc-leve" min="0" max="20" value="5" oninput="document.getElementById(\x27roi-val-nc-leve\x27).textContent=this.value;calcROIv2()" style="width:100%"><div style="font-size:11px;color:#94a3b8;margin-top:4px">Multa: 10-100 SMLMV c/u</div></div>';
  html += '<div><label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">Dias suspension si falla habilitacion: <span id="roi-val-susp" style="color:#ef4444;font-weight:700">30</span>d</label><input type="range" id="roi-susp" min="0" max="180" value="30" oninput="document.getElementById(\x27roi-val-susp\x27).textContent=this.value;calcROIv2()" style="width:100%"><div style="font-size:11px;color:#94a3b8;margin-top:4px">Ingreso diario IPS mediana: $3-8M COP</div></div></div>';
  html += '</div>';
  html += '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px"><div style="font-weight:700;font-size:15px;margin-bottom:16px">Desglose del calculo</div><div id="roi-breakdown-v2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px"></div></div>';
  html += '<div id="roi-narrativa" style="background:#f8fafc;border-left:4px solid #6366f1;border-radius:0 12px 12px 0;padding:16px;margin-bottom:16px;font-size:13px;line-height:1.7;color:#374151"></div>';
  html += '<div style="text-align:right"><button onclick="exportarROIPDF()" style="background:#6366f1;color:#fff;border:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Exportar reporte ROI</button></div>';
  html += '</div>';
  var view = document.getElementById('view-roi');
  if (view) { view.innerHTML = html; calcROIv2(); }
}

function fmtCOP(n) {
  return '$' + Math.round(n).toLocaleString('es-CO') + ' COP';
}

function calcROIv2() {
  var SMLMV = 1300000;
  var tipoEl = document.getElementById('roi-tipo-ips');
  var tipo = tipoEl ? tipoEl.value : 'media';
  var sedes = parseInt((document.getElementById('roi-sedes')||{value:1}).value);
  var prof = parseInt((document.getElementById('roi-prof')||{value:8}).value);
  var horas = parseInt((document.getElementById('roi-horas')||{value:20}).value);
  var prob = parseInt((document.getElementById('roi-prob')||{value:40}).value) / 100;
  var ncCrit = parseInt((document.getElementById('roi-nc-crit')||{value:3}).value);
  var ncLeve = parseInt((document.getElementById('roi-nc-leve')||{value:5}).value);
  var diasSusp = parseInt((document.getElementById('roi-susp')||{value:30}).value);
  var multaCritPorNC = 200 * SMLMV;
  var multaLevePorNC = 30 * SMLMV;
  var ingresoDiario = (tipo==='basica'?2000000:tipo==='media'?5000000:12000000) * sedes;
  var costoHoraAdmin = 35000;
  var costoMultasCrit = ncCrit * multaCritPorNC * prob;
  var costoMultasLeve = ncLeve * multaLevePorNC * prob;
  var costoSuspension = diasSusp * ingresoDiario * prob;
  var costoConsultorEmerg = prob > 0.3 ? 8000000 : 0;
  var costoHorasAdmin = horas * 12 * costoHoraAdmin;
  var costoReputacion = prob > 0.5 ? ingresoDiario * 15 : 0;
  var totalRiesgo = costoMultasCrit + costoMultasLeve + costoSuspension + costoConsultorEmerg + costoHorasAdmin + costoReputacion;
  var precioMensual = (tipo==='basica'?190000:tipo==='media'?290000:490000) * sedes;
  var costoNormalis = precioMensual * 12;
  var ahorroHoras = horas * 0.7 * 12 * costoHoraAdmin;
  var beneficioNeto = totalRiesgo + ahorroHoras - costoNormalis;
  var roi = costoNormalis > 0 ? beneficioNeto / costoNormalis : 0;
  var el = function(id){return document.getElementById(id);};
  if (el('roi-costo-riesgo')) el('roi-costo-riesgo').textContent = fmtCOP(totalRiesgo);
  if (el('roi-costo-normalis')) el('roi-costo-normalis').textContent = fmtCOP(costoNormalis);
  if (el('roi-multiplier')) el('roi-multiplier').textContent = roi>=1?Math.round(roi)+'x':(roi*100).toFixed(0)+'%';
  var bd = el('roi-breakdown-v2');
  if (bd) {
    var rows = [
      ['Multas NC criticas (ponderadas x prob.)', costoMultasCrit, '#ef4444'],
      ['Multas NC leves (ponderadas x prob.)', costoMultasLeve, '#f59e0b'],
      ['Lucro cesante por suspension', costoSuspension, '#ef4444'],
      ['Consultor emergencia pre-visita', costoConsultorEmerg, '#8b5cf6'],
      ['Costo horas admin gestion manual/ano', costoHorasAdmin, '#64748b'],
      ['Impacto reputacional', costoReputacion, '#ec4899'],
      ['---', null, null],
      ['Costo NormaLis anual', costoNormalis, '#6366f1'],
      ['Ahorro horas admin (70% reduccion)', ahorroHoras, '#10b981'],
      ['BENEFICIO NETO ANUAL', beneficioNeto, beneficioNeto>=0?'#10b981':'#ef4444']
    ];
    bd.innerHTML = rows.map(function(r){
      if (!r[0]||r[0]==='---') return '<div style="grid-column:1/-1;border-top:1px solid #e2e8f0;margin:4px 0"></div>';
      var isTotal = r[0].indexOf('BENEFICIO')>=0;
      return '<div style="color:#64748b'+(isTotal?';font-weight:700;color:#374151':'')+'">'+r[0]+'</div>'+
             '<div style="text-align:right;font-weight:700;color:'+r[2]+'">'+fmtCOP(Math.abs(r[1]))+'</div>';
    }).join('');
  }
  var narr = el('roi-narrativa');
  if (narr) {
    var nivelColor = prob<0.3?'#10b981':prob<0.6?'#f59e0b':'#ef4444';
    var nivelTxt = prob<0.3?'BAJO':prob<0.6?'MODERADO':'ALTO';
    var t = '<b style="color:'+nivelColor+'">Riesgo '+nivelTxt+':</b> Con '+Math.round(prob*100)+'% de probabilidad de NC en la proxima visita, ';
    t += 'tu IPS enfrenta <b>'+fmtCOP(totalRiesgo)+' anuales</b> en riesgos combinados. ';
    if (ncCrit>0) t += 'Las '+ncCrit+' NC criticas pueden generar multas de hasta <b>'+fmtCOP(ncCrit*500*SMLMV)+'</b> (500 SMLMV c/u, Art.131 Ley 1438/2011). ';
    if (diasSusp>0) t += 'Una suspension de '+diasSusp+' dias representa <b>'+fmtCOP(diasSusp*ingresoDiario)+'</b> en lucro cesante. ';
    t += '<br><br>NormaLis cuesta <b>'+fmtCOP(costoNormalis)+' al ano</b> y reduce 70% del tiempo de gestion manual (<b>'+fmtCOP(ahorroHoras)+' ahorrados</b>). ';
    if (roi>=1) t += '<br><br><b style="color:#10b981">ROI: '+Math.round(roi)+'x</b> — por cada peso invertido en NormaLis, recuperas '+Math.round(roi)+' pesos en riesgos evitados y eficiencia ganada.';
    narr.innerHTML = t;
  }
  try { localStorage.setItem('normalis_roi_data', JSON.stringify({fecha:new Date().toISOString(),tipo:tipo,roi:Math.round(roi),costoRiesgo:totalRiesgo,costoNormalis:costoNormalis,beneficioNeto:beneficioNeto})); } catch(e) {}
}

function exportarROIPDF() {
  var d = JSON.parse(localStorage.getItem('normalis_roi_data')||'{}');
  var c = 'REPORTE ROI NORMALIS\n\nFecha: '+new Date().toLocaleDateString('es-CO')+'\nIPS: '+(localStorage.getItem('normalis_ips_nombre')||'Mi IPS')+'\n\nCosto riesgo anual: '+fmtCOP(d.costoRiesgo||0)+'\nInversion NormaLis: '+fmtCOP(d.costoNormalis||0)+'\nBeneficio neto: '+fmtCOP(d.beneficioNeto||0)+'\nROI: '+(d.roi||0)+'x\n\nNormativa:\n- Ley 1438/2011 Art.131: sanciones 10-2000 SMLMV\n- Res. 3100/2019: condiciones habilitacion\n- Decreto 1011/2006: SOGC y PAMEC';
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c],{type:'text/plain;charset=utf-8'}));
  a.download = 'ROI_NormaLis_'+new Date().toISOString().split('T')[0]+'.txt'; a.click();
}

// Hook renderROI into nav
(function(){
  var _navROI = window.nav;
  window.nav = function(sec){
    if (typeof _navROI === 'function') _navROI(sec);
    if (sec === 'roi') setTimeout(renderROI, 100);
  };
})();



// ══════════════════════════════════════════
// R5c — RECORDATORIO VENCIMIENTOS AL LOGIN
// ══════════════════════════════════════════
function checkVencimientosReminder(userEmail) {
  var lastKey = 'normalis_ultimo_recordatorio';
  var lastTs  = parseInt(localStorage.getItem(lastKey) || '0');
  var now     = Date.now();
  if ((now - lastTs) < 86400000) return; // solo una vez por 24h

  var hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
  var en30  = new Date(hoy); en30.setDate(en30.getDate() + 30);
  var docs  = JSON.parse(localStorage.getItem('normalis_vencimientos') || '[]');
  var venc  = docs.filter(function(d) { return new Date(d.fecha) < hoy; });
  var prox  = docs.filter(function(d) { var f = new Date(d.fecha); return f >= hoy && f <= en30; });
  if (venc.length === 0 && prox.length === 0) return;

  var email  = userEmail || sessionStorage.getItem('normalis_email') || '';
  var nombre = localStorage.getItem('normalis_ips_nombre') || 'IPS';
  if (!email || typeof emailjs === 'undefined') return;

  var resumen = [];
  if (venc.length > 0) resumen.push(venc.length + ' documento(s) VENCIDO(S)');
  if (prox.length > 0) resumen.push(prox.length + ' vence(n) en 30 días');

  emailjs.send('normalis_service', 'vencimientos_alerta', {
    to_email:    email,
    ips_nombre:  nombre,
    resumen:     resumen.join(' · '),
    vencidos:    venc.length,
    proximos:    prox.length,
    detalle:     venc.concat(prox).slice(0, 5).map(function(d) {
      return (d.profesional || d.tipo || '—') + ' (' + (d.tipo || '') + ') → ' + d.fecha;
    }).join('
'),
    app_url:     'https://normalis.co/normativa-app-v2.html'
  }).then(function() {
    localStorage.setItem(lastKey, now.toString());
  }).catch(function(e) {
    console.warn('[NormaLis] Recordatorio vencimientos:', e);
  });
}

// END:normalis-firestore.js — NormaLis integrity seal
