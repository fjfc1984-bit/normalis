// normalis-vencimientos.js
// NormaLis — Módulo de control de vencimientos del personal (RETHUS, tarjetas, certificados)
// Almacenamiento: Firestore vencimientos/{id} (primario) + localStorage (caché offline)
// Seguridad: vencimientos/{id} — filtrado por uid y nit (firestore.rules)
// ─────────────────────────────────────────────
(function () {
  'use strict';

  // ── Estado del módulo ────────────────────────────────────────────────────────
  let _vencCache  = [];       // caché en memoria (source of truth para render)
  let _unsubVenc  = null;     // Firestore onSnapshot unsub
  let _vencUid    = null;     // uid activo

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const _esc = function (s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  const _uid       = () => sessionStorage.getItem('normalis_uid');
  const _email     = () => sessionStorage.getItem('normalis_email');
  const _ipsNombre = () => localStorage.getItem('normalis_ips_nombre') || '';
  const _nit       = () => {
    try { return JSON.parse(localStorage.getItem('normalis_cfg') || '{}').nit || ''; } catch (_) { return ''; }
  };

  function _saveCache(list) {
    try { localStorage.setItem('normalis_vencimientos_cache', JSON.stringify(list)); } catch (_) {}
  }
  function _loadCache() {
    try { return JSON.parse(localStorage.getItem('normalis_vencimientos_cache') || '[]'); } catch (_) { return []; }
  }

  // ── Sincronizar pendientes offline → Firestore ────────────────────────────────
  // Si el usuario creó vencimientos sin conexión (solo en localStorage legacy),
  // se suben a Firestore en cuanto hay red.
  async function _syncOfflinePending(uid) {
    const KEY = 'normalis_vencimientos';
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    let legacy = [];
    try { legacy = JSON.parse(raw); } catch (_) { return; }
    if (!legacy.length) return;

    const ipsNombre = _ipsNombre();
    const email     = _email() || '';
    const nit       = _nit();
    let uploaded = 0;

    for (const d of legacy) {
      try {
        await db.collection('vencimientos').add({
          uid, ipsNombre, email, nit,
          profesional     : d.profesional || '',
          tipo            : d.tipo        || 'Otro',
          fechaVencimiento: d.fecha       || '',
          localId         : d.id,
          migrated        : true,
          active          : true,
          createdAt       : firebase.firestore.FieldValue.serverTimestamp(),
        });
        uploaded++;
      } catch (e) {
        console.warn('[Venc] Error sincronizando offline:', e);
      }
    }

    if (uploaded > 0) {
      localStorage.removeItem(KEY);
      console.log('[Venc] Sincronizados', uploaded, 'vencimientos offline → Firestore');
    }
  }

  // ── onSnapshot ───────────────────────────────────────────────────────────────
  function _subscribe(uid) {
    if (_unsubVenc) { _unsubVenc(); _unsubVenc = null; }
    if (typeof db === 'undefined' || !uid) return;

    _unsubVenc = db.collection('vencimientos')
      .where('uid', '==', uid)
      .where('active', '==', true)
      .orderBy('fechaVencimiento', 'asc')
      .onSnapshot(
        snap => {
          _vencCache = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
          _saveCache(_vencCache);
          _renderVencimientos();
        },
        err => {
          console.warn('[Venc] onSnapshot error:', err);
          _vencCache = _loadCache();
          _renderVencimientos();
        }
      );
  }

  // ── Inicializar módulo ────────────────────────────────────────────────────────
  async function initVencimientos() {
    const uid = _uid();
    if (!uid) return;
    if (_vencUid === uid && _unsubVenc) return;

    _vencUid = uid;

    // Render inmediato desde caché
    _vencCache = _loadCache();
    _renderVencimientos();

    // Sync datos offline legacy si existen
    if (localStorage.getItem('normalis_vencimientos')) {
      await _syncOfflinePending(uid).catch(console.warn);
    }

    // Suscribir al stream en tiempo real
    _subscribe(uid);
  }

  // ── Abrir/cerrar modal ────────────────────────────────────────────────────────
  function openVencForm() {
    const m = document.getElementById('venc-modal');
    if (m) m.style.display = 'flex';
  }
  function closeVencModal() {
    const m = document.getElementById('venc-modal');
    if (m) m.style.display = 'none';
    const prof = document.getElementById('venc-profesional');
    const fec  = document.getElementById('venc-fecha');
    if (prof) prof.value = '';
    if (fec)  fec.value  = '';
  }

  // ── Guardar nuevo vencimiento ─────────────────────────────────────────────────
  async function saveVenc() {
    const profesional = (document.getElementById('venc-profesional')?.value || '').trim();
    const tipo        = document.getElementById('venc-tipo')?.value || 'Otro';
    const fecha       = document.getElementById('venc-fecha')?.value || '';

    if (!profesional || !fecha) {
      if (typeof toast === 'function') toast('Complete todos los campos', 'warning');
      return;
    }

    const uid = _uid();
    if (!uid) {
      if (typeof toast === 'function') toast('Sesión expirada. Por favor recargue.', 'error');
      return;
    }

    const entry = {
      uid,
      ipsNombre       : _ipsNombre(),
      email           : _email() || '',
      nit             : _nit(),
      profesional,
      tipo,
      fechaVencimiento: fecha,
      active          : true,
      createdAt       : firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (typeof db !== 'undefined') {
      try {
        await db.collection('vencimientos').add(entry);
        if (typeof toast === 'function') toast('Vencimiento registrado', 'success');
      } catch (e) {
        console.error('[Venc] Error guardando:', e);
        // Fallback a localStorage
        const local = JSON.parse(localStorage.getItem('normalis_vencimientos') || '[]');
        local.push({ id: Date.now(), profesional, tipo, fecha });
        localStorage.setItem('normalis_vencimientos', JSON.stringify(local));
        if (typeof toast === 'function') toast('Guardado localmente (sin conexión)', 'warning');
      }
    } else {
      const local = JSON.parse(localStorage.getItem('normalis_vencimientos') || '[]');
      local.push({ id: Date.now(), profesional, tipo, fecha });
      localStorage.setItem('normalis_vencimientos', JSON.stringify(local));
      if (typeof toast === 'function') toast('Guardado localmente (sin conexión)', 'warning');
    }

    closeVencModal();

    if (typeof logAction === 'function') {
      logAction('Vencimientos', 'Nuevo vencimiento', `${profesional} — ${tipo} — ${fecha}`);
    }
  }

  // ── Eliminar (soft-delete: active = false) ────────────────────────────────────
  async function eliminarVenc(docId) {
    if (!confirm('¿Eliminar este vencimiento?')) return;
    const uid = _uid();

    if (typeof db !== 'undefined' && docId && !String(docId).startsWith('local_')) {
      try {
        await db.collection('vencimientos').doc(docId).update({
          active    : false,
          deletedAt : firebase.firestore.FieldValue.serverTimestamp(),
        });
        // onSnapshot actualizará _vencCache automáticamente
      } catch (e) {
        console.warn('[Venc] Error eliminando:', e);
        // Remover de caché local
        _vencCache = _vencCache.filter(d => d._docId !== docId);
        _saveCache(_vencCache);
        _renderVencimientos();
      }
    } else {
      // Entrada local
      _vencCache = _vencCache.filter(d => d._docId !== docId);
      _saveCache(_vencCache);
      _renderVencimientos();
    }

    if (typeof logAction === 'function') {
      logAction('Vencimientos', 'Vencimiento eliminado', docId);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  function _renderVencimientos() {
    const list = document.getElementById('venc-list');
    if (!list) return;

    const docs = [..._vencCache].sort((a, b) => {
      const fa = a.fechaVencimiento || a.fecha || '';
      const fb = b.fechaVencimiento || b.fecha || '';
      return fa.localeCompare(fb);
    });

    const hoy  = new Date(); hoy.setHours(0, 0, 0, 0);
    const en30 = new Date(hoy); en30.setDate(en30.getDate() + 30);

    const getFecha = d => d.fechaVencimiento || d.fecha || '';

    const vencidos = docs.filter(d => new Date(getFecha(d)) < hoy).length;
    const proximos = docs.filter(d => { const f = new Date(getFecha(d)); return f >= hoy && f <= en30; }).length;
    const vigentes = docs.filter(d => new Date(getFecha(d)) > en30).length;

    const setKPI = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setKPI('venc-vencidos', vencidos);
    setKPI('venc-proximos', proximos);
    setKPI('venc-vigentes', vigentes);

    if (docs.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">No hay documentos registrados.</div>';
      return;
    }

    list.innerHTML = docs.map(d => {
      const fechaStr = getFecha(d);
      const f        = new Date(fechaStr); f.setHours(0, 0, 0, 0);
      const dias     = Math.round((f - hoy) / (1000 * 60 * 60 * 24));
      const color    = dias < 0 ? '#ef4444' : dias <= 30 ? '#f59e0b' : '#10b981';
      const label    = dias < 0
        ? 'VENCIDO hace ' + Math.abs(dias) + ' días'
        : dias === 0 ? 'VENCE HOY'
        : 'Vence en ' + dias + ' días';
      const docId    = _esc(d._docId || '');
      const fechaDisplay = fechaStr ? new Date(fechaStr).toLocaleDateString('es-CO') : '-';

      return `<div style="border:1px solid ${color}40;border-left:4px solid ${color};border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px">
        <div>
          <div style="font-weight:600;font-size:14px">${_esc(d.profesional)}</div>
          <div style="color:#64748b;font-size:13px">${_esc(d.tipo)}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px">Vence: ${fechaDisplay}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <span style="background:${color}20;color:${color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${label}</span>
          <button onclick="eliminarVenc('${docId}')" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:11px">🗑️ Eliminar</button>
        </div>
      </div>`;
    }).join('');
  }

  // ── Alias público ─────────────────────────────────────────────────────────────
  function renderVencimientos() {
    if (!_unsubVenc && _uid()) {
      initVencimientos();
    } else {
      _renderVencimientos();
    }
  }

  // ── Exponer al scope global ───────────────────────────────────────────────────
  window.openVencForm       = openVencForm;
  window.closeVencModal     = closeVencModal;
  window.saveVenc           = saveVenc;
  window.renderVencimientos = renderVencimientos;
  window.eliminarVenc       = eliminarVenc;
  window.initVencimientos   = initVencimientos;

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { if (_uid()) initVencimientos(); });
  } else {
    if (_uid()) initVencimientos();
  }

})();

// END:normalis-vencimientos.js — NormaLis integrity seal
