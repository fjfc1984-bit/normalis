// normalis-pqrs.js
// NormaLis — Módulo PQRS — formulario y gestión de peticiones, quejas, reclamos
// ─────────────────────────────────────────────

// ═══════════════════════════════════════════
// MÓDULO PQRS
// ═══════════════════════════════════════════
function openPQRSForm() {
  document.getElementById('pqrs-modal').style.display = 'flex';
}
function closePQRSModal() {
  document.getElementById('pqrs-modal').style.display = 'none';
}
function savePQRS() {
  var tipo = document.getElementById('pqrs-tipo').value;
  var nombre = document.getElementById('pqrs-nombre').value;
  var desc = document.getElementById('pqrs-desc').value;
  var area = document.getElementById('pqrs-area').value;
  if (!nombre || !desc) { alert('Por favor complete nombre y descripción'); return; }
  var pqrs = JSON.parse(localStorage.getItem('normalis_pqrs') || '[]');
  pqrs.push({ id: Date.now(), tipo, nombre, desc, area, estado: 'Pendiente', fecha: new Date().toLocaleDateString('es-CO') });
  localStorage.setItem('normalis_pqrs', JSON.stringify(pqrs));
  closePQRSModal();
  renderPQRS();
  ['pqrs-nombre','pqrs-desc','pqrs-area'].forEach(id => document.getElementById(id).value = '');
}
function renderPQRS() {
  var pqrs = JSON.parse(localStorage.getItem('normalis_pqrs') || '[]');
  var list = document.getElementById('pqrs-list');
  if (!list) return;
  var pendientes = pqrs.filter(p => p.estado === 'Pendiente').length;
  var proceso = pqrs.filter(p => p.estado === 'En Proceso').length;
  var cerradas = pqrs.filter(p => p.estado === 'Cerrada').length;
  document.getElementById('pqrs-total').textContent = pqrs.length;
  document.getElementById('pqrs-pendientes').textContent = pendientes;
  document.getElementById('pqrs-proceso').textContent = proceso;
  document.getElementById('pqrs-cerradas').textContent = cerradas;
  var colors = { 'Petición':'#3b82f6','Queja':'#ef4444','Reclamo':'#f59e0b','Sugerencia':'#8b5cf6','Felicitación':'#10b981' };
  var estadoColors = { 'Pendiente':'#f59e0b','En Proceso':'#3b82f6','Cerrada':'#10b981' };
  list.innerHTML = pqrs.length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8">No hay PQRS registradas. Haga clic en "+ Nueva PQRS"</div>' :
    pqrs.map((p,i) => `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;display:flex;align-items:flex-start;gap:12px">
      <div style="background:${colors[p.tipo]||'#64748b'}20;color:${colors[p.tipo]||'#64748b'};padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap">${p.tipo}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${p.nombre}</div>
        <div style="color:#64748b;font-size:13px;margin:4px 0">${p.desc}</div>
        <div style="font-size:12px;color:#94a3b8">${p.area ? '📍 '+p.area+' · ' : ''}${p.fecha}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        <span style="background:${estadoColors[p.estado]}20;color:${estadoColors[p.estado]};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${p.estado}</span>
        <select onchange="cambiarEstadoPQRS(${i},this.value)" style="font-size:11px;padding:3px 6px;border:1px solid #e2e8f0;border-radius:6px">
          <option>Pendiente</option><option>En Proceso</option><option>Cerrada</option>
        </select>
      </div>
    </div>`).join('');
}
function cambiarEstadoPQRS(i, estado) {
  var pqrs = JSON.parse(localStorage.getItem('normalis_pqrs') || '[]');
  pqrs[i].estado = estado;
  localStorage.setItem('normalis_pqrs', JSON.stringify(pqrs));
  renderPQRS();
}
function exportPQRSReport() {
  var pqrs = JSON.parse(localStorage.getItem('normalis_pqrs') || '[]');
  var w = window.open('','_blank');
  w.document.write('<html><head><title>Informe PQRS</title></head><body style="font-family:Arial;padding:30px">');
  w.document.write('<h1>Informe de PQRS — ' + new Date().toLocaleDateString('es-CO') + '</h1>');
  w.document.write('<p>Total: '+pqrs.length+' | Pendientes: '+pqrs.filter(p=>p.estado==='Pendiente').length+' | Cerradas: '+pqrs.filter(p=>p.estado==='Cerrada').length+'</p>');
  w.document.write('<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%"><tr><th>Tipo</th><th>Usuario</th><th>Descripción</th><th>Área</th><th>Estado</th><th>Fecha</th></tr>');
  pqrs.forEach(p => w.document.write('<tr><td>'+p.tipo+'</td><td>'+p.nombre+'</td><td>'+p.desc+'</td><td>'+p.area+'</td><td>'+p.estado+'</td><td>'+p.fecha+'</td></tr>'));
  w.document.write('</table></body></html>');
  w.print();
}


// END:normalis-pqrs.js — NormaLis integrity seal
