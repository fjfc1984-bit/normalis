// normalis-data-audit.js
// NormaLis — Datos de auditoría: areasDB + funciones de render de auditoría
// Extraído de normativa-app-v2.html para mantenimiento modular
// Para actualizar preguntas: editar SOLO este archivo
// ─────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════
// AUDITORÍA POR ÁREAS
// ═══════════════════════════════════════════
// ═══ ÁREAS POR SEGMENTO ═══

var areasDB = {};  // cargado dinámicamente desde Worker (auth-gated)

var segInfo = {
  general:{norm:'📋 Normativa: Res. 3100/2019 + modificaciones (2215/2020, 1317/2021, 1138/2022, 544/2023)',areas:'8 estándares del Manual de Habilitación'},
  domiciliaria:{norm:'📋 Normativa: Decreto 780/2016 · Res. 3100/2019 · Servicios domiciliarios',areas:'7 áreas operativas'},
  urgencias:{norm:'📋 Normativa: Res. 3100/2019 · Urgencias · Triage 5 niveles · CRUE',areas:'6 áreas de urgencias'},
  internacion:{norm:'📋 Normativa: Res. 3100/2019 · Internación · IAAS · Res. 256/2016',areas:'6 áreas de hospitalización'},
  quirurgicos:{norm:'📋 Normativa: Res. 3100/2019 · Quirúrgicos · OMS Lista Chequeo · Est. 5',areas:'6 áreas quirúrgicas'},
  laboratorio:{norm:'📋 Normativa: Res. 3100/2019 · PEEC MinSalud · Decreto 4725/2005',areas:'6 áreas de laboratorio'},
  transporte:{norm:'📋 Normativa: Res. 3100/2019 · Dec. 2309/2002 · Ministerio de Transporte',areas:'5 áreas de transporte'},
  rehabilitacion:{norm:'📋 Normativa: Res. 3100/2019 · Est. 1,2,5,6 · Rehabilitación · Decreto 4725',areas:'5 áreas de rehabilitación'},
  salud_mental:{norm:'📋 Normativa: Ley 1616/2013 · Res. 3100/2019 · Derechos del paciente mental',areas:'6 áreas de salud mental'},
  odontologia:{norm:'📋 Normativa: Res. 3100/2019 · Est. 5 Esterilización · Decreto 351/2014',areas:'5 áreas odontológicas'},
  imagenologia:{norm:'📋 Normativa: Res. 4445/1996 · Res. 9031/1990 · Decreto 4725/2005',areas:'7 áreas radiológicas'},
};

let segActivo='general';
let areas=areasDB.general;

function selSeg(seg){
  segActivo=seg;
  areas=areasDB[seg];
  ['general', 'domiciliaria', 'imagenologia', 'calidad', 'urgencias', 'internacion', 'quirurgicos', 'laboratorio', 'transporte', 'rehabilitacion', 'salud_mental', 'odontologia'].forEach(s=>{
    document.getElementById('aseg-'+s).classList.toggle('sel',s===seg);
    document.getElementById('aschk-'+s).style.display=s===seg?'flex':'none';
  });
  const info=segInfo[seg];
  document.getElementById('audit-seg-norm').textContent=info.norm;
  document.getElementById('aud-info-areas').textContent=info.areas;
}

let curArea=0,curQ=0,auditAnswers={};
let flatQ=[];

function startAudit(){
  areas=areasDB[segActivo];
  auditAnswers={};
  _qIdx=0;
  document.getElementById('audit-intro-panel').style.display='none';
  document.getElementById('audit-flow').style.display='block';
  // Inject segment badge into flow header
  const segLabels={general:'🏥 Establecimiento General',domiciliaria:'🏠 Salud Domiciliaria',imagenologia:'🩻 Imagenología',calidad:'🏅 Calidad en Salud',urgencias:'🚨 Urgencias',internacion:'🛏️ Internación',quirurgicos:'🔪 Quirúrgicos',laboratorio:'🔬 Laboratorio Clínico',transporte:'🚑 Transporte Asistencial',rehabilitacion:'♿ Rehabilitación',salud_mental:'🧠 Salud Mental',odontologia:'🦷 Odontología'};
  let badge=document.getElementById('audit-seg-badge');
  if(!badge){
    badge=document.createElement('div');
    badge.id='audit-seg-badge';
    badge.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:12px';
    document.getElementById('audit-flow').prepend(badge);
  }
  badge.innerHTML=`<span class="badge b-blue" style="font-size:12px;padding:6px 14px">${segLabels[segActivo]}</span>
    <button class="btn btn-outline btn-sm" onclick="resetAudit()">← Cambiar segmento</button>`;
  flatQ=[];
  areas.forEach(a=>a.q.forEach((q,qi)=>flatQ.push({areaId:a.id,areaName:a.name,icon:a.icon,norm:a.norm||'Res. 3100/2019',q,qi})));
  renderAreaCards();
  renderAuditQ(0);
  renderAuditProg();
}
function resetAudit(){
  document.getElementById('audit-intro-panel').style.display='block';
  document.getElementById('audit-flow').style.display='none';
  auditAnswers={};_qIdx=0;flatQ=[];
}

