// normalis-pqrs.js
// NormaLis — Módulo PQRS — Peticiones, Quejas, Reclamos, Sugerencias y Felicitaciones
// Almacenamiento: Firestore usuarios/{uid}/pqrs/{id} (primario) + localStorage (caché offline)
// Seguridad: usuarios/{uid}/pqrs — solo el propietario o admin (firestore.rules)
// ─────────────────────────────────────────────

(function () {
  'use strict';

  // ── Estado del módulo ────────────────────────────────────────────────────────
  let _pqrsCache = [];          // caché en memoria (source of truth para render)
  let _unsubPQRS = null;        // Firestore onSnapshot unsub
  let _pqrsUid   = null;        // uid activo

  const COLORS_TIPO = {
    'Petición'    : '#3b82f6',
    'Queja'       : '#ef4444',
    'Reclamo'     : '#f59e0b',
    'Sugerencia'  : '#8b5cf6',
    'Felicitación': '#10b981',
  };
  const COLORS_ESTADO = {
    'Pendiente' : '#f59e0b',
    'En Proceso': '#3b82f6',
    'Cerrada'   : '#10b981',
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function _uid()   { return sessionStorage.getItem('normalis_uid');   }
  function _email() { return sessionStorage.getItem('normalis_email'); }
  function _ipsNombre() { return localStorage.getItem('normalis_ips_nombre') || ''; }

  function _dbRef(uid) {
    if (typeof db === 'undefined' || !uid) return null;
    return db.collection('usuarios').doc(uid).collection('pqrs');
  }

  // ── Migración desde localStorage ─────────────────────────────────────────────
  async function _migrateFromLocalStorage(uid) {
    const KEY = 'normalis_pqrs';
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    let legacy = [];
    try { legacy = JSON.parse(raw); } catch (_) { return; }
    if (!legacy.length) return;

    const ref = _dbRef(uid);
    if (!ref) return;

    console.log('[PQRS] Migrando', legacy.length, 'registros de localStorage a Firestore…');
    const batch = db.batch();
    legacy.forEach(p => {
      const docRef = ref.doc(String(p.id));
      batch.set(docRef, {
        uid,
        ipsNombre: _ipsNombre(),
        email: _email() || '',
        tipo   : p.tipo   || 'Petición',
        nombre : p.nombre || '',
        desc   : p.desc   || '',
        area   : p.area   || '',
        estado : p.estado || 'Pendiente',
        fecha  : p.fecha  || new Date().toLocaleDateString('es-CO'),
        localId: p.id,
        migrated: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    try {
      await batch.commit();
      localStorage.removeItem(KEY);
      console.log('[PQRS] Migración completada — localStorage limpio.');
    } catch (e) {
      console.warn('[PQRS] Error en migración:', e);
    }
  }

  // ── Guardar caché local ──────────────────────────────────────────────────────
  function _saveLocalCache(list) {
    try {
      localStorage.setItem('normalis_pqrs_cache', JSON.stringify(list));
    } catch (_) {}
  }

  function _loadLocalCache() {
    try {
      return JSON.parse(localStorage.getItem('normalis_pqrs_cache') || '[]');
    } catch (_) { return []; }
  }

  // ── onSnapshot ───────────────────────────────────────────────────────────────
  function _subscribe(uid) {
    if (_unsubPQRS) { _unsubPQRS(); _unsubPQRS = null; }
    const ref = _dbRef(uid);
    if (!ref) return;

    _unsubPQRS = ref
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          _pqrsCache = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
          _saveLocalCache(_pqrsCache);
          _renderPQRS();
        },
        err => {
          console.warn('[PQRS] onSnapshot error:', err);
          // Fallback: leer caché local
          _pqrsCache = _loadLocalCache();
          _renderPQRS();
        }
      );
  }

  // ── Inicializar módulo ────────────────────────────────────────────────────────
  async function initPQRS() {
    const uid = _uid();
    if (!uid) return;
    if (_pqrsUid === uid && _unsubPQRS) return; // ya suscrito

    _pqrsUid = uid;

    // Primero render con caché local para UX rápida
    _pqrsCache = _loadLocalCache();
    _renderPQRS();

    // Migrar datos legacy si existen (solo corre si hay datos en localStorage)
    if (localStorage.getItem('normalis_pqrs')) {
      await _migrateFromLocalStorage(uid);
    }

    // Suscribir a Firestore
    _subscribe(uid);
  }

  // ── Abrir/cerrar modal ────────────────────────────────────────────────────────
  function openPQRSForm() {
    const modal = document.getElementById('pqrs-modal');
    if (modal) modal.style.display = 'flex';
  }
  function closePQRSModal() {
    const modal = document.getElementById('pqrs-modal');
    if (modal) modal.style.display = 'none';
    // Limpiar formulario
    ['pqrs-nombre', 'pqrs-desc', 'pqrs-area'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const tipoEl = document.getElementById('pqrs-tipo');
    if (tipoEl) tipoEl.selectedIndex = 0;
  }

  // ── Guardar nueva PQRS ───────────────────────────────────────────────────────
  async function savePQRS() {
    const tipo   = document.getElementById('pqrs-tipo')?.value   || 'Petición';
    const nombre = document.getElementById('pqrs-nombre')?.value || '';
    const desc   = document.getElementById('pqrs-desc')?.value   || '';
    const area   = document.getElementById('pqrs-area')?.value   || '';

    if (!nombre.trim() || !desc.trim()) {
      if (typeof toast === 'function') toast('Por favor complete nombre y descripción', 'warning');
      return;
    }

    const uid = _uid();
    if (!uid) {
      if (typeof toast === 'function') toast('Sesión expirada. Por favor recargue.', 'error');
      return;
    }

    const now   = new Date();
    const fecha = now.toLocaleDateString('es-CO');
    const entry = {
      uid,
      ipsNombre: _ipsNombre(),
      email: _email() || '',
      tipo,
      nombre: nombre.trim(),
      desc:   desc.trim(),
      area:   area.trim(),
      estado: 'Pendiente',
      fecha,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    const ref = _dbRef(uid);
    if (ref) {
      try {
        await ref.add(entry);
        if (typeof toast === 'function') toast('PQRS registrada correctamente', 'success');
      } catch (e) {
        console.error('[PQRS] Error guardando:', e);
        if (typeof toast === 'function') toast('Error al guardar. Verifique su conexión.', 'error');
        return;
      }
    } else {
      // Sin Firestore: solo localStorage
      const localEntry = { _docId: String(Date.now()), ...entry, createdAt: now.toISOString(), updatedAt: now.toISOString() };
      _pqrsCache.unshift(localEntry);
      _saveLocalCache(_pqrsCache);
      _renderPQRS();
      if (typeof toast === 'function') toast('PQRS guardada localmente (sin conexión)', 'warning');
    }

    closePQRSModal();

    // Bitácora
    if (typeof logAction === 'function') {
      logAction('PQRS', 'Nueva PQRS', `${tipo} de ${nombre.trim()} — ${area || 'sin área'}`);
    }
  }

  // ── Cambiar estado ────────────────────────────────────────────────────────────
  async function cambiarEstadoPQRS(docId, estado) {
    const uid = _uid();
    const ref = _dbRef(uid);
    if (ref && docId) {
      try {
        await ref.doc(docId).update({
          estado,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.warn('[PQRS] Error actualizando estado:', e);
        // Actualizar cache local como fallback
        const idx = _pqrsCache.findIndex(p => p._docId === docId);
        if (idx !== -1) { _pqrsCache[idx].estado = estado; _saveLocalCache(_pqrsCache); _renderPQRS(); }
      }
    } else {
      // Sin Firestore
      const idx = _pqrsCache.findIndex(p => p._docId === docId);
      if (idx !== -1) { _pqrsCache[idx].estado = estado; _saveLocalCache(_pqrsCache); _renderPQRS(); }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  function _renderPQRS() {
    const list = document.getElementById('pqrs-list');
    if (!list) return;

    const pqrs = _pqrsCache;
    const pendientes = pqrs.filter(p => p.estado === 'Pendiente').length;
    const proceso    = pqrs.filter(p => p.estado === 'En Proceso').length;
    const cerradas   = pqrs.filter(p => p.estado === 'Cerrada').length;

    const setKPI = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setKPI('pqrs-total',      pqrs.length);
    setKPI('pqrs-pendientes', pendientes);
    setKPI('pqrs-proceso',    proceso);
    setKPI('pqrs-cerradas',   cerradas);

    if (pqrs.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">No hay PQRS registradas. Haga clic en "+ Nueva PQRS"</div>';
      return;
    }

    list.innerHTML = pqrs.map(p => {
      const color      = COLORS_TIPO[p.tipo]    || '#64748b';
      const estadoColor = COLORS_ESTADO[p.estado] || '#64748b';
      const docId = _esc(p._docId);
      return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
        <div style="background:${color}20;color:${color};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap">${_esc(p.tipo)}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${_esc(p.nombre)}</div>
          <div style="color:#64748b;font-size:13px;margin:4px 0">${_esc(p.desc)}</div>
          <div style="font-size:12px;color:#94a3b8">${p.area ? '📍 ' + _esc(p.area) + ' · ' : ''}${_esc(p.fecha || '')}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <span style="background:${estadoColor}20;color:${estadoColor};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${_esc(p.estado)}</span>
          <select onchange="cambiarEstadoPQRS('${docId}',this.value)" style="font-size:11px;padding:3px 6px;border:1px solid #e2e8f0;border-radius:6px">
            <option${p.estado==='Pendiente'  ? ' selected' : ''}>Pendiente</option>
            <option${p.estado==='En Proceso' ? ' selected' : ''}>En Proceso</option>
            <option${p.estado==='Cerrada'    ? ' selected' : ''}>Cerrada</option>
          </select>
        </div>
      </div>`;
    }).join('');
  }

  // ── Exportar informe ──────────────────────────────────────────────────────────
  function exportPQRSReport() {
    const pqrs = _pqrsCache;
    const w = window.open('', '_blank');
    const ips = _ipsNombre() || 'IPS';
    w.document.write(`<html><head><title>Informe PQRS — ${ips}</title></head><body style="font-family:Arial;padding:30px">`);
    w.document.write(`<h1>Informe de PQRS — ${ips}</h1>`);
    w.document.write(`<p>Fecha de generación: ${new Date().toLocaleDateString('es-CO')}</p>`);
    w.document.write(`<p><strong>Total:</strong> ${pqrs.length} | <strong>Pendientes:</strong> ${pqrs.filter(p=>p.estado==='Pendiente').length} | <strong>En Proceso:</strong> ${pqrs.filter(p=>p.estado==='En Proceso').length} | <strong>Cerradas:</strong> ${pqrs.filter(p=>p.estado==='Cerrada').length}</p>`);
    w.document.write('<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;font-size:13px">');
    w.document.write('<tr style="background:#f1f5f9"><th>Tipo</th><th>Nombre/Usuario</th><th>Descripción</th><th>Área</th><th>Estado</th><th>Fecha</th></tr>');
    pqrs.forEach(p => {
      w.document.write(`<tr><td>${p.tipo}</td><td>${p.nombre}</td><td>${p.desc}</td><td>${p.area||'-'}</td><td>${p.estado}</td><td>${p.fecha||''}</td></tr>`);
    });
    w.document.write('</table></body></html>');
    w.print();
  }

  // ── Alias público renderPQRS (llamado desde normalis-main.js nav()) ───────────
  function renderPQRS() {
    if (!_unsubPQRS && _uid()) {
      initPQRS();   // primera vez que se navega al módulo
    } else {
      _renderPQRS();
    }
  }

  // ── Exponer al scope global ───────────────────────────────────────────────────
  window.openPQRSForm      = openPQRSForm;
  window.closePQRSModal    = closePQRSModal;
  window.savePQRS          = savePQRS;
  window.renderPQRS        = renderPQRS;
  window.cambiarEstadoPQRS = cambiarEstadoPQRS;
  window.exportPQRSReport  = exportPQRSReport;
  window.initPQRS          = initPQRS;

  // Auto-init cuando el DOM esté listo y haya uid en sesión
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { if (_uid()) initPQRS(); });
  } else {
    if (_uid()) initPQRS();
  }

})();

// END:normalis-pqrs.js — NormaLis integrity seal
