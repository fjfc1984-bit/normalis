// normalis-export.js
// NormaLis — módulo extraído del inline script de normativa-app-v2.html
// ─────────────────────────────────────────────

function exportAuditCSV(){
  const hist = loadAuditHistory();
  if(hist.length===0){ toast('No hay auditorías en el historial','warn'); return; }
  
  const rows = [['Fecha','Score%','Criterios OK','Total Criterios','Segmento','Puntaje Segmento%','OK Seg','Total Seg']];
  hist.forEach(function(h){
    const fecha = new Date(h.fecha).toLocaleString('es-CO');
    const segs = h.segmentos||{};
    if(Object.keys(segs).length===0){
      rows.push([fecha,h.score,h.totalOk,h.totalPregs,'','','','']);
    } else {
      Object.entries(segs).forEach(function(e){
        const segId=e[0],d=e[1];
        const pct=d.pct||Math.round((d.ok||0)*100/Math.max(d.total||1,1));
        const name=(typeof segInfo!=='undefined'&&segInfo[segId])?segInfo[segId].nombre:segId;
        rows.push([fecha,h.score,h.totalOk,h.totalPregs,name,pct,d.ok||0,d.total||0]);
      });
    }
  });
  
  const csv = rows.map(function(r){ return r.map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(','); }).join('\n');
  const blob = new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='normalis_auditoria_'+new Date().toISOString().split('T')[0]+'.csv';
  a.click(); URL.revokeObjectURL(url);
  toast('✅ CSV exportado','success');
  logActivity('export_csv','auditoria','Historial de auditorías exportado a CSV');
}

function exportVencimientosCSV(){
  const arr = loadPersonal();
  const docNames = {titulo:'Título profesional',rethus:'Tarjeta RETHUS',contrato:'Contrato vigente',vacunas:'Esquema vacunas',bioseg:'Capacitación bioseguridad'};
  const rows = [['Profesional','Tipo','Documento','Estado']];
  arr.forEach(function(p){
    Object.keys(p.docs||{}).forEach(function(k){
      rows.push([p.nombre, p.tipo, docNames[k]||k, p.docs[k]?'OK':'Pendiente']);
    });
  });
  if(rows.length <= 1){
    toast('Sin datos de personal para exportar','warn'); return;
  }
  const csv = rows.map(function(r){ return r.join(','); }).join('\n');
  const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vencimientos_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
  toast('📥 CSV exportado','success');
}