function renderAreaCards(){
  const container=document.getElementById('area-cards');
  container.innerHTML=areas.map((a,i)=>{
    const done=flatQ.filter(q=>q.areaId===a.id).every(q=>auditAnswers['q'+flatQ.indexOf(q)]!==undefined);
    const cls=done?'area-card done':(i===getAreaIdx(curQIdx())?'area-card active-area':'area-card');
    return`<div class="${cls}"><div class="area-icon">${a.icon}</div><div class="area-name">${a.name}</div><div class="area-status">${done?'<span class="badge b-green">✓ Listo</span>':'<span class="badge b-gray">Pendiente</span>'}</div></div>`;
  }).join('');
}

function curQIdx(){return parseInt(document.getElementById('aud-next')?._qIdx||0)}
function getAreaIdx(qi){const a=flatQ[qi];return areas.findIndex(x=>x.id===a?.areaId)}

let _qIdx=0;

function renderAuditQ(idx){
  _qIdx=idx;
  const q=flatQ[idx];
  if(!q)return;
  const panel=document.getElementById('audit-q-panel');
  const ansKey='q'+idx;
  const cur=auditAnswers[ansKey];
  panel.innerHTML=`
    <div class="audit-q-num">${q.icon} ${q.areaName} · Pregunta ${q.qi+1} de ${areas.find(a=>a.id===q.areaId).q.length}</div>
    <div class="audit-q-text">${q.q}</div>
    <div class="audit-q-norm text-xs text-muted" style="margin-bottom:14px">📋 Criterio de habilitación · ${q.norm||'Res. 3100/2019'}</div>
    <div class="audit-opts">
      <div class="aopt ${cur==='si'?'y':''}" onclick="setAns(this,'si','${ansKey}')">✅ Cumple completamente</div>
      <div class="aopt ${cur==='parcial'?'p':''}" onclick="setAns(this,'parcial','${ansKey}')">⚠️ Cumple parcialmente</div>
      <div class="aopt ${cur==='no'?'n':''}" onclick="setAns(this,'no','${ansKey}')">❌ No cumple</div>
    </div>
    <div class="photo-upload" onclick="toast('📸 Adjunta la foto como evidencia en el informe PDF','info')">
      <div style="font-size:20px;margin-bottom:4px">📸</div>
      <div class="text-xs text-muted">Toca para adjuntar foto como evidencia (opcional)</div>
    </div>`;
  document.getElementById('aud-prev').disabled=idx===0;
  document.getElementById('aud-next').disabled=!cur;
  document.getElementById('aud-next').textContent=idx===flatQ.length-1?'Ver resultados →':'Siguiente →';
  renderAreaCards();
  renderAuditProg();
}

function setAns(el,val,key){
  auditAnswers[key]=val;
  el.closest('.audit-opts').querySelectorAll('.aopt').forEach(o=>o.className='aopt');
  el.classList.add(val==='si'?'y':val==='parcial'?'p':'n');
  document.getElementById('aud-next').disabled=false;
}

function auditNext(){
  if(_qIdx===flatQ.length-1){nav('resultados');setTimeout(renderResultadosDynamic,100);setTimeout(function(){if(typeof logAuditCompleted==='function')logAuditCompleted();if(typeof saveAuditSnapshot==='function')saveAuditSnapshot();if(typeof runPostAuditAutomations==='function')setTimeout(runPostAuditAutomations,500);},300);showAchieve('🔍','Auditoría Completada','¡Has completado el recorrido completo por tu establecimiento!');return;}
  renderAuditQ(_qIdx+1);
}
function auditPrev(){if(_qIdx>0)renderAuditQ(_qIdx-1);}

function renderAuditProg(){
  const container=document.getElementById('audit-prog-rows');
  container.innerHTML=areas.map(a=>{
    const aqs=flatQ.filter(q=>q.areaId===a.id);
    const answered=aqs.filter(q=>auditAnswers['q'+flatQ.indexOf(q)]!==undefined).length;
    const pct=aqs.length?Math.round(answered/aqs.length*100):0;
    return`<div class="apt-row">${a.icon} <span style="width:100px;flex-shrink:0">${a.name}</span><div class="apt-bar"><div class="apt-fill" style="width:${pct}%"></div></div><span class="text-xs text-muted" style="width:32px;text-align:right">${answered}/${aqs.length}</span></div>`;
  }).join('');
}



// ═══════════════════════════════════════════════════════════════
// loadAreasDB() — carga areasDB desde el Worker (requiere auth)
// Llamar después de Firebase auth exitosa. Popula window.areasDB.
// ═══════════════════════════════════════════════════════════════
async function loadAreasDB() {
  try {
    const user = typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser;
    if (!user) { console.warn('[NormaLis] loadAreasDB: sin usuario auth'); return; }
    const token = await user.getIdToken();
    const res = await fetch('https://normalis.fjfc1984.workers.dev/api/areas', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) { console.error('[NormaLis] loadAreasDB: error', res.status); return; }
    const data = await res.json();
    if (data.areasDB) {
      // Poblar la variable global que usan las funciones de auditoría
      Object.assign(areasDB, data.areasDB);
      if (data.segInfo) Object.assign(segInfo, data.segInfo);
      // Actualizar la lista activa
      if (typeof segActivo !== 'undefined' && areasDB[segActivo]) {
        areas = areasDB[segActivo];
      }
      console.log('[NormaLis] areasDB cargado —', Object.keys(areasDB).length, 'segmentos');
    }
  } catch (e) {
    console.error('[NormaLis] loadAreasDB error:', e);
  }
}

// END:normalis-data-audit.js — NormaLis integrity seal
