// normalis-pamec.js
// NormaLis — módulo extraído del inline script de normativa-app-v2.html
// ─────────────────────────────────────────────

function aeFinish(){
  const db=AE_DB[aeService]||AE_DB.general;
  let criticas=[], moderadas=[], menores=[], cumple=0, total=0;
  AE_PHASES.forEach(phase=>{
    const items=db[phase.id]||[];
    const phaseAns=aeAnswers[phase.id]||[];
    items.forEach((item,i)=>{
      const ans=phaseAns[i];
      if(!ans||ans==='na') return;
      total++;
      if(ans==='cumple') cumple++;
      else if(ans==='nc'||ans==='parcial'){
        const obj={fase:phase.label, q:item.q, norm:item.norm, sev:item.sev, ans};
        if(item.sev==='critica') criticas.push(obj);
        else if(item.sev==='moderada') moderadas.push(obj);
        else menores.push(obj);
      }
    });
  });
  const score=total>0?Math.round((cumple/total)*100):0;
  const result=criticas.length>0?'CIERRE INMEDIATO':moderadas.length>3?'PLAN DE MEJORAMIENTO URGENTE':score>=80?'HABILITADO CON OBSERVACIONES':'PLAN DE MEJORAMIENTO';
  const resultColor=criticas.length>0?'#ef4444':moderadas.length>3?'#f59e0b':'#22c55e';

  let html=`<div style="background:${resultColor}11;border:2px solid ${resultColor};border-radius:12px;padding:20px 24px;margin-bottom:20px;text-align:center">
    <div style="font-size:22px;font-weight:900;color:${resultColor}">${result}</div>
    <div style="font-size:13px;color:var(--text-muted);margin-top:4px">Puntaje de cumplimiento: <strong style="color:var(--text)">${score}%</strong> (${cumple}/${total} hallazgos evaluados)</div>
    <div style="font-size:12px;margin-top:8px;color:var(--text-muted)">${criticas.length} crítica(s) · ${moderadas.length} moderada(s) · ${menores.length} menor(es)</div>
  </div>`;

  if(criticas.length>0){
    html+=`<div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:#ef4444;margin-bottom:10px">⛔ NO CONFORMIDADES CRÍTICAS — Generan cierre inmediato del servicio</div>`;
    criticas.forEach(nc=>{
      html+=`<div style="background:#ef444411;border:1px solid #ef444433;border-radius:8px;padding:12px 14px;margin-bottom:8px">
        <div style="font-size:12px;font-weight:700;color:#ef4444;margin-bottom:4px">${nc.fase}</div>
        <div style="font-size:12px;color:var(--text)">${nc.q}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">📋 ${nc.norm} · ${nc.ans==='nc'?'No cumple':'Cumplimiento parcial'}</div>
      </div>`;
    });
    html+=`</div>`;
  }

  if(moderadas.length>0){
    html+=`<div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:#f59e0b;margin-bottom:10px">⚠️ NO CONFORMIDADES MODERADAS — Plan de mejoramiento en 30 días</div>`;
    moderadas.forEach(nc=>{
      html+=`<div style="background:#f59e0b11;border:1px solid #f59e0b33;border-radius:8px;padding:12px 14px;margin-bottom:8px">
        <div style="font-size:12px;font-weight:700;color:#f59e0b;margin-bottom:4px">${nc.fase}</div>
        <div style="font-size:12px;color:var(--text)">${nc.q}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">📋 ${nc.norm}</div>
      </div>`;
    });
    html+=`</div>`;
  }

  if(menores.length>0){
    html+=`<div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:#6ee7b7;margin-bottom:10px">ℹ️ RECOMENDACIONES — Sin plazo obligatorio</div>`;
    menores.forEach(nc=>{
      html+=`<div style="background:#6ee7b711;border:1px solid #6ee7b733;border-radius:8px;padding:12px 14px;margin-bottom:8px">
        <div style="font-size:12px;color:var(--text)">${nc.q}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">📋 ${nc.norm}</div>
      </div>`;
    });
    html+=`</div>`;
  }

  if(criticas.length===0&&moderadas.length===0){
    html+=`<div style="background:#22c55e11;border:1px solid #22c55e33;border-radius:8px;padding:16px;text-align:center;color:#22c55e;font-size:13px;font-weight:700">
      🎉 ¡Excelente! El establecimiento cumple los estándares de habilitación evaluados. Sin hallazgos que generen cierre o plan de mejoramiento.
    </div>`;
  }

  html+=`<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
    <button onclick="aePrintReport()" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:8px;padding:10px;font-weight:700;cursor:pointer;font-size:13px">🖨️ Imprimir Acta de Visita</button>
    <button onclick="aeStartInspection()" style="flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text);cursor:pointer;font-size:13px">🔄 Nueva Visita</button>
  </div>`;

  document.getElementById('ae-checklist-area').innerHTML='';
  document.getElementById('ae-results-area').style.display='block';
  document.getElementById('ae-results-area').innerHTML=html;
  document.getElementById('ae-progress-bar').style.width='100%';
  document.getElementById('ae-progress-label').textContent='✅ Visita completada';
  document.getElementById('ae-progress-pct').textContent=`${cumple}/${total} hallazgos`;

  // Save to localStorage
  const snap={date:new Date().toISOString(),service:aeService,score,criticas:criticas.length,moderadas:moderadas.length,result};
  try{ localStorage.setItem('normalis_last_ae',JSON.stringify(snap)); }catch(e){}
}