function exportActividadPDF(){
  const logs=getActivityLogs();
  const isDir=_session&&_session.rol==='director';
  const rows=logs.filter(l=>isDir||l.userId===(_session&&_session.userId))
    .filter(l=>l.action!=='nav').slice(0,200);
  const est=(_cfg&&_cfg.nombre)||'Establecimiento';
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Reporte de Actividad</title>
  <style>body{font-family:Arial,sans-serif;font-size:12px;padding:24px}
  h1{font-size:16px}table{width:100%;border-collapse:collapse}
  th{background:#f1f5f9;padding:8px;text-align:left;border:1px solid #e2e8f0}
  td{padding:7px 8px;border:1px solid #e2e8f0}
  </style></head><body>
  <h2>Registro de Actividad — ${est}</h2>
  <p style="color:#64748b">Generado: ${new Date().toLocaleString('es-CO')} · ${rows.length} registros</p>
  <table><thead><tr><th>Fecha/Hora</th>${isDir?'<th>Usuario</th>':''}<th>Acción</th><th>Módulo</th><th>Detalle</th></tr></thead>
  <tbody>${rows.map(l=>{
    const dt=new Date(l.ts);
    return '<tr><td>'+dt.toLocaleString('es-CO')+'</td>'+(isDir?'<td>'+(l.userName||'')+'</td>':'')+'<td>'+(ACT_LABELS[l.action]||l.action)+'</td><td>'+(l.module||'')+'</td><td>'+(l.detail||'')+'</td></tr>';
  }).join('')}</tbody></table>
  
</body></html>`);
  w.document.close(); setTimeout(()=>w.print(),400);
}

function exportInformeConsultor(tipo){
  const arr = loadClientes();
  const localClientes = arr.length > 0 ? arr : clientes;
  if(tipo === 'mensual'){
    const rows = [['Cliente','Ciudad','Score','Alertas','Plan']];
    localClientes.forEach(function(c){ rows.push([c.nombre,c.ciudad,c.score,c.alertas,c.plan]); });
    const csv = rows.map(function(r){ return r.join(','); }).join('\n');
    const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'informe_mensual_'+new Date().toISOString().slice(0,7)+'.csv';
    a.click();
    toast('📊 Informe mensual exportado','success');
  } else if(tipo === 'riesgo'){
    const enRiesgo = localClientes.filter(function(c){ return c.score < 70 || c.alertas >= 5; });
    toast('🚨 '+enRiesgo.length+' clientes en riesgo identificados · Exportando…','warn');
    setTimeout(function(){
      const rows = [['Cliente','Score','Alertas','Riesgo']];
      enRiesgo.forEach(function(c){ rows.push([c.nombre,c.score,c.alertas,c.score<60?'ALTO':'MEDIO']); });
      const csv = rows.map(function(r){ return r.join(','); }).join('\n');
      const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'reporte_riesgo_'+new Date().toISOString().slice(0,10)+'.csv';
      a.click();
    }, 400);
  } else {
    toast('📋 Presentación ejecutiva: configura EmailJS para envío automático','info');
  }
}

function exportarDatos(){
  const backup = {
    version: 'NormaLis v2',
    exportedAt: new Date().toISOString(),
    establecimiento: (_cfg&&_cfg.nombre)||'NormaLis',
    data: {}
  };
  BACKUP_KEYS.forEach(function(key){
    const val = localStorage.getItem(key);
    if(val !== null) backup.data[key] = val; // keep as JSON strings
  });
  // Also include monthly PDF markers
  Object.keys(localStorage).filter(function(k){ return k.startsWith('normalis_monthly_pdf_'); })
    .forEach(function(k){ backup.data[k] = localStorage.getItem(k); });
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fecha = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = 'normalis_backup_'+fecha+'.json';
  a.click();
  URL.revokeObjectURL(url);
  logActivity('backup_export','datos','Backup exportado: '+fecha);
  const st = document.getElementById('backup-status');
  if(st) st.innerHTML = '<span style="color:var(--success)">✅ Backup exportado exitosamente — '+Object.keys(backup.data).length+' claves guardadas</span>';
  toast('✅ Backup exportado — '+a.download,'success');
}

function importarDatos(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      const backup = JSON.parse(e.target.result);
      if(!backup.data || !backup.version){ throw new Error('Archivo no reconocido'); }
      if(!confirm('¿Restaurar backup de "'+backup.establecimiento+'" ('+new Date(backup.exportedAt).toLocaleDateString('es-CO')+')?\n\nEsto reemplazará TODOS los datos actuales de esta app.')){
        input.value=''; return;
      }
      // Restore all keys
      Object.entries(backup.data).forEach(function(kv){ localStorage.setItem(kv[0], kv[1]); });
      logActivity('backup_import','datos','Backup restaurado: '+backup.exportedAt);
      const st = document.getElementById('backup-status');
      if(st) st.innerHTML = '<span style="color:var(--success)">✅ Datos restaurados correctamente. Recargando…</span>';
      toast('✅ Datos restaurados. Recargando la app…','success');
      setTimeout(function(){ location.reload(); }, 1500);
    } catch(err){
      const st = document.getElementById('backup-status');
      if(st) st.innerHTML = '<span style="color:var(--danger)">❌ Error al importar: '+err.message+'</span>';
      toast('❌ Error al importar backup: '+err.message,'error');
    }
    input.value = '';
  };
  reader.readAsText(file);
}

function shareWhatsApp(){
  const sc = calcAuditScore();
  const est = (_cfg&&_cfg.nombre)||'Establecimiento de Salud';
  const dir = (_cfg&&_cfg.director)||'Director';
  const score = sc.score||0;
  const status = score>=85?'✅ Habilitación probable':score>=70?'⚠️ Riesgo moderado':'🔴 Requiere acción urgente';
  const fecha = new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});
  const msg = encodeURIComponent(
    '\uD83C\uDFE5 Reporte NormaLis - '+est+'\n\n'+
    'Fecha: '+fecha+'\n'+
    'Puntaje: '+score+'%\n'+
    'Estado: '+status+'\n\n'+
    'Conformes: '+sc.si+' | No conformes: '+sc.no+' | Parciales: '+sc.parcial+'\n\n'+
    'Generado con NormaLis - Res. 3100/2019'
  );
  window.open('https://wa.me/?text='+msg,'_blank');
  logAutoEvent('whatsapp_share','💬 Resumen enviado por WhatsApp',est+' · '+score+'%','');
  toast('Abriendo WhatsApp con el resumen…','success');
}

function checkMonthlyPDF(){
  if(!isRuleActive('monthly_pdf')) return;
  const today = new Date();
  if(today.getDate()!==1) return;
  const lastKey='normalis_monthly_pdf_'+today.getFullYear()+'_'+today.getMonth();
  if(localStorage.getItem(lastKey)) return;
  localStorage.setItem(lastKey,'1');
  logAutoEvent('monthly_pdf','📆 PDF mensual generado automáticamente',
    new Date().toLocaleDateString('es-CO',{month:'long',year:'numeric'}),'');
  toast('📆 Generando PDF mensual automático…','success');
  setTimeout(function(){ if(typeof printAuditReport==='function') printAuditReport(); },1200);
}

// END:normalis-export.js — NormaLis integrity seal