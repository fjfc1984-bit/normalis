// XSS-safe HTML escaper (local fallback)
const escH = window.escH || function(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };

// normalis-capa.js
// NormaLis — Módulo Plan de Mejoramiento / CAPA (Correctivas y Preventivas)
// Base legal: Dec. 1011/2006 Art. 34, Res. 256/2016, ciclo PAMEC
// ─────────────────────────────────────────────

// ══════════════════════════════════════════════
// ESTADO LOCAL
// ══════════════════════════════════════════════
let _capas = [];
let _capaEditId = null;

// ══════════════════════════════════════════════
// RENDER PRINCIPAL
// ══════════════════════════════════════════════
function renderCAPAs() {
  const uid = sessionStorage.getItem('normalis_uid');
  if (!uid || typeof db === 'undefined') return;

  db.collection('capas')
    .where('uid', '==', uid)
    .orderBy('fechaCreacion', 'desc')
    .onSnapshot(snap => {
      _capas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _renderCapaStats();
      _renderCapaList();
    }, () => {
      // índice aún no existe — cargar sin orden
      db.collection('capas').where('uid', '==', uid).get().then(snap => {
        _capas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _renderCapaStats();
        _renderCapaList();
      });
    });
}

function _renderCapaStats() {
  const abiertas   = _capas.filter(c => c.estado === 'abierta').length;
  const progreso   = _capas.filter(c => c.estado === 'en_progreso').length;
  const cerradas   = _capas.filter(c => c.estado === 'cerrada').length;
  const vencidas   = _capas.filter(c => {
    if (c.estado === 'cerrada') return false;
    return c.fechaLimite && new Date(c.fechaLimite) < new Date();
  }).length;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('capa-abiertas', abiertas);
  set('capa-progreso', progreso);
  set('capa-cerradas', cerradas);
  set('capa-vencidas', vencidas);
  set('capa-total', _capas.length);
}

