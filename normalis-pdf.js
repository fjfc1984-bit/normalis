// normalis-pdf.js
// NormaLis — Generación de informe PDF de auditoría
// ─────────────────────────────────────────────

// ══════════════════════════════════════════════
// INFORME PDF DE AUDITORÍA
// ══════════════════════════════════════════════
function logAuditCompleted(){
  const sc=calcAuditScore();
  if(typeof logActivity==='function') logActivity('auditoria_completada','auditoria','Puntaje: '+sc.score+'% · '+sc.si+' conformes, '+sc.no+' no conformes');
}
function printAuditReport(){
  const r = (typeof calcAuditScore==='function') ? calcAuditScore() : {score:0,si:0,no:0,parcial:0,na:0,total:0};
  const score = r.score||74;
  const scoreColor = score>=85?'#10b981':score>=70?'#f59e0b':'#ef4444';
  const riskLabel  = score>=85?'Habilitación probable':score>=70?'Riesgo moderado':'Riesgo alto';
  const est  = cfg('nombre','Establecimiento de Salud');
  const nit  = cfg('nit','');
  const dir  = cfg('director','Director Técnico');
  const rm   = cfg('rm','');
  const ciudad = cfg('ciudad','');
  const hoy  = new Date().toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const seg  = {general:'Establecimiento General',domiciliaria:'Salud Domiciliaria',imagenologia:'Imagenología',calidad:'Calidad en Salud',urgencias:'Urgencias',internacion:'Internación',quirurgicos:'Quirúrgicos',laboratorio:'Laboratorio Clínico',transporte:'Transporte Asistencial',rehabilitacion:'Rehabilitación',salud_mental:'Salud Mental',odontologia:'Odontología'}[segActivo]||'General';

  // Build area breakdown
  let areasHTML = '';
  if(areas && areas.length && Object.keys(auditAnswers).length > 0){
    let qOffset=0;
    areas.forEach(area=>{
      let si=0,no=0,par=0,na=0;
      (area.q||[]).forEach((_,qi)=>{
        const v=auditAnswers['q'+(qOffset+qi)];
        if(v==='si') si++; else if(v==='no') no++; else if(v==='parcial') par++; else if(v==='na') na++;
      });
      const eff=(area.q||[]).length-na;
      const pct=eff>0?Math.round(((si+par*0.5)/eff)*100):100;
      const c=pct>=85?'#10b981':pct>=60?'#f59e0b':'#ef4444';
      areasHTML+=`<tr><td>${area.icon} ${area.name}</td><td style="text-align:center">${si}</td><td style="text-align:center">${no}</td><td style="text-align:center">${par}</td><td style="text-align:center;font-weight:700;color:${c}">${pct}%</td></tr>`;
      qOffset+=(area.q||[]).length;
    });
  } else {
    areasHTML='<tr><td colspan="5" style="text-align:center;color:#64748b">Completa la auditoría para ver el desglose por área</td></tr>';
  }

  // Build NC list
  let ncHTML='', ncCount=0;
  if(areas && areas.length && Object.keys(auditAnswers).length > 0){
    let qOffset=0;
    areas.forEach(area=>{
      (area.q||[]).forEach((q,qi)=>{
        const v=auditAnswers['q'+(qOffset+qi)];
        if(v==='no'||v==='parcial'){
          ncCount++;
          ncHTML+=`<tr><td style="color:${v==='no'?'#ef4444':'#f59e0b'}">${v==='no'?'No cumple':'Parcial'}</td><td>${area.icon} ${area.name}</td><td style="font-size:11px">${q.length>100?q.slice(0,100)+'…':q}</td></tr>`;
        }
      });
      qOffset+=(area.q||[]).length;
    });
  }
  if(!ncHTML) ncHTML='<tr><td colspan="3" style="text-align:center;color:#10b981">✅ Sin no conformidades detectadas</td></tr>';

  const w=window.open('','_blank','width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Informe de Auditoría — ${est}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;font-size:12px;color:#1e293b;margin:0;padding:30px 40px;max-width:800px}
    .cover{text-align:center;padding:40px 0 32px;border-bottom:3px solid #0ea5e9;margin-bottom:32px}
    .cover h1{font-size:22px;font-weight:900;margin-bottom:6px}
    .cover .sub{font-size:13px;color:#64748b;margin-top:4px}
    .score-hero{background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;border-radius:16px;padding:28px 32px;margin-bottom:24px;display:flex;align-items:center;gap:32px}
    .score-big{font-size:72px;font-weight:900;line-height:1;color:${scoreColor}}
    .score-info h2{font-size:18px;font-weight:800;margin:0 0 6px;color:#f1f5f9}
    .score-info p{margin:4px 0;font-size:12px;color:#94a3b8}
    .risk-badge{display:inline-block;background:${score>=85?'rgba(16,185,129,.2)':score>=70?'rgba(245,158,11,.2)':'rgba(239,68,68,.2)'};color:${scoreColor};border-radius:999px;padding:4px 14px;font-weight:700;font-size:12px;margin-top:8px}
    h2{font-size:14px;font-weight:800;color:#0284c7;border-bottom:2px solid #0ea5e9;padding-bottom:4px;margin:24px 0 12px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px}
    th{background:#0ea5e9;color:#fff;padding:8px 10px;text-align:left;font-weight:700}
    td{padding:7px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top}
    tr:nth-child(even) td{background:#f8fafc}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
    .meta-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px}
    .meta-label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
    .meta-val{font-size:13px;font-weight:700}
    .sign-section{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px;padding-top:20px;border-top:1px solid #e2e8f0}
    .sign-line{border-top:1px solid #1e293b;margin-top:50px;padding-top:6px;font-size:11px}
    .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8}
    @media print{body{padding:15px 20px}.score-hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <div class="cover">
    <div style="font-size:28px;margin-bottom:8px">📋</div>
    <h2>INFORME DE AUDITORÍA SIMULADA DE HABILITACIÓN</h2>
    <div class="sub">${est}${nit?' · NIT '+nit:''}${ciudad?' · '+ciudad:''}</div>
    <div class="sub">Segmento: ${seg} · Fecha: ${hoy}</div>
    <div class="sub" style="margin-top:4px;font-size:11px">Generado con NormaLis · Conforme a Resolución 3100/2019</div>
  </div>

  <div class="score-hero">
    <div class="score-big">${score}</div>
    <div class="score-info">
      <h2>Puntaje de Cumplimiento / 100</h2>
      <p>Preguntas respondidas: ${r.total||0} · Conformes: ${r.si||0} · No conformes: ${r.no||0} · Parciales: ${r.parcial||0}</p>
      <div class="risk-badge">${score>=85?'✅':'⚠️'} ${riskLabel}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-card"><div class="meta-label">Establecimiento</div><div class="meta-val">${est}</div></div>
    <div class="meta-card"><div class="meta-label">Director Técnico</div><div class="meta-val">${dir}${rm?' · '+rm:''}</div></div>
    <div class="meta-card"><div class="meta-label">Segmento auditado</div><div class="meta-val">${seg}</div></div>
    <div class="meta-card"><div class="meta-label">Normativa base</div><div class="meta-val">Res. 3100/2019 y modificaciones</div></div>
  </div>

  <h2>📊 Cumplimiento por Área</h2>
  <table><tr><th>Área</th><th style="text-align:center">Sí</th><th style="text-align:center">No</th><th style="text-align:center">Parcial</th><th style="text-align:center">Puntaje</th></tr>${areasHTML}</table>

  <h2>🔴 No Conformidades Detectadas (${ncCount})</h2>
  <table><tr><th>Estado</th><th>Área</th><th>Observación</th></tr>${ncHTML}</table>

  <h2>📌 Recomendaciones Prioritarias</h2>
  <table><tr><th>#</th><th>Acción recomendada</th><th>Prioridad</th><th>Plazo sugerido</th></tr>
  <tr><td>1</td><td>Revisar y actualizar todos los documentos con no conformidades</td><td style="color:#ef4444">Alta</td><td>30 días</td></tr>
  <tr><td>2</td><td>Verificar vigencia de RETHUS de todo el talento humano asistencial</td><td style="color:#ef4444">Alta</td><td>15 días</td></tr>
  <tr><td>3</td><td>Actualizar el REPS si ha habido cambios en los últimos 30 días</td><td style="color:#f59e0b">Media</td><td>30 días</td></tr>
  <tr><td>4</td><td>Programar mantenimiento preventivo de equipos biomédicos pendientes</td><td style="color:#f59e0b">Media</td><td>60 días</td></tr>
  <tr><td>5</td><td>Realizar simulacro de evacuación y documentar el informe</td><td style="color:#10b981">Baja</td><td>90 días</td></tr></table>

  <div class="sign-section">
    <div><div class="sign-line"><strong>${dir}</strong><br>Director Técnico${rm?' · '+rm:''}<br>${est}</div></div>
    <div><div class="sign-line"><strong>Responsable de Calidad</strong><br>Cargo: _________________<br>${est}</div></div>
  </div>
  <div class="footer">NormaLis · Copiloto de Habilitación Normativa · ${hoy} · Este informe es de uso interno y orientativo. No reemplaza la visita oficial de habilitación por la Secretaría de Salud.</div>
  
</body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),400);
}

