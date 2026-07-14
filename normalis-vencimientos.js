// normalis-vencimientos.js
// NormaLis — Módulo de control de vencimientos del personal (RETHUS, tarjetas, certificados)
// ─────────────────────────────────────────────

// ═══════════════════════════════════════════
// MÓDULO VENCIMIENTOS PERSONAL
// ═══════════════════════════════════════════
function openVencForm() {
  document.getElementById('venc-modal').style.display = 'flex';
}
function closeVencModal() {
  document.getElementById('venc-modal').style.display = 'none';
}
function saveVenc() {
  var profesional = document.getElementById('venc-profesional').value;
  var tipo = document.getElementById('venc-tipo').value;
  var fecha = document.getElementById('venc-fecha').value;
  if (!profesional || !fecha) { alert('Complete todos los campos'); return; }
  var docs = JSON.parse(localStorage.getItem('normalis_vencimientos') || '[]');
  docs.push({ id: Date.now(), profesional, tipo, fecha });
  localStorage.setItem('normalis_vencimientos', JSON.stringify(docs));
  closeVencModal();
  renderVencimientos();
  document.getElementById('venc-profesional').value = '';
  document.getElementById('venc-fecha').value = '';
}
function renderVencimientos() {
  var docs = JSON.parse(localStorage.getItem('normalis_vencimientos') || '[]');
  var list = document.getElementById('venc-list');
  if (!list) return;
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  var en30 = new Date(hoy); en30.setDate(en30.getDate() + 30);
  var vencidos = docs.filter(d => new Date(d.fecha) < hoy).length;
  var proximos = docs.filter(d => { var f = new Date(d.fecha); return f >= hoy && f <= en30; }).length;
  var vigentes = docs.filter(d => new Date(d.fecha) > en30).length;
  document.getElementById('venc-vencidos').textContent = vencidos;
  document.getElementById('venc-proximos').textContent = proximos;
  document.getElementById('venc-vigentes').textContent = vigentes;
  docs.sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
  list.innerHTML = docs.length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8">No hay documentos registrados.</div>' :
    docs.map((d,i) => {
      var f = new Date(d.fecha); f.setHours(0,0,0,0);
      var dias = Math.round((f - hoy)/(1000*60*60*24));
      var color = dias < 0 ? '#ef4444' : dias <= 30 ? '#f59e0b' : '#10b981';
      var label = dias < 0 ? 'VENCIDO hace '+Math.abs(dias)+' días' : dias === 0 ? 'VENCE HOY' : 'Vence en '+dias+' días';
      return `<div style="border:1px solid ${color}40;border-left:4px solid ${color};border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div>
          <div style="font-weight:600;font-size:14px">${d.profesional}</div>
          <div style="color:#64748b;font-size:13px">${d.tipo}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px">Vence: ${new Date(d.fecha).toLocaleDateString('es-CO')}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <span style="background:${color}20;color:${color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${label}</span>
          <button onclick="eliminarVenc(${i})" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:11px">🗑️ Eliminar</button>
        </div>
      </div>`;
    }).join('');
}
function eliminarVenc(i) {
  var docs = JSON.parse(localStorage.getItem('normalis_vencimientos') || '[]');
  docs.sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
  docs.splice(i,1);
  localStorage.setItem('normalis_vencimientos', JSON.stringify(docs));
  renderVencimientos();
}


// END:normalis-vencimientos.js — NormaLis integrity seal
