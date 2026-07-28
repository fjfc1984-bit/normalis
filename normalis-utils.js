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

/**
 * nlConfirm — reemplaza confirm() nativo con modal custom.
 * Funciona correctamente en móvil donde confirm() puede bloquearse.
 * @param {string} msg - Mensaje a mostrar
 * @param {string} [okLabel='Confirmar'] - Texto del botón de confirmación
 * @param {string} [okColor='#00796B'] - Color del botón OK (rojo para acciones destructivas)
 * @returns {Promise<boolean>}
 */
function nlConfirm(msg, okLabel, okColor) {
  okLabel = okLabel || 'Confirmar';
  okColor = okColor || '#00796B';
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999997;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML =
      '<div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px 24px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.6)">' +
        '<p style="color:#e2e8f0;font-size:15px;margin:0 0 24px;line-height:1.6">' + msg + '</p>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end">' +
          '<button id="_nlc_cancel" style="background:transparent;border:1px solid #475569;color:#94a3b8;padding:9px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500">Cancelar</button>' +
          '<button id="_nlc_ok" style="background:' + okColor + ';border:none;color:#fff;padding:9px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">' + okLabel + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    function close(val) { if(overlay.parentNode) document.body.removeChild(overlay); resolve(val); }
    overlay.querySelector('#_nlc_ok').onclick = function() { close(true); };
    overlay.querySelector('#_nlc_cancel').onclick = function() { close(false); };
    overlay.addEventListener('click', function(e) { if(e.target === overlay) close(false); });
    overlay.addEventListener('keydown', function(e) { if(e.key==='Escape') close(false); if(e.key==='Enter') close(true); });
    setTimeout(function() { var btn = overlay.querySelector('#_nlc_ok'); if(btn) btn.focus(); }, 50);
  });
}

/**
 * nlToast — sistema de notificaciones apilables (nueva generación)
 * Usa #toast-container con clase .nl-toast (definida en normalis-styles.css)
 * Fallback automático a toast() si no existe el contenedor nuevo
 * @param {string} msg
 * @param {'success'|'warning'|'error'|'info'} type
 * @param {number} duration — ms, default 3400
 */
function nlToast(msg, type, duration) {
  type = type || 'info';
  duration = duration || 3400;

  // Ícono por tipo
  var icons = { success: '✅', warning: '&#9888;', error: '❌', info: 'ℹ️' };

  var container = document.getElementById('toast-container');
  if (!container) {
    // Fallback al sistema antiguo
    if (typeof toast === 'function') { toast(msg, type); return; }
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none';
    document.body.appendChild(container);
  }

  var el = document.createElement('div');
  el.className = 'nl-toast ' + type;
  el.innerHTML =
    '<span class="nl-toast-icon">' + (icons[type] || 'ℹ️') + '</span>' +
    '<span class="nl-toast-msg">' + msg + '</span>';
  container.appendChild(el);

  // Auto-dismiss
  setTimeout(function() {
    el.classList.add('out');
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 280);
  }, duration);
}

/**
 * nlPrompt — reemplaza prompt() nativo (bloqueante en móvil)
 * @param {string} title
 * @param {string} placeholder
 * @param {string} [defaultVal]
 * @returns {Promise<string|null>}
 */
function nlPrompt(title, placeholder, defaultVal) {
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML =
      '<div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;max-width:400px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.6)">' +
        '<p style="color:#e2e8f0;font-size:15px;font-weight:600;margin:0 0 14px">' + (title||'Ingresa un valor') + '</p>' +
        '<input id="_nlp_input" type="text" placeholder="' + (placeholder||'') + '" value="' + (defaultVal||'') + '" style="width:100%;background:rgba(255,255,255,.08);border:1.5px solid #475569;border-radius:10px;padding:11px 14px;font-size:14px;color:#f1f5f9;outline:none;font-family:inherit;margin-bottom:16px">' +
        '<div style="display:flex;gap:10px;justify-content:flex-end">' +
          '<button id="_nlp_cancel" style="background:transparent;border:1px solid #475569;color:#94a3b8;padding:9px 20px;border-radius:8px;cursor:pointer;font-size:13px">Cancelar</button>' +
          '<button id="_nlp_ok" style="background:#00796B;border:none;color:#fff;padding:9px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">Aceptar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    var input = overlay.querySelector('#_nlp_input');
    function close(val) { if(overlay.parentNode) document.body.removeChild(overlay); resolve(val); }
    overlay.querySelector('#_nlp_ok').onclick   = function() { close(input.value || null); };
    overlay.querySelector('#_nlp_cancel').onclick = function() { close(null); };
    overlay.addEventListener('click', function(e) { if(e.target===overlay) close(null); });
    input.addEventListener('keydown', function(e) {
      if(e.key==='Enter') close(input.value||null);
      if(e.key==='Escape') close(null);
    });
    setTimeout(function(){ input.focus(); input.select(); }, 50);
  });
}

/**
 * sanitizeHTML(str) — elimina scripts y on* handlers de HTML antes de
 * insertarlo con innerHTML. Para texto plano, usar escH() en su lugar.
 * @param {string} str
 * @returns {string}
 */
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on[a-z]+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on[a-z]+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:/gi, '');
}

// END:normalis-utils.js — NormaLis integrity seal