function _renderCapaList(filtro) {
  const el = document.getElementById('capa-list');
  if (!el) return;
  let lista = [..._capas];

  // Marcar vencidas
  lista = lista.map(c => {
    if (c.estado !== 'cerrada' && c.fechaLimite && new Date(c.fechaLimite) < new Date()) {
      return { ...c, _vencida: true };
    }
    return c;
  });

  if (filtro && filtro !== 'todas') lista = lista.filter(c => c.estado === filtro || (filtro === 'vencidas' && c._vencida));
  if (!lista.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px">No hay CAPAs registradas.<br>Crea una desde una auditoría o manualmente.</div>';
    return;
  }

  const ESTADO_CFG = {
    abierta:     { color: '#f59e0b', bg: '#fef3c7', label: 'Abierta' },
    en_progreso: { color: '#3b82f6', bg: '#dbeafe', label: 'En Progreso' },
    cerrada:     { color: '#10b981', bg: '#d1fae5', label: 'Cerrada' },
  };

  el.innerHTML = lista.map(c => {
    const cfg      = ESTADO_CFG[c.estado] || ESTADO_CFG.abierta;
    const vencida  = c._vencida;
    const estColor = vencida ? '#ef4444' : cfg.color;
    const estBg    = vencida ? '#fee2e2' : cfg.bg;
    const estLabel = vencida ? 'Vencida' : cfg.label;
    const fechaL   = c.fechaLimite ? new Date(c.fechaLimite).toLocaleDateString('es-CO', {day:'2-digit',month:'short',year:'numeric'}) : '—';
    const fechaC   = c.fechaCreacion ? new Date(c.fechaCreacion.seconds ? c.fechaCreacion.seconds*1000 : c.fechaCreacion).toLocaleDateString('es-CO', {day:'2-digit',month:'short'}) : '—';
    const diasRest = c.fechaLimite && c.estado !== 'cerrada' ? Math.ceil((new Date(c.fechaLimite) - new Date()) / 86400000) : null;
    const diasLabel = diasRest !== null ? (diasRest < 0 ? `&#9888; Venció hace ${Math.abs(diasRest)}d` : diasRest === 0 ? '🔴 Vence hoy' : `${diasRest}d restantes`) : '';

    return `
    <div style="background:#fff;border-radius:12px;padding:18px 20px;border:1px solid ${vencida ? '#fca5a5' : '#e2e8f0'};margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.5px">${c.numero || 'CAPA'}</span>
            <span style="background:${estBg};color:${estColor};padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700">${estLabel}</span>
            ${c.origen ? `<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:20px;font-size:11px">${escH(c.origen)}</span>` : ''}
          </div>
          <div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:4px">${escH((c.descripcion||'').substring(0,100))}</div>
          ${c.accionCorrectiva ? `<div style="font-size:12px;color:#475569;margin-bottom:6px">↳ ${escH(c.accionCorrectiva.substring(0,120))}</div>` : ''}
          <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#94a3b8">
            ${c.responsable ? `<span>👤 ${escH(c.responsable)}</span>` : ''}
            ${c.area ? `<span>📍 ${c.area.replace(/[<>]/g,'')}</span>` : ''}
            <span>📅 Límite: ${fechaL}</span>
            ${diasLabel ? `<span style="color:${vencida||diasRest<=3?'#ef4444':'#f59e0b'};font-weight:600">${diasLabel}</span>` : ''}
            <span>Creada: ${fechaC}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          ${c.estado !== 'cerrada' ? `<button onclick="abrirCAPAModal('${c.id}')" style="background:#f1f5f9;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">✏️ Editar</button>` : ''}
          ${c.estado === 'en_progreso' ? `<button onclick="cerrarCAPA('${c.id}')" style="background:#d1fae5;color:#059669;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">✅ Cerrar</button>` : ''}
          ${c.estado === 'abierta' ? `<button onclick="iniciarCAPA('${c.id}')" style="background:#dbeafe;color:#2563eb;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">▶ Iniciar</button>` : ''}
        </div>
      </div>
      ${c.evidencia ? `<div style="margin-top:10px;padding:10px;background:#f8fafc;border-radius:8px;font-size:12px;color:#475569"><strong>Evidencia:</strong> ${c.evidencia.replace(/[<>]/g,'')}</div>` : ''}
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════
// MODAL CREAR / EDITAR CAPA
// ══════════════════════════════════════════════
function abrirCAPAModal(capaId) {
  _capaEditId = capaId || null;
  const modal = document.getElementById('capa-modal');
  if (!modal) return;

  if (capaId) {
    const c = _capas.find(x => x.id === capaId);
    if (c) {
      document.getElementById('capa-desc').value       = c.descripcion       || '';
      document.getElementById('capa-causa').value      = c.causaRaiz         || '';
      document.getElementById('capa-accion').value     = c.accionCorrectiva  || '';
      document.getElementById('capa-responsable').value= c.responsable       || '';
      document.getElementById('capa-area').value       = c.area              || '';
      document.getElementById('capa-fecha').value      = c.fechaLimite       || '';
      document.getElementById('capa-origen').value     = c.origen            || 'manual';
      document.getElementById('capa-evidencia').value  = c.evidencia         || '';
    }
  } else {
    document.getElementById('capa-form').reset();
  }

  modal.style.display = 'flex';
}

function cerrarCAPAModal() {
  const modal = document.getElementById('capa-modal');
  if (modal) modal.style.display = 'none';
  _capaEditId = null;
}

// Pre-llenar desde resultados de auditoría
function crearCAPADesdeNC(descripcionNC, area) {
  _capaEditId = null;
  const modal = document.getElementById('capa-modal');
  if (!modal) return;
  document.getElementById('capa-form').reset();
  document.getElementById('capa-desc').value    = descripcionNC || '';
  document.getElementById('capa-area').value    = area          || '';
  document.getElementById('capa-origen').value  = 'auditoria';
  // Fecha límite default: 30 días
  const d = new Date(); d.setDate(d.getDate() + 30);
  document.getElementById('capa-fecha').value   = d.toISOString().split('T')[0];
  modal.style.display = 'flex';
  // Navegar a capa si no está visible
  if (typeof nav === 'function') nav('capa');
}

// ══════════════════════════════════════════════
// GUARDAR CAPA
// ══════════════════════════════════════════════
async function saveCAPA() {
  const uid = sessionStorage.getItem('normalis_uid');
  if (!uid) return;

  const desc     = (document.getElementById('capa-desc')?.value     || '').trim();
  const causa    = (document.getElementById('capa-causa')?.value    || '').trim();
  const accion   = (document.getElementById('capa-accion')?.value   || '').trim();
  const resp     = (document.getElementById('capa-responsable')?.value || '').trim();
  const area     = (document.getElementById('capa-area')?.value     || '').trim();
  const fecha    = (document.getElementById('capa-fecha')?.value    || '').trim();
  const origen   = (document.getElementById('capa-origen')?.value   || 'manual');
  const evidencia= (document.getElementById('capa-evidencia')?.value|| '').trim();

  if (!desc) { nlToast('La descripción de la no conformidad es obligatoria.', 'warning'); return; }

  const btn = document.querySelector('#capa-modal button[onclick="saveCAPA()"]');
  if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); btn.textContent = 'Guardando'; }

  // Obtener NIT para dual-write (compatibilidad multi-usuario)
  const nit = (() => { try { return JSON.parse(localStorage.getItem('normalis_cfg')||'{}').nit || ''; } catch(_){ return ''; } })();

  try {
    if (_capaEditId) {
      // Actualizar
      const upd = { descripcion: desc, causaRaiz: causa, accionCorrectiva: accion,
        responsable: resp, area, fechaLimite: fecha, origen, evidencia,
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp() };
      await db.collection('capas').doc(_capaEditId).update(upd);
    } else {
      // Crear nueva — número secuencial por IPS (uid o nit)
      const countQuery = nit
        ? db.collection('capas').where('nit', '==', nit)
        : db.collection('capas').where('uid', '==', uid);
      const countSnap = await countQuery.get();
      const num = String(countSnap.size + 1).padStart(3, '0');
      await db.collection('capas').add({
        uid, nit,                               // dual-write: acceso individual + IPS
        numero: `CAPA-${num}`, descripcion: desc, causaRaiz: causa,
        accionCorrectiva: accion, responsable: resp, area, fechaLimite: fecha,
        origen, evidencia, estado: 'abierta',
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    nlToast('CAPA guardada correctamente', 'success');
    cerrarCAPAModal();
  } catch (e) {
    nlToast('Error al guardar: ' + e.message, 'error');
    console.error('[normalis-capa] saveCAPA:', e);
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); btn.textContent = 'Guardar'; }
  }
}

async function iniciarCAPA(id) {
  try {
    await db.collection('capas').doc(id).update({
      estado: 'en_progreso',
      fechaInicio: firebase.firestore.FieldValue.serverTimestamp()
    });
    nlToast('CAPA iniciada', 'info');
  } catch(e) { nlToast('Error: ' + e.message, 'error'); console.error('[normalis-capa] iniciarCAPA:', e); }
}

async function cerrarCAPA(id) {
  const evidenciaInput = await nlPrompt('Evidencia de cierre', 'Describe la evidencia (obligatorio):');
  if (!evidenciaInput || !evidenciaInput.trim()) return;
  try {
    await db.collection('capas').doc(id).update({
      estado: 'cerrada',
      evidencia: evidenciaInput.trim(),
      fechaCierre: firebase.firestore.FieldValue.serverTimestamp()
    });
    nlToast('CAPA cerrada exitosamente', 'success');
  } catch(e) { nlToast('Error: ' + e.message, 'error'); console.error('[normalis-capa] cerrarCAPA:', e); }
}

// ══════════════════════════════════════════════
// EXPORTAR PLAN DE MEJORAMIENTO PDF (básico)
// ══════════════════════════════════════════════
function exportarPlanMejoramientoPDF() {
  const ipsNombre = localStorage.getItem('normalis_ips_nombre') || 'IPS';
  const fecha = new Date().toLocaleDateString('es-CO', {day:'2-digit',month:'long',year:'numeric'});
  const filas = _capas.map(c => {
    const estado = c._vencida ? 'VENCIDA' : (c.estado||'abierta').toUpperCase().replace('_',' ');
    return `<tr>
      <td style="padding:8px;border:1px solid #e2e8f0;font-size:12px">${c.numero||''}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;font-size:12px">${(c.descripcion||'').substring(0,80)}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;font-size:12px">${c.accionCorrectiva||'—'}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;font-size:12px">${c.responsable||'—'}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;font-size:12px">${c.fechaLimite||'—'}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;font-size:12px;font-weight:700;color:${estado==='CERRADA'?'#10b981':estado.includes('VENC')?'#ef4444':'#f59e0b'}">${estado}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Plan de Mejoramiento — ${ipsNombre}</title>
  <style>body{font-family:Arial,sans-serif;padding:30px;color:#1e293b}h1{color:#00A896;font-size:20px}h2{font-size:14px;color:#475569;font-weight:400;margin-top:4px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#00A896;color:#fff;padding:10px 8px;font-size:12px;text-align:left;border:1px solid #00A896}tr:nth-child(even){background:#f8fafc}.footer{margin-top:30px;font-size:11px;color:#94a3b8}</style></head>
  <body><h1>📋 Plan de Mejoramiento — PAMEC</h1><h2>${ipsNombre} · Generado el ${fecha}</h2>
  <table><thead><tr><th>N°</th><th>No Conformidad</th><th>Acción Correctiva</th><th>Responsable</th><th>Fecha Límite</th><th>Estado</th></tr></thead>
  <tbody>${filas}</tbody></table>
  <div class="footer">Documento generado por NormaLis · Base legal: Dec. 1011/2006 Art. 34 · Res. 256/2016</div>
  </body></html>`;

  const w = window.open('','_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
}

// END:normalis-capa.js — NormaLis integrity seal