function aeHighlightBtn(phaseIdx,itemIdx,ans){
  const colors={'cumple':'#22c55e','nc':'#ef4444','parcial':'#f59e0b','na':'#6b7280'};
  ['cumple','nc','parcial','na'].forEach(a=>{
    const btn=document.getElementById(`ae-btn-${phaseIdx}-${itemIdx}-${a}`);
    if(btn){
      btn.style.background=a===ans?colors[a]+'44':'transparent';
      btn.style.borderColor=a===ans?colors[a]:colors[a]+'33';
      btn.style.fontWeight=a===ans?'800':'600';
    }
  });
}

function aeNextPhase(idx){
  // Save implied answers (unanswered = treated as not evaluated)
  aeRenderPhase(idx+1);
}

function aePrintReport(){
  const snap=JSON.parse(localStorage.getItem('normalis_last_ae')||'{}');
  const cfg=JSON.parse(localStorage.getItem('normalis_cfg')||'{}');
  const w=window.open('','_blank');
  w.document.write(`<html><head><title>Acta de Visita</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{color:#1e293b}table{width:100%;border-collapse:collapse}td,th{padding:8px 12px;border:1px solid #e2e8f0;font-size:12px}.critica{color:#ef4444;font-weight:700}.moderada{color:#d97706;font-weight:700}.ok{color:#16a34a;font-weight:700}
/* ── Firebase Auth Screen ── */
#auth-screen{
  position:fixed;inset:0;z-index:9999;
  background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%);
  display:flex;align-items:center;justify-content:center;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
.auth-card{
  background:rgba(30,41,59,.95);border:1px solid rgba(255,255,255,.1);
  border-radius:20px;padding:40px;width:100%;max-width:400px;
  box-shadow:0 30px 80px rgba(0,0,0,.6);text-align:center;
}
.auth-logo{font-size:28px;font-weight:900;color:#fff;margin-bottom:4px}
.auth-logo span{color:#0ea5e9}
.auth-tagline{font-size:13px;color:#64748b;margin-bottom:32px}
.auth-tabs{display:flex;background:rgba(255,255,255,.05);border-radius:10px;padding:4px;margin-bottom:24px}
.auth-tab{flex:1;padding:8px;border:none;background:none;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;border-radius:7px;transition:.2s}
.auth-tab.active{background:#0ea5e9;color:#fff}
.auth-field{margin-bottom:14px;text-align:left}
.auth-field label{display:block;font-size:11px;font-weight:700;color:#64748b;margin-bottom:5px}
.auth-field input{
  width:100%;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);
  color:#e2e8f0;padding:11px 14px;border-radius:9px;font-size:14px;outline:none;
  transition:border-color .2s;font-family:inherit;box-sizing:border-box;
}
.auth-field input:focus{border-color:#0ea5e9}
.auth-field input::placeholder{color:#475569}
.auth-btn{
  width:100%;background:#0ea5e9;color:#fff;border:none;padding:13px;
  border-radius:9px;font-size:14px;font-weight:700;cursor:pointer;margin-top:6px;
  transition:background .2s;
}
.auth-btn:hover{background:#0284c7}
.auth-btn:disabled{background:#334155;cursor:not-allowed}
.auth-divider{display:flex;align-items:center;gap:12px;margin:16px 0;color:#475569;font-size:12px}
.auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.08)}
.auth-google{
  width:100%;background:rgba(255,255,255,.06);color:#e2e8f0;border:1.5px solid rgba(255,255,255,.12);
  padding:12px;border-radius:9px;font-size:14px;font-weight:600;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:10px;transition:.2s;
}
.auth-google:hover{background:rgba(255,255,255,.1)}
.auth-google svg{width:18px;height:18px}
.auth-msg{font-size:12px;margin-top:12px;min-height:18px}
.auth-msg.error{color:#ef4444}
.auth-msg.success{color:#10b981}
.auth-footer{font-size:11px;color:#475569;margin-top:20px}
.auth-loading{opacity:.6;pointer-events:none}

</style></head><body>
  <h2>Acta de Visita de Verificación de Habilitación</h2>
  <p><strong>Establecimiento:</strong> ${cfg.nombre||'Sin nombre'} &nbsp;&nbsp; <strong>NIT:</strong> ${cfg.nit||'N/A'}</p>
  <p><strong>Servicio auditado:</strong> ${snap.service||'general'} &nbsp;&nbsp; <strong>Fecha:</strong> ${snap.date?new Date(snap.date).toLocaleDateString('es-CO'):new Date().toLocaleDateString('es-CO')}</p>
  <p><strong>Puntaje de cumplimiento:</strong> ${snap.score||0}% &nbsp;&nbsp; <strong>Resultado:</strong> <span class="${snap.criticas>0?'critica':snap.score>=80?'ok':'moderada'}">${snap.result||''}</span></p>
  <hr>
  <p><strong>No conformidades críticas:</strong> ${snap.criticas||0} &nbsp;&nbsp; <strong>Moderadas:</strong> ${snap.moderadas||0}</p>
  <p style="font-size:11px;color:#64748b;margin-top:32px">Documento generado por NormaLis · Herramienta de habilitación en salud · Colombia</p>
  </body></html>`);
  w.document.close();
  w.print();
}

