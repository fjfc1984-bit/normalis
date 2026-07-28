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

// ── Fallback mínimo — activa si el Worker /api/areas no responde ─
// Cubre Estándar 1 (Talento Humano) y Estándar 3 (Infraestructura) de
// Res. 3100/2019 para el segmento General. Suficiente para demostrar
// la funcionalidad de auditoría sin dependencia del Worker.
var _areasDBFallback = {
  general: [
    { id:'th', name:'Talento Humano', icon:'👥', norm:'Res. 3100/2019 · Est. 1', q:[
      'El personal asistencial cuenta con tarjeta profesional vigente registrada en RETHUS',
      'Se verifica la idoneidad del personal antes de la contratación (títulos, certificados)',
      'Existen perfiles de cargo documentados para cada rol asistencial',
      'El personal conoce los protocolos de seguridad del paciente aplicables a su cargo',
      'Se realizan inducciones y reinducciones al personal asistencial documentadas'
    ]},
    { id:'inf', name:'Infraestructura', icon:'🏥', norm:'Res. 3100/2019 · Est. 3', q:[
      'Las áreas de atención cumplen las dimensiones mínimas establecidas en el Manual',
      'Se cuenta con señalización de rutas de evacuación y salidas de emergencia vigente',
      'Los baños cuentan con dotación completa y están en condiciones de aseo',
      'Existe área diferenciada para manejo de residuos hospitalarios',
      'La planta física está libre de barreras arquitectónicas para personas con discapacidad'
    ]},
    { id:'dt', name:'Dotación y Mantenimiento', icon:'🔧', norm:'Res. 3100/2019 · Est. 4', q:[
      'Los equipos biomédicos cuentan con hojas de vida y cronograma de mantenimiento preventivo',
      'Se realiza calibración de equipos de medición según cronograma documentado',
      'Existe inventario actualizado de dispositivos médicos con fechas de vida útil',
      'Los medicamentos e insumos están almacenados en condiciones de temperatura y humedad adecuadas',
      'Se verifica la vigencia de insumos y medicamentos antes de su utilización'
    ]},
    { id:'mi', name:'Medicamentos e Insumos', icon:'💊', norm:'Res. 3100/2019 · Est. 5', q:[
      'Existe un procedimiento documentado para el manejo y dispensación de medicamentos',
      'Se cuenta con botiquín de urgencias con listado de contenido y fechas de vencimiento',
      'Los medicamentos de control especial tienen registro de entradas y salidas',
      'Se realizan devoluciones de medicamentos vencidos al proveedor',
      'El personal conoce el procedimiento de farmacovigilancia y reporte de eventos adversos'
    ]},
    { id:'pi', name:'Procesos Prioritarios', icon:'📋', norm:'Res. 3100/2019 · Est. 6', q:[
      'Existe política de seguridad del paciente documentada y socializada al personal',
      'Se implementan los protocolos de London para análisis de eventos adversos',
      'El servicio cuenta con protocolo de higiene de manos visible y socializado',
      'Se realiza identificación correcta del paciente en cada procedimiento',
      'Existe protocolo de prevención de caídas y úlceras por presión documentado'
    ]},
    { id:'hc', name:'Historia Clínica y Registros', icon:'📄', norm:'Res. 3100/2019 · Est. 7', q:[
      'Las historias clínicas cumplen los requisitos del Artículo 15 de la Resolución 1995/1999',
      'Se garantiza la confidencialidad y custodia adecuada de las historias clínicas',
      'Los registros clínicos están debidamente diligenciados, fechados y firmados',
      'Existe procedimiento para el manejo de historias clínicas en soporte electrónico',
      'El tiempo de conservación de las historias cumple los mínimos legales (15 años)'
    ]},
    { id:'ia', name:'Interdependencia', icon:'🔗', norm:'Res. 3100/2019 · Est. 8', q:[
      'Existen contratos vigentes con los servicios de apoyo requeridos (laboratorio, imágenes)',
      'Los servicios referenciados y contrareferenciados cuentan con protocolos documentados',
      'Se cuenta con acuerdo de voluntades con transporte asistencial básico',
      'Existe directorio de IPS de referencia actualizado y conocido por el personal',
      'El proceso de referencia y contrarreferencia es monitoreado y evaluado periódicamente'
    ]},
    { id:'adm', name:'Capacidad Técnico-Administrativa', icon:'⚙️', norm:'Res. 3100/2019 · Art. 3', q:[
      'El prestador está inscrito en REPS con todos sus servicios habilitados vigentes',
      'Se tiene definida la política de calidad del servicio y está publicada',
      'El responsable del sistema de habilitación está formalmente designado',
      'Existe cronograma de autoevaluación anual documentado y ejecutado',
      'Los indicadores de calidad obligatorios (Res. 256/2016) están siendo monitoreados'
    ]}
  ]
};

// Activar fallback si areasDB no carga después de 8 segundos (Worker no disponible)
setTimeout(function(){
  if(typeof areasDB.general === 'undefined' || !areasDB.general || areasDB.general.length === 0){
    Object.assign(areasDB, _areasDBFallback);
    if(typeof areas !== 'undefined' && typeof segActivo !== 'undefined'){
      areas = areasDB[segActivo] || areasDB.general;
    }
    console.warn('[NormaLis] areasDB: usando fallback local (Worker no disponible)');
    if(typeof toast === 'function') toast('Modo offline: preguntas básicas de Res. 3100/2019','info');
  }
}, 8000);

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
    <div class="photo-upload" id="ev-btn-${ansKey}" onclick="uploadEvidencia('${ansKey}')" role="button" aria-label="Subir evidencia fotográfica para este criterio" style="cursor:pointer">
      <div style="font-size:20px;margin-bottom:4px" id="ev-icon-${ansKey}">📸</div>
      <div class="text-xs text-muted" id="ev-label-${ansKey}">Toca para subir evidencia fotográfica (opcional)</div>
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

// ── Evidencias fotográficas por criterio ────────────────────────
var EVID_KEY = 'normalis_evidencias';
function loadEvidencias(){ try{ return JSON.parse(localStorage.getItem(EVID_KEY)||'{}'); }catch(e){ return {}; } }
function saveEvidencias(obj){ localStorage.setItem(EVID_KEY, JSON.stringify(obj)); }

function uploadEvidencia(ansKey){
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.setAttribute('aria-label','Seleccionar foto de evidencia');
  input.onchange = function(){
    var file = input.files[0];
    if(!file) return;
    if(file.size > 5 * 1024 * 1024){ toast('La imagen supera 5MB. Usa una foto más pequeña.','warn'); return; }
    var btn = document.getElementById('ev-btn-'+ansKey);
    var iconEl = document.getElementById('ev-icon-'+ansKey);
    var labelEl = document.getElementById('ev-label-'+ansKey);
    if(iconEl) iconEl.textContent = '⏳';
    if(labelEl) labelEl.textContent = 'Subiendo evidencia...';

    // Intentar Firebase Storage
    var uid = sessionStorage.getItem('normalis_uid');
    var storage = null;
    try { storage = firebase.storage(); } catch(e) {}

    if(storage && uid){
      var path = 'evidencias/'+uid+'/'+ansKey+'/'+Date.now()+'_'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      var ref = storage.ref(path);
      ref.put(file)
        .then(function(snap){ return snap.ref.getDownloadURL(); })
        .then(function(url){
          _guardarEvidenciaLocal(ansKey, url, file.name);
          _actualizarEvidenciaUI(ansKey, url);
          toast('📸 Evidencia guardada correctamente','success');
        })
        .catch(function(err){
          console.error('[NormaLis] Storage error:', err);
          if(typeof NormalisAutofix !== 'undefined') NormalisAutofix.report('evidencia-upload', err, { ansKey: ansKey });
          // Fallback: guardar como ObjectURL local (solo sesión actual)
          var localUrl = URL.createObjectURL(file);
          _actualizarEvidenciaUI(ansKey, localUrl);
          toast('📸 Evidencia guardada localmente (sin conexión)','info');
        });
    } else {
      // Sin Firebase Storage — guardar ObjectURL local
      var localUrl = URL.createObjectURL(file);
      _guardarEvidenciaLocal(ansKey, localUrl, file.name);
      _actualizarEvidenciaUI(ansKey, localUrl);
      toast('📸 Evidencia adjunta (disponible en esta sesión)','success');
    }
  };
  input.click();
}

function _guardarEvidenciaLocal(ansKey, url, nombre){
  var evid = loadEvidencias();
  if(!evid[ansKey]) evid[ansKey] = [];
  evid[ansKey].push({ url: url, nombre: nombre, ts: new Date().toISOString() });
  try { saveEvidencias(evid); } catch(e) {}
}

function _actualizarEvidenciaUI(ansKey, url){
  var iconEl = document.getElementById('ev-icon-'+ansKey);
  var labelEl = document.getElementById('ev-label-'+ansKey);
  var btn = document.getElementById('ev-btn-'+ansKey);
  if(iconEl) iconEl.innerHTML = '<img src="'+url+'" alt="Evidencia" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:2px solid #0d9488">';
  if(labelEl){ labelEl.textContent = '✅ Evidencia adjunta'; labelEl.style.color='#0d9488'; }
  if(btn){ btn.title = 'Toca para reemplazar la evidencia'; }
}

// Restablecer badge de evidencia al navegar a una pregunta
var _origRenderAuditQ = window.renderAuditQ;
if(typeof renderAuditQ === 'function'){
  var _audQOrig = renderAuditQ;
  renderAuditQ = function(idx){
    _audQOrig(idx);
    var evid = loadEvidencias();
    var key = 'q'+idx;
    if(evid[key] && evid[key].length > 0){
      setTimeout(function(){ _actualizarEvidenciaUI(key, evid[key][evid[key].length-1].url); }, 50);
    }
  };
}

// END:normalis-data-audit.js — NormaLis integrity seal
