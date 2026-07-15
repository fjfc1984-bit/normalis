// normalis-utils.js
// NormaLis — módulo extraído del inline script de normativa-app-v2.html
// ─────────────────────────────────────────────

function toast(msg,type='info'){
  const t=document.createElement('div');
  t.className='toast toast-'+type;
  t.textContent=msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},3200);
}

function shadeColor(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + pct * 2.55 | 0));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + pct * 2.55 | 0));
  const b = Math.min(255, Math.max(0, (n & 0xff) + pct * 2.55 | 0));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function getDaysUntil(dateStr){
  if(!dateStr) return 999;
  const d=new Date(dateStr); const now=new Date();
  return Math.ceil((d-now)/(1000*60*60*24));
}

function trapFocus(overlayId){
  const el = document.getElementById(overlayId);
  if(!el) return;
  const focusable = el.querySelectorAll(
    'button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])');
  const first = focusable[0], last = focusable[focusable.length-1];
  if(!first) return;
  first.focus();
  el._trapHandler = function(e){
    if(e.key!=='Tab') return;
    if(e.shiftKey){ if(document.activeElement===first){ e.preventDefault(); last.focus(); } }
    else { if(document.activeElement===last){ e.preventDefault(); first.focus(); } }
  };
  el.addEventListener('keydown', el._trapHandler);
}

function releaseFocus(overlayId){
  const el = document.getElementById(overlayId);
  if(el && el._trapHandler){ el.removeEventListener('keydown', el._trapHandler); el._trapHandler=null; }
}

function setOnlineUI(state) {
  const pill = document.getElementById('online-pill');
  const lbl  = document.getElementById('online-label');
  if (!pill || !lbl) return;
  pill.className = 'online-pill' + (state === 'offline' ? ' offline' : '');
  lbl.textContent = state === 'online' ? 'Conectado' : 'Sin conexión';
}

function pickColor(el) {
  document.querySelectorAll('.setup-color-swatch').forEach(s => s.classList.remove('sel'));
  el.classList.add('sel');
  _setupColor = el.dataset.c;
}

function pushNotification(title, body){
  if('Notification' in window && Notification.permission==='granted'){
    new Notification('NormaLis · '+title,{body});
  }
}

function requestBrowserNotifications(){
  if(!('Notification' in window)){toast('Tu navegador no soporta notificaciones','warning');return;}
  Notification.requestPermission().then(p=>{
    if(p==='granted'){
      new Notification('NormaLis ⚡',{body:'Notificaciones activadas. Te avisaremos sobre vencimientos importantes.',icon:''});
      setRuleActive('notify_browser',true);
      const card=document.getElementById('aut-notif-card'); if(card) card.style.display='none';
      toast('✅ Notificaciones del navegador activadas','success');
    } else {
      toast('Permisos denegados. Actívalos desde la configuración del navegador','warning');
    }
  });
}

function getLastRunText(ruleId){
  const ev=_autoEvents.find(e=>e.ruleId===ruleId);
  if(!ev) return 'Sin ejecuciones registradas';
  const dt=new Date(ev.ts);
  const diff=Math.floor((Date.now()-dt)/60000);
  if(diff<60) return 'Última ejecución: hace '+diff+' min';
  if(diff<1440) return 'Última ejecución: hace '+Math.floor(diff/60)+'h';
  return 'Última ejecución: '+dt.toLocaleDateString('es-CO');
}

function fmt(n){return new Intl.NumberFormat('es-CO').format(Math.round(n));}

function mostrarInfoBackup(){
  const el = document.getElementById('backup-info');
  if(el) el.style.display = el.style.display==='none'?'':'none';
}

// END:normalis-utils.js — NormaLis integrity seal