// normalis-bitacora.js
// NormaLis — Gobernanza — bitácora de auditoría interna
// Almacenamiento: Firestore usuarios/{uid}/bitacora/{id} (primario) + localStorage (caché offline)
// logAction() es sincrónico (UI no se bloquea) — Firestore se escribe en background (fire-and-forget)
// ─────────────────────────────────────────────

(function () {
  'use strict';

  // ── Estado ───────────────────────────────────────────────────────────────────
  let _bitCache   = [];       // en memoria — source of truth para render
  let _unsubBit   = null;     // Firestore onSnapshot unsub
  let _bitUid     = null;     // uid activo
  let BIT_PAGE    = 0;
  const BIT_PAGE_SIZE = 20;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function _uid()   { return sessionStorage.getItem('normalis_uid'); }
  function _email() { return sessionStorage.getItem('normalis_email'); }
  function _currentUser() {
    try {
      if (window.firebase && firebase.auth().currentUser) {
        return firebase.auth().currentUser.displayName ||
               firebase.auth().currentUser.email || 'Usuario';
      }
    } catch (_) {}
    return _email() || 'Usuario';
  }

  function _dbRef(uid) {
    if (typeof db === 'undefined' || !uid) return null;
    return db.collection('usuarios').doc(uid).collection('bitacora');
  }

  function _saveCache(list) {
    try { localStorage.setItem('normalis_bitacora_cache', JSON.stringify(list.slice(0, 500))); } catch (_) {}
  }
  function _loadCache() {
    // Primero intentar caché de Firestore, luego legado
    try {
      const c = localStorage.getItem('normalis_bitacora_cache');
      if (c) return JSON.parse(c);
    } catch (_) {}
    try {
      const l = localStorage.getItem('normalis_bitacora');
      if (l) return JSON.parse(l);
    } catch (_) {}
    return [];
  }

  // ── Migración localStorage → Firestore ───────────────────────────────────────
  async function _migrate(uid) {
    const KEY = 'normalis_bitacora';
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    let legacy = [];
    try { legacy = JSON.parse(raw); } catch (_) { return; }
    if (!legacy.length) return;

    const ref = _dbRef(uid);
    if (!ref) return;

    console.log('[Bitácora] Migrando', legacy.length, 'registros a Firestore…');
    // Migrar en lotes de 100 (límite Firestore batch es 500)
    const BATCH_SIZE = 100;
    let migrated = 0;

    for (let i = 0; i < legacy.length && i < 1000; i += BATCH_SIZE) {
      const chunk = legacy.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      chunk.forEach(log => {
        const docRef = ref.doc(String(log.ts || Date.now()).replace(/[^a-zA-Z0-9]/g, '_') + '_' + Math.random().toString(36).slice(2, 7));
        batch.set(docRef, {
          uid,
          ts     : log.ts   || new Date().toISOString(),
          usuario: log.usuario || 'Usuario',
          modulo : log.modulo  || 'Sistema',
          accion : log.accion  || '',
          detalle: log.detalle || '',
          migrated: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
      try {
        await batch.commit();
        migrated += chunk.length;
      } catch (e) {
        console.warn('[Bitácora] Error en migración batch:', e);
        break;
      }
    }

    if (migrated > 0) {
      localStorage.removeItem(KEY);
      console.log('[Bitácora] Migrados', migrated, 'registros → Firestore');
    }
  }

  // ── onSnapshot ───────────────────────────────────────────────────────────────
  function _subscribe(uid) {
    if (_unsubBit) { _unsubBit(); _unsubBit = null; }
    const ref = _dbRef(uid);
    if (!ref) return;

    _unsubBit = ref
      .orderBy('createdAt', 'desc')
      .limit(500)
      .onSnapshot(
        snap => {
          _bitCache = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
          _saveCache(_bitCache);
          if (document.getElementById('bit-tbody')) _renderBitacora();
        },
        err => {
          console.warn('[Bitácora] onSnapshot error:', err);
          _bitCache = _loadCache();
          if (document.getElementById('bit-tbody')) _renderBitacora();
        }
      );
  }

  // ── logAction — SÍNCRONO + fire-and-forget a Firestore ───────────────────────
  function logAction(modulo, accion, detalle) {
    const ts      = new Date().toISOString();
    const usuario = _currentUser();
    const entry   = { ts, usuario, modulo, accion: accion || '', detalle: detalle || '' };

    // 1. Actualizar caché en memoria inmediatamente
    _bitCache.unshift(entry);
    if (_bitCache.length > 1000) _bitCache = _bitCache.slice(0, 1000);
    _saveCache(_bitCache);

    // 2. Firestore en background (fire-and-forget — no bloquea UI)
    const uid = _uid();
    const ref = _dbRef(uid);
    if (ref) {
      ref.add({
        uid,
        ts,
        usuario,
        modulo,
        accion : accion  || '',
        detalle: detalle || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }).catch(e => console.warn('[Bitácora] Error escribiendo Firestore:', e));
    }
  }

  // ── Inicializar ───────────────────────────────────────────────────────────────
  async function initBitacora() {
    const uid = _uid();
    if (!uid) return;
    if (_bitUid === uid && _unsubBit) return;

    _bitUid = uid;

    // Render rápido desde caché
    _bitCache = _loadCache();
    if (document.getElementById('bit-tbody')) _renderBitacora();

    // Migrar datos legacy
    if (localStorage.getItem('normalis_bitacora')) {
      await _migrate(uid).catch(console.warn);
    }

    // Suscribir
    _subscribe(uid);
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const MOD_COLORS = {
    'PQRS'            : '#6366f1',
    'Incidentes'      : '#ef4444',
    'Vencimientos'    : '#8b5cf6',
    'PAMEC'           : '#10b981',
    'Talento'         : '#3b82f6',
    'Documentos'      : '#f59e0b',
    'Consentimientos' : '#06b6d4',
    'Firma'           : '#84cc16',
    'Simulacro'       : '#f97316',
    'Sistema'         : '#64748b',
    'Cross-walk'      : '#0ea5e9',
    'SG-SST'          : '#14b8a6',
  };

  function _renderBitacora() {
    const logs   = _bitCache;
    const search  = (document.getElementById('bit-search')?.value   || '').toLowerCase();
    const modFil  = document.getElementById('bit-modulo')?.value    || '';
    const fechaFil = document.getElementById('bit-fecha')?.value    || '';

    const filtered = logs.filter(l => {
      const matchSearch = !search  || (l.usuario || '').toLowerCase().includes(search) ||
                          (l.accion || '').toLowerCase().includes(search) ||
                          (l.detalle || '').toLowerCase().includes(search);
      const matchMod    = !modFil  || l.modulo === modFil;
      const matchFecha  = !fechaFil || (l.ts || '').startsWith(fechaFil);
      return matchSearch && matchMod && matchFecha;
    });

    // KPIs
    const hoy      = new Date().toISOString().substring(0, 10);
    const semStart = new Date(); semStart.setDate(semStart.getDate() - 7);
    const setKPI   = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setKPI('bit-total',    logs.length);
    setKPI('bit-hoy',      logs.filter(l => (l.ts || '').startsWith(hoy)).length);
    setKPI('bit-semana',   logs.filter(l => new Date(l.ts || 0) >= semStart).length);
    setKPI('bit-usuarios', [...new Set(logs.map(l => l.usuario))].length);

    const tbody      = document.getElementById('bit-tbody');
    const empty      = document.getElementById('bit-empty');
    const pagination = document.getElementById('bit-pagination');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (empty)      empty.style.display = 'block';
      if (pagination) pagination.innerHTML = '';
      return;
    }
    if (empty) empty.style.display = 'none';

    const start = BIT_PAGE * BIT_PAGE_SIZE;
    const page  = filtered.slice(start, start + BIT_PAGE_SIZE);

    tbody.innerHTML = page.map(l => {
      const d     = new Date(l.ts || Date.now());
      const fecha = d.toLocaleDateString('es-CO') + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      const color = MOD_COLORS[l.modulo] || '#64748b';
      return `<tr style="border-bottom:1px solid #f1f5f9;transition:background 0.15s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <td style="padding:12px 16px;font-size:12px;color:#64748b;white-space:nowrap">${fecha}</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#1e293b">${_esc(l.usuario)}</td>
        <td style="padding:12px 16px"><span style="background:${color}15;color:${color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${_esc(l.modulo)}</span></td>
        <td style="padding:12px 16px;font-size:13px;color:#374151">${_esc(l.accion)}</td>
        <td style="padding:12px 16px;font-size:12px;color:#64748b">${_esc(l.detalle)}</td>
      </tr>`;
    }).join('');

    if (pagination) {
      const total = filtered.length;
      const pages = Math.ceil(total / BIT_PAGE_SIZE);
      pagination.innerHTML = `<span>${start + 1}–${Math.min(start + BIT_PAGE_SIZE, total)} de ${total} registros</span>
        <div style="display:flex;gap:6px">
          ${BIT_PAGE > 0          ? '<button onclick="bitPage(-1)" style="padding:4px 12px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:#fff">← Anterior</button>' : ''}
          ${BIT_PAGE < pages - 1  ? '<button onclick="bitPage(1)"  style="padding:4px 12px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:#fff">Siguiente →</button>' : ''}
        </div>`;
    }
  }

  // ── Controles UI ──────────────────────────────────────────────────────────────
  function renderBitacora() {
    BIT_PAGE = 0;
    if (!_unsubBit && _uid()) {
      initBitacora();
    } else {
      _renderBitacora();
    }
  }

  function bitPage(dir) {
    BIT_PAGE += dir;
    _renderBitacora();
  }

  function clearBitacoraFilters() {
    const el = id => document.getElementById(id);
    if (el('bit-search')) el('bit-search').value = '';
    if (el('bit-modulo')) el('bit-modulo').value = '';
    if (el('bit-fecha'))  el('bit-fecha').value  = '';
    BIT_PAGE = 0;
    _renderBitacora();
  }

  // ── Exportar CSV ──────────────────────────────────────────────────────────────
  function exportBitacoraCSV() {
    const logs = _bitCache;
    let csv = 'Fecha,Usuario,Módulo,Acción,Detalle\n';
    logs.forEach(l => {
      const d = new Date(l.ts || Date.now()).toLocaleString('es-CO');
      csv += [d, l.usuario, l.modulo, l.accion, l.detalle]
        .map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bitacora-normalis-' + new Date().toISOString().substring(0, 10) + '.csv';
    link.click();
    logAction('Sistema', 'Exportó bitácora CSV', logs.length + ' registros');
  }

  // ── Exportar PDF ──────────────────────────────────────────────────────────────
  function exportBitacoraPDF() {
    const logs = _bitCache.slice(0, 100);
    const w = window.open('', '_blank');
    w.document.write('<html><head><title>Bitácora de Gobernanza — NormaLis</title>');
    w.document.write('<style>body{font-family:Arial,sans-serif;padding:30px;font-size:12px}h1{color:#6366f1;margin-bottom:4px}p{color:#64748b;margin-top:0}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f8fafc;padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;font-size:11px;color:#64748b}td{padding:8px;border-bottom:1px solid #f1f5f9;font-size:11px}tr:hover td{background:#f8fafc}</style></head><body>');
    w.document.write('<h1>📋 Bitácora de Gobernanza</h1>');
    w.document.write('<p>NormaLis · Generado: ' + new Date().toLocaleString('es-CO') + ' · Últimos ' + _esc(String(logs.length)) + ' registros</p>');
    w.document.write('<table><tr><th>Fecha y Hora</th><th>Usuario</th><th>Módulo</th><th>Acción</th><th>Detalle</th></tr>');
    logs.forEach(l => {
      w.document.write('<tr><td>' + _esc(new Date(l.ts || Date.now()).toLocaleString('es-CO')) + '</td><td>' +
        _esc(l.usuario) + '</td><td>' + _esc(l.modulo) + '</td><td>' + _esc(l.accion) + '</td><td>' + _esc(l.detalle) + '</td></tr>');
    });
    w.document.write('</table></body></html>');
    w.print();
    logAction('Sistema', 'Exportó bitácora PDF', logs.length + ' registros');
  }

  // ── Patches sobre funciones de otros módulos ──────────────────────────────────
  // NOTA: savePQRS, saveIncidente y saveVenc ya llaman logAction() internamente
  // en sus versiones actualizadas. Solo parchamos módulos que no tienen logAction propio.

  // PAMEC
  const _origPamecAutoeval = window.pamecGuardarAutoeval;
  window.pamecGuardarAutoeval = function () {
    if (_origPamecAutoeval) _origPamecAutoeval();
    logAction('PAMEC', 'Guardó autoevaluación PAMEC', 'Fase de autoevaluación actualizada');
  };
  const _origPamecProceso = window.pamecGuardarProceso;
  window.pamecGuardarProceso = function () {
    if (_origPamecProceso) _origPamecProceso();
    logAction('PAMEC', 'Guardó proceso de mejora', 'Proceso registrado en plan de mejoramiento');
  };
  const _origPamecAccion = window.pamecGuardarAccion;
  window.pamecGuardarAccion = function () {
    if (_origPamecAccion) _origPamecAccion();
    logAction('PAMEC', 'Guardó acción de mejora', 'Acción registrada en plan de mejoramiento');
  };

  // Firma digital
  const _origFirmar = window.firmarDoc;
  window.firmarDoc = function () {
    if (_origFirmar) _origFirmar();
    logAction('Firma', 'Firmó documento digitalmente', 'Documento firmado y versionado');
  };

  // Consentimientos
  const _origSignCon = window.signCon;
  window.signCon = function () {
    if (_origSignCon) _origSignCon();
    logAction('Consentimientos', 'Firmó consentimiento informado', 'Consentimiento completado');
  };

  // Talento humano
  const _origSaveProf = window.saveNewProfesional;
  window.saveNewProfesional = function () {
    const nombre = document.getElementById('prof-nombre')?.value || document.getElementById('new-prof-nombre')?.value || '';
    if (_origSaveProf) _origSaveProf();
    logAction('Talento', 'Agregó profesional', nombre);
  };

  // ── Log de inicio de sesión ───────────────────────────────────────────────────
  (function () {
    try {
      if (window.firebase) {
        firebase.auth().onAuthStateChanged(function (user) {
          if (user) {
            logAction('Sistema', 'Inicio de sesión', user.email || user.displayName || 'Usuario');
            initBitacora(); // Iniciar suscripción cuando hay usuario autenticado
          }
        });
      }
    } catch (e) {}
  })();

  // ── Patch nav para inicializar al navegar ─────────────────────────────────────
  const _prevNavBit = window.nav;
  window.nav = function (sec) {
    if (typeof _prevNavBit === 'function') _prevNavBit(sec);
    if (sec === 'bitacora') {
      BIT_PAGE = 0;
      setTimeout(() => {
        if (!_unsubBit && _uid()) initBitacora();
        else _renderBitacora();
      }, 100);
    }
  };

  // ── Exponer al scope global ───────────────────────────────────────────────────
  window.logAction          = logAction;
  window.renderBitacora     = renderBitacora;
  window.bitPage            = bitPage;
  window.clearBitacoraFilters = clearBitacoraFilters;
  window.exportBitacoraCSV  = exportBitacoraCSV;
  window.exportBitacoraPDF  = exportBitacoraPDF;
  window.initBitacora       = initBitacora;

  // Auto-init si ya hay uid
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { if (_uid()) initBitacora(); });
  } else {
    if (_uid()) initBitacora();
  }

})();

// END:normalis-bitacora.js — NormaLis integrity seal