function aeRenderPhase(idx){
  aePhaseIdx=idx;
  const phase=AE_PHASES[idx];
  const db=AE_DB[aeService]||AE_DB.general;
  const items=db[phase.id]||[];
  const total=AE_PHASES.length;
  const pct=Math.round((idx/total)*100);
  document.getElementById('ae-progress-label').textContent=`${phase.icon} ${phase.label}`;
  document.getElementById('ae-progress-pct').textContent=`Fase ${idx+1} de ${total}`;
  document.getElementById('ae-progress-bar').style.width=pct+'%';
  // update dots
  AE_PHASES.forEach((p,i)=>{
    const d=document.getElementById('ae-dot-'+p.id);
    if(d){
      d.style.background=i<idx?'#22c55e':i===idx?'var(--accent)':'var(--bg-card)';
      d.style.color=i<=idx?'#000':'var(--text-muted)';
    }
  });
  // build checklist
  let html=`<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:14px">${phase.label} — Hallazgos del Inspector</div>`;
  items.forEach((item,i)=>{
    const sev=item.sev;
    const sevColor=sev==='critica'?'#ef4444':sev==='moderada'?'#f59e0b':'#6ee7b7';
    const sevLabel=sev==='critica'?'⛔ CRÍTICA':sev==='moderada'?'⚠️ MODERADA':'ℹ️ MENOR';
    const savedAns=(aeAnswers[phase.id]||[])[i];
    html+=`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px" id="ae-item-${idx}-${i}">
      <div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:10px">
        <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:12px;background:${sevColor}22;color:${sevColor};white-space:nowrap;margin-top:2px">${sevLabel}</span>
        <div>
          <div style="font-size:13px;color:var(--text);line-height:1.5">${item.q}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px">📋 ${item.norm}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${['cumple','nc','parcial','na'].map(ans=>{
          const labels={'cumple':'✅ Cumple','nc':'❌ No Cumple','parcial':'🔶 Parcial','na':'⚪ N/A'};
          const colors={'cumple':'#22c55e','nc':'#ef4444','parcial':'#f59e0b','na':'#6b7280'};
          return `<button onclick="aeSetAnswer(${idx},${i},'${ans}')" id="ae-btn-${idx}-${i}-${ans}"
            style="flex:1;min-width:80px;padding:7px 10px;border-radius:8px;border:1.5px solid ${colors[ans]}33;background:transparent;color:${colors[ans]};font-size:12px;font-weight:600;cursor:pointer;transition:all .2s"
            onmouseover="this.style.background='${colors[ans]}22'" onmouseout="this.style.background='transparent'">
            ${labels[ans]}
          </button>`;
        }).join('')}
      </div>
    </div>`;
  });
  // Nav buttons
  html+=`<div style="display:flex;justify-content:space-between;margin-top:16px">
    ${idx>0?`<button onclick="aeRenderPhase(${idx-1})" style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:10px 20px;color:var(--text);cursor:pointer;font-size:13px">← Anterior</button>`:'<span></span>'}
    ${idx<AE_PHASES.length-1
      ?`<button onclick="aeNextPhase(${idx})" style="background:var(--accent);color:#000;border:none;border-radius:8px;padding:10px 22px;font-weight:700;cursor:pointer;font-size:13px">Siguiente → </button>`
      :`<button onclick="aeFinish()" style="background:#22c55e;color:#000;border:none;border-radius:8px;padding:10px 22px;font-weight:700;cursor:pointer;font-size:13px">📊 Ver Resultado de Visita</button>`
    }
  </div>`;
  document.getElementById('ae-checklist-area').innerHTML=html;
  // restore saved answers
  if(aeAnswers[phase.id]){
    aeAnswers[phase.id].forEach((ans,i)=>{ if(ans) aeHighlightBtn(idx,i,ans); });
  }
}

function aeSetAnswer(phaseIdx,itemIdx,ans){
  const phase=AE_PHASES[phaseIdx];
  if(!aeAnswers[phase.id]) aeAnswers[phase.id]=[];
  aeAnswers[phase.id][itemIdx]=ans;
  aeHighlightBtn(phaseIdx,itemIdx,ans);
}

function aeSetService(val){ aeService=val; }

function aeStartInspection(){
  aePhaseIdx=0; aeAnswers={};
  const db=AE_DB[aeService]||AE_DB.general;
  document.getElementById('ae-progress-wrap').style.display='block';
  document.getElementById('ae-results-area').style.display='none';
  // render phase dots
  const dots=document.getElementById('ae-phase-dots');
  dots.innerHTML=AE_PHASES.map((p,i)=>`<span id="ae-dot-${p.id}" style="font-size:11px;padding:4px 10px;border-radius:20px;background:${i===0?'var(--accent)':'var(--bg-card)'};color:${i===0?'#000':'var(--text-muted)'};">${p.icon} ${p.label.split(' ').slice(1).join(' ')}</span>`).join('');
  aeRenderPhase(0);
}

function loadPamecData(){
  try { return JSON.parse(localStorage.getItem('normalis_pamec')||'{}'); } catch(e){ return {}; }
}

function pamecAEChange(id, val){
  const d = loadPamecData();
  if(!d.autoeval) d.autoeval={};
  d.autoeval[id]=val;
  savePamecData(d);
  pamecRecalcScore();
}

function pamecAgregarAccion(){
  document.getElementById('pamec-accion-form').style.display='';
  ['pa-accion','pa-proceso','pa-responsable','pa-inicio','pa-cierre','pa-indicador','pa-recursos'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
}

function pamecAgregarProceso(){
  document.getElementById('pamec-proceso-form').style.display='';
  ['pp-proceso','pp-area','pp-meta','pp-responsable','pp-norma'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
}

function pamecAvanzarFase() {
  var fase = parseInt(localStorage.getItem('normalis_pamec_fase') || '1');
  if (fase >= 4) return;
  var autoeval = JSON.parse(localStorage.getItem('normalis_pamec_autoeval') || '{}');
  var procesos = JSON.parse(localStorage.getItem('normalis_pamec_procesos') || '[]');
  var acciones = JSON.parse(localStorage.getItem('normalis_pamec_acciones') || '[]');
  var puedeAvanzar = false;
  if (fase === 1) puedeAvanzar = Object.keys(autoeval).length >= 5;
  else if (fase === 2) puedeAvanzar = procesos.length >= 1;
  else if (fase === 3) puedeAvanzar = acciones.length >= 2;
  if (!puedeAvanzar) {
    var mensajes = {1:'Completa al menos 5 ítems de autoevaluación antes de avanzar.',2:'Registra al menos 1 proceso de mejora antes de avanzar.',3:'Registra al menos 2 acciones de mejora antes de avanzar.'};
    alert(mensajes[fase] || 'Completa los criterios de esta fase primero.');
    return;
  }
  localStorage.setItem('normalis_pamec_fase', String(fase + 1));
  if (typeof logAction === 'function') logAction('PAMEC', 'Avance de fase', 'Fase ' + fase + ' → Fase ' + (fase + 1));
  if (typeof trackEvent === 'function') trackEvent('pamec', 'avance_fase', 'fase_' + (fase + 1));
  var guiaContainer = document.getElementById('pamec-guia-container');
  if (guiaContainer) guiaContainer.innerHTML = pamecGuiaFase();
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;z-index:9999;box-shadow:0 4px 16px rgba(16,185,129,.4)';
  toast.textContent = '¡Avanzaste a la Fase ' + (fase + 1) + ' del PAMEC!';
  document.body.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);
}

function pamecCambiarEstado(i, val){
  const d = loadPamecData();
  if(d.acciones && d.acciones[i]){ d.acciones[i].estado=val; savePamecData(d); renderPamecPlan(); }
}

function pamecEliminarAccion(i){
  if(!confirm('¿Eliminar esta acción?')) return;
  const d = loadPamecData();
  d.acciones.splice(i,1);
  savePamecData(d);
  toast('Acción eliminada','info');
  renderPamecPlan();
}

function pamecEliminarProceso(i){
  if(!confirm('¿Eliminar este proceso?')) return;
  const d = loadPamecData();
  d.procesos.splice(i,1);
  savePamecData(d);
  toast('Proceso eliminado','info');
  renderPamecProcesos();
}

function pamecGenerarDoc(){
  const d = loadPamecData();
  const nombre = cfg('nombre','[Nombre del establecimiento]');
  const nit = cfg('nit','[NIT]');
  const municipio = cfg('municipio','[Municipio]');
  const director = cfg('director','[Director Técnico]');
  const fecha = new Date().toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'});
  const autoeval = d.autoeval||{};
  let si=0,parcial=0,no=0,nc=0;
  PAMEC_AUTOEVAL_ITEMS.forEach(i=>{ const v=autoeval[i.id]||'nc'; if(v==='si')si++; else if(v==='parcial')parcial++; else if(v==='no')no++; else nc++; });
  const pct = Math.round(((si + parcial*0.5)/PAMEC_AUTOEVAL_ITEMS.length)*100);
  const nivel = pct>=85?'Avanzado':pct>=60?'En desarrollo':'Inicial';
  const ps = d.procesos||[];
  const as = d.acciones||[];
  const fa = d.faseActual||0;
  const preview = document.getElementById('pamec-doc-preview');
  if(!preview) return;
  preview.innerHTML = `
    <div style="max-width:800px;margin:0 auto;font-family:Arial,sans-serif;font-size:12px;color:#222;line-height:1.7">
      <!-- Encabezado -->
      <div style="text-align:center;border-bottom:3px solid #1a5276;padding-bottom:16px;margin-bottom:20px">
        <div style="font-size:10px;font-weight:700;color:#7f8c8d;letter-spacing:2px">REPÚBLICA DE COLOMBIA</div>
        <div style="font-size:10px;font-weight:700;color:#7f8c8d;margin-bottom:8px">MINISTERIO DE SALUD Y PROTECCIÓN SOCIAL</div>
        <div style="font-size:18px;font-weight:900;color:#1a5276">PAMEC</div>
        <div style="font-size:13px;font-weight:700;color:#1a5276">Programa de Auditoría para el Mejoramiento de la Calidad</div>
        <div style="font-size:11px;color:#555;margin-top:4px">Decreto 1011/2006 · Resolución 1445/2006 · Resolución 256/2016</div>
      </div>

      <!-- Identificación -->
      <div style="background:#f0f4f8;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="font-size:13px;font-weight:800;color:#1a5276;margin-bottom:10px">I. IDENTIFICACIÓN DEL PRESTADOR</div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:4px;font-weight:700;width:40%">Razón social / Nombre:</td><td style="padding:4px">${nombre}</td></tr>
          <tr><td style="padding:4px;font-weight:700">NIT:</td><td style="padding:4px">${nit}</td></tr>
          <tr><td style="padding:4px;font-weight:700">Municipio:</td><td style="padding:4px">${municipio}</td></tr>
          <tr><td style="padding:4px;font-weight:700">Director Técnico:</td><td style="padding:4px">${director}</td></tr>
          <tr><td style="padding:4px;font-weight:700">Fecha de elaboración:</td><td style="padding:4px">${fecha}</td></tr>
          <tr><td style="padding:4px;font-weight:700">Inicio del ciclo PAMEC:</td><td style="padding:4px">${d.fechaInicio||'[Fecha de inicio]'}</td></tr>
          <tr><td style="padding:4px;font-weight:700">Fase actual del ciclo:</td><td style="padding:4px">${fa>=PAMEC_FASES.length?'Ciclo completo':PAMEC_FASES[fa]?.titulo||'—'} (${fa}/${PAMEC_FASES.length})</td></tr>
        </table>
      </div>

      <!-- Autoevaluación -->
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:800;color:#1a5276;margin-bottom:10px;border-bottom:2px solid #1a5276;padding-bottom:6px">II. RESULTADO DE AUTOEVALUACIÓN PAMEC</div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:12px">
          <div style="text-align:center;padding:12px;border:2px solid #1a5276;border-radius:8px;min-width:120px">
            <div style="font-size:28px;font-weight:900;color:#1a5276">${pct}%</div>
            <div style="font-size:11px;font-weight:700">Madurez PAMEC</div>
            <div style="font-size:10px;color:#555">Nivel: ${nivel}</div>
          </div>
          <div style="flex:1;min-width:200px">
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              <tr><td style="padding:4px">✅ Cumple:</td><td style="font-weight:700">${si} ítems</td></tr>
              <tr><td style="padding:4px">⚠️ Cumple parcialmente:</td><td style="font-weight:700">${parcial} ítems</td></tr>
              <tr><td style="padding:4px">❌ No cumple:</td><td style="font-weight:700">${no} ítems</td></tr>
              <tr><td style="padding:4px">○ Sin evaluar:</td><td style="font-weight:700">${nc} ítems</td></tr>
            </table>
          </div>
        </div>
        ${PAMEC_AUTOEVAL_ITEMS.filter(i=>(autoeval[i.id]||'nc')==='no').length?`
        <div style="margin-top:10px">
          <div style="font-size:11px;font-weight:700;margin-bottom:6px;color:#e74c3c">Ítems con hallazgos (No cumple):</div>
          <ul style="margin:0;padding-left:18px">${PAMEC_AUTOEVAL_ITEMS.filter(i=>(autoeval[i.id]||'nc')==='no').map(i=>`<li style="font-size:11px;margin-bottom:3px">${i.texto} <em style="color:#7f8c8d">(${i.norma})</em></li>`).join('')}</ul>
        </div>`:''}
      </div>

      <!-- Procesos priorizados -->
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:800;color:#1a5276;margin-bottom:10px;border-bottom:2px solid #1a5276;padding-bottom:6px">III. PROCESOS PRIORIZADOS PARA MEJORAMIENTO</div>
        ${ps.length?`<table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:#1a5276;color:#fff">
            <th style="padding:8px;text-align:left">Proceso / Problema</th>
            <th style="padding:8px;text-align:left">Área</th>
            <th style="padding:8px;text-align:left">Prioridad</th>
            <th style="padding:8px;text-align:left">Meta</th>
            <th style="padding:8px;text-align:left">Responsable</th>
          </tr></thead>
          <tbody>${ps.map((p,i)=>`<tr style="background:${i%2?'#f8f9fa':'#fff'};border-bottom:1px solid #dee2e6">
            <td style="padding:8px;font-weight:600">${p.proceso}</td>
            <td style="padding:8px">${p.area}</td>
            <td style="padding:8px">${p.prioridad.toUpperCase()}</td>
            <td style="padding:8px">${p.meta}</td>
            <td style="padding:8px">${p.responsable}</td>
          </tr>`).join('')}</tbody>
        </table>`:'<div style="color:#7f8c8d;font-style:italic">No se han registrado procesos priorizados.</div>'}
      </div>

      <!-- Plan de mejoramiento -->
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:800;color:#1a5276;margin-bottom:10px;border-bottom:2px solid #1a5276;padding-bottom:6px">IV. PLAN DE MEJORAMIENTO — ACCIONES</div>
        ${as.length?`<table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:#1a5276;color:#fff">
            <th style="padding:8px;text-align:left">Acción</th>
            <th style="padding:8px;text-align:left">Proceso</th>
            <th style="padding:8px;text-align:left">Responsable</th>
            <th style="padding:8px;text-align:left">Inicio</th>
            <th style="padding:8px;text-align:left">Cierre</th>
            <th style="padding:8px;text-align:left">Indicador</th>
            <th style="padding:8px;text-align:left">Estado</th>
          </tr></thead>
          <tbody>${as.map((a,i)=>`<tr style="background:${i%2?'#f8f9fa':'#fff'};border-bottom:1px solid #dee2e6">
            <td style="padding:8px;font-weight:600">${a.accion}</td>
            <td style="padding:8px">${a.proceso}</td>
            <td style="padding:8px">${a.responsable}</td>
            <td style="padding:8px">${a.inicio||'—'}</td>
            <td style="padding:8px">${a.cierre||'—'}</td>
            <td style="padding:8px">${a.indicador||'—'}</td>
            <td style="padding:8px;font-weight:700;color:${a.estado==='completada'?'green':a.estado==='en_curso'?'#2980b9':a.estado==='cancelada'?'red':'#7f8c8d'}">${a.estado.replace('_',' ').toUpperCase()}</td>
          </tr>`).join('')}</tbody>
        </table>`:'<div style="color:#7f8c8d;font-style:italic">No se han registrado acciones de mejoramiento.</div>'}
      </div>

      <!-- Firmas -->
      <div style="margin-top:30px;page-break-inside:avoid">
        <div style="font-size:13px;font-weight:800;color:#1a5276;margin-bottom:16px;border-bottom:2px solid #1a5276;padding-bottom:6px">V. FIRMAS DE RESPONSABLES</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:20px">
          <div style="text-align:center">
            <div style="border-top:2px solid #222;padding-top:8px;font-size:11px">
              <div style="font-weight:700">${director}</div>
              <div>Director / Representante Legal</div>
            </div>
          </div>
          <div style="text-align:center">
            <div style="border-top:2px solid #222;padding-top:8px;font-size:11px">
              <div style="font-weight:700">Responsable de Calidad</div>
              <div>Auditor Interno / Coordinador PAMEC</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pie de página -->
      <div style="margin-top:30px;padding-top:12px;border-top:1px solid #dee2e6;text-align:center;font-size:10px;color:#7f8c8d">
        Documento generado por NormaLis® — Sistema de Habilitación y Calidad en Salud Colombia · ${fecha}
      </div>
    </div>`;
  toast('📄 Documento PAMEC generado — usa Ctrl+P para imprimir','success');
}

function pamecGuardarAccion(){
  const v = id=>document.getElementById(id)?.value?.trim()||'';
  const accion=v('pa-accion'); if(!accion){ toast('Describe la acción','warn'); return; }
  const d = loadPamecData();
  if(!d.acciones) d.acciones=[];
  d.acciones.push({accion, proceso:v('pa-proceso'), responsable:v('pa-responsable'), inicio:v('pa-inicio'), cierre:v('pa-cierre'), estado:document.getElementById('pa-estado')?.value||'pendiente', indicador:v('pa-indicador'), recursos:v('pa-recursos')});
  savePamecData(d);
  document.getElementById('pamec-accion-form').style.display='none';
  toast('✅ Acción guardada','success');
  renderPamecPlan();
}

function pamecGuardarAutoeval(){
  toast('💾 Autoevaluación PAMEC guardada exitosamente','success');
}

function pamecGuardarProceso(){
  const v = id=>document.getElementById(id)?.value?.trim()||'';
  const proceso=v('pp-proceso'); if(!proceso){ toast('Escribe el nombre del proceso','warn'); return; }
  const d = loadPamecData();
  if(!d.procesos) d.procesos=[];
  d.procesos.push({proceso, area:v('pp-area'), prioridad:document.getElementById('pp-prioridad')?.value||'media', meta:v('pp-meta'), responsable:v('pp-responsable'), norma:v('pp-norma')||'Res. 256/2016 · Res. 1445/2006', fecha:new Date().toISOString().split('T')[0]});
  savePamecData(d);
  document.getElementById('pamec-proceso-form').style.display='none';
  toast('✅ Proceso guardado','success');
  renderPamecProcesos();
}

function pamecGuiaFase() {
  var fase = parseInt(localStorage.getItem('normalis_pamec_fase') || '1');
  var autoeval = JSON.parse(localStorage.getItem('normalis_pamec_autoeval') || '{}');
  var procesos = JSON.parse(localStorage.getItem('normalis_pamec_procesos') || '[]');
  var acciones = JSON.parse(localStorage.getItem('normalis_pamec_acciones') || '[]');

  var fases = [
    {
      num: 1, nombre: 'Autoevaluación',
      descripcion: 'Evalúa el cumplimiento actual de los estándares de calidad.',
      criterio: 'Completa al menos 5 ítems de autoevaluación',
      completado: Object.keys(autoeval).length >= 5,
      progreso: Math.min(100, Math.round(Object.keys(autoeval).length / 5 * 100)),
      accion: 'Ir a autoevaluación', modulo: 'pamec'
    },
    {
      num: 2, nombre: 'Priorización de Procesos',
      descripcion: 'Identifica y prioriza los procesos que requieren mejora.',
      criterio: 'Registra al menos 1 proceso de mejora',
      completado: procesos.length >= 1,
      progreso: Math.min(100, procesos.length * 100),
      accion: 'Registrar proceso', modulo: 'pamec'
    },
    {
      num: 3, nombre: 'Plan de Mejoramiento',
      descripcion: 'Define acciones concretas para corregir las brechas identificadas.',
      criterio: 'Registra al menos 2 acciones de mejora',
      completado: acciones.length >= 2,
      progreso: Math.min(100, Math.round(acciones.length / 2 * 100)),
      accion: 'Registrar acciones', modulo: 'pamec'
    },
    {
      num: 4, nombre: 'Evaluación del Mejoramiento',
      descripcion: 'Verifica el impacto de las acciones ejecutadas y cierra el ciclo.',
      criterio: 'Al menos 1 acción marcada como completada',
      completado: acciones.filter(function(a){return a.estado==='completada';}).length >= 1,
      progreso: Math.min(100, acciones.filter(function(a){return a.estado==='completada';}).length * 100),
      accion: 'Completar acción', modulo: 'pamec'
    }
  ];

  var html = '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-top:16px">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
  html += '<div style="font-weight:700;font-size:15px">Guía del ciclo PAMEC</div>';
  html += '<div style="font-size:12px;color:#64748b">Decreto 1011/2006 — SOGC</div></div>';
  html += '<div style="display:flex;flex-direction:column;gap:12px">';
  fases.forEach(function(f) {
    var esActual = f.num === fase;
    var completada = f.completado;
    var bloqueada = f.num > fase + 1;
    var borderColor = completada ? '#10b981' : esActual ? '#6366f1' : bloqueada ? '#e2e8f0' : '#f59e0b';
    var bgColor = completada ? '#f0fdf4' : esActual ? '#eef2ff' : bloqueada ? '#f8fafc' : '#fffbeb';
    var iconColor = completada ? '#10b981' : esActual ? '#6366f1' : bloqueada ? '#cbd5e1' : '#f59e0b';
    var icon = completada ? '✅' : esActual ? '🔄' : bloqueada ? '🔒' : '⏳';
    html += '<div style="border:2px solid '+borderColor+';background:'+bgColor+';border-radius:10px;padding:14px">';
    html += '<div style="display:flex;align-items:flex-start;gap:12px">';
    html += '<div style="font-size:20px;flex-shrink:0">'+icon+'</div>';
    html += '<div style="flex:1">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">';
    html += '<div style="font-weight:700;font-size:14px;color:'+iconColor+'">Fase '+f.num+': '+f.nombre+'</div>';
    if (esActual && !completada && f.num < 4) {
      html += '<button onclick="pamecAvanzarFase()" style="background:#6366f1;color:#fff;border:none;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">Avanzar a fase '+(f.num+1)+'</button>';
    }
    html += '</div>';
    html += '<div style="font-size:12px;color:#64748b;margin-bottom:8px">'+f.descripcion+'</div>';
    html += '<div style="background:#e2e8f0;border-radius:99px;height:6px;margin-bottom:6px">';
    html += '<div style="background:'+borderColor+';border-radius:99px;height:6px;width:'+f.progreso+'%;transition:width .4s"></div></div>';
    html += '<div style="font-size:11px;color:#64748b">'+f.criterio+' — '+f.progreso+'% completado</div>';
    html += '</div></div></div>';
  });
  html += '</div>';
  html += '<div style="margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">';
  html += 'Decreto 1011/2006 — SOGC · Resolución 256/2016';
  html += '</div></div>';
  return html;
}

function pamecNuevoCiclo(){
  if(!confirm('¿Iniciar un nuevo ciclo PAMEC? El ciclo actual quedará archivado.')) return;
  const d = loadPamecData();
  if(!d.ciclosAnteriores) d.ciclosAnteriores=[];
  d.ciclosAnteriores.push({fasesFinalles:d.faseActual||0, fechaInicio:d.fechaInicio, fechaCierre:new Date().toISOString().split('T')[0]});
  d.faseActual=0;
  d.fechaInicio=new Date().toISOString().split('T')[0];
  savePamecData(d);
  toast('🔁 Nuevo ciclo PAMEC iniciado — '+d.fechaInicio,'success');
  renderPamecCiclo();
}

function pamecRecalcScore(){
  const d = loadPamecData();
  const saved = d.autoeval||{};
  let si=0, parcial=0, no=0, nc=0;
  PAMEC_AUTOEVAL_ITEMS.forEach(i=>{ const v=saved[i.id]||'nc'; if(v==='si')si++; else if(v==='parcial')parcial++; else if(v==='no')no++; else nc++; });
  const total = PAMEC_AUTOEVAL_ITEMS.length;
  const pct = Math.round(((si + parcial*0.5)/total)*100);
  const nivel = pct>=85?{l:'Avanzado',c:'var(--success)'}:pct>=60?{l:'En desarrollo',c:'var(--warning)'}:{l:'Inicial',c:'var(--danger)'};
  const sc = document.getElementById('pamec-autoeval-score');
  if(sc) sc.innerHTML = `<div style="background:${nivel.c}1a;border:1.5px solid ${nivel.c};border-radius:10px;padding:16px">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="text-align:center"><div style="font-size:32px;font-weight:900;color:${nivel.c}">${pct}%</div>
        <div style="font-size:12px;font-weight:700;color:${nivel.c}">${nivel.l}</div></div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:var(--success)">${si}</div><div style="font-size:10px;color:var(--text-muted)">Cumple</div></div>
        <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:var(--warning)">${parcial}</div><div style="font-size:10px;color:var(--text-muted)">Parcial</div></div>
        <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:var(--danger)">${no}</div><div style="font-size:10px;color:var(--text-muted)">No cumple</div></div>
        <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:var(--border)">${nc}</div><div style="font-size:10px;color:var(--text-muted)">Sin evaluar</div></div>
      </div>
      <div style="flex:1;min-width:200px;font-size:11px;color:var(--text-muted)">
        ${pct>=85?'El PAMEC está en nivel avanzado. Mantener y documentar las buenas prácticas.':pct>=60?'El PAMEC está en desarrollo. Reforzar los ítems parciales y sin cumplir.':'El PAMEC requiere atención urgente. Priorizar los ítems no cumplidos en el plan de mejoramiento.'}
      </div>
    </div>
  </div>`;
}

function pamecResetAutoeval(){
  if(!confirm('¿Limpiar toda la autoevaluación?')) return;
  const d = loadPamecData();
  d.autoeval={};
  savePamecData(d);
  renderPamecAutoeval();
}

function pamecTab(tab, btn){
  document.querySelectorAll('[id^="pamec-panel-"]').forEach(p=>p.style.display='none');
  const panel = document.getElementById('pamec-panel-'+tab);
  if(panel) panel.style.display='';
  document.querySelectorAll('.pamec-tab-btn').forEach(b=>{
    b.className=b.className.replace('btn-primary','btn-outline');
    if(b===btn){ b.className=b.className.replace('btn-outline','btn-primary'); }
  });
  if(tab==='ciclo') renderPamecCiclo();
  if(tab==='autoeval') renderPamecAutoeval();
  if(tab==='procesos') renderPamecProcesos();
  if(tab==='plan') renderPamecPlan();
}

function savePamecData(d){ localStorage.setItem('normalis_pamec', JSON.stringify(d)); setTimeout(syncToFirestore,800); }

// END:normalis-pamec.js — NormaLis integrity seal