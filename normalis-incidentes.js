// normalis-incidentes.js
// NormaLis — Módulo de incidentes y eventos adversos
// ─────────────────────────────────────────────

// ═══════════════════════════════════════════
// MÓDULO INCIDENTES
// ═══════════════════════════════════════════
function openIncidenteForm() {
  document.getElementById('incidente-modal').style.display = 'flex';
}
function closeIncidenteModal() {
  document.getElementById('incidente-modal').style.display = 'none';
}
function saveIncidente() {
  var tipo = document.getElementById('inc-tipo').value;
  var severidad = document.getElementById('inc-severidad').value;
  var desc = document.getElementById('inc-desc').value;
  var accion = document.getElementById('inc-accion').value;
  var responsable = document.getElementById('inc-responsable').value;
  if (!desc) { if(typeof toast==='function') toast('Por favor describa el evento','warning'); return; }
  var incs = JSON.parse(localStorage.getItem('normalis_incidentes') || '[]');
  incs.push({ id: Date.now(), tipo, severidad, desc, accion, responsable, estado: 'Abierto', fecha: new Date().toLocaleDateString('es-CO') });
  localStorage.setItem('normalis_incidentes', JSON.stringify(incs));
  closeIncidenteModal();
  renderIncidentes();
  ['inc-desc','inc-accion','inc-responsable'].forEach(id => document.getElementById(id).value = '');
}
function renderIncidentes() {
  var incs = JSON.parse(localStorage.getItem('normalis_incidentes') || '[]');
  var list = document.getElementById('incidentes-list');
  if (!list) return;
  document.getElementById('inc-criticos').textContent = incs.filter(i=>i.severidad==='critico').length;
  document.getElementById('inc-moderados').textContent = incs.filter(i=>i.severidad==='moderado').length;
  document.getElementById('inc-leves').textContent = incs.filter(i=>i.severidad==='leve').length;
  document.getElementById('inc-cerrados').textContent = incs.filter(i=>i.estado==='Cerrado').length;
  var sevColor = { critico:'#ef4444', moderado:'#f59e0b', leve:'#3b82f6' };
  var sevLabel = { critico:'🔴 Crítico', moderado:'🟡 Moderado', leve:'🔵 Leve' };
  list.innerHTML = incs.length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8">No hay eventos registrados.</div>' :
    incs.map((inc,i) => `<div style="border-left:4px solid ${sevColor[inc.severidad]};border:1px solid #e2e8f0;border-left-width:4px;border-left-color:${sevColor[inc.severidad]};border-radius:10px;padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="flex:1">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
            <span style="background:${sevColor[inc.severidad]}20;color:${sevColor[inc.severidad]};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${sevLabel[inc.severidad]}</span>
            <span style="color:#64748b;font-size:12px">${inc.tipo}</span>
          </div>
          <div style="font-size:13px;margin-bottom:4px">${inc.desc}</div>
          ${inc.accion ? '<div style="font-size:12px;color:#10b981">✅ '+inc.accion+'</div>' : ''}
          ${inc.responsable ? '<div style="font-size:12px;color:#64748b;margin-top:4px">👤 '+inc.responsable+' · '+inc.fecha+'</div>' : ''}
        </div>
        <select onchange="cambiarEstadoInc(${i},this.value)" style="font-size:11px;padding:3px 6px;border:1px solid #e2e8f0;border-radius:6px">
          <option ${inc.estado==='Abierto'?'selected':''}>Abierto</option>
          <option ${inc.estado==='En seguimiento'?'selected':''}>En seguimiento</option>
          <option ${inc.estado==='Cerrado'?'selected':''}>Cerrado</option>
        </select>
      </div>
    </div>`).join('');
}
function cambiarEstadoInc(i, estado) {
  var incs = JSON.parse(localStorage.getItem('normalis_incidentes') || '[]');
  incs[i].estado = estado;
  localStorage.setItem('normalis_incidentes', JSON.stringify(incs));
  renderIncidentes();
}


// END:normalis-incidentes.js — NormaLis integrity seal
