/* ═══════════════════════════════════════════════
   NormaLis — Programa Piloto: banner + guard
   Incluir justo después de <body> en normativa-app-v2.html
   ═══════════════════════════════════════════════ */
(function(){
  'use strict';

  // ── Leer sesión ──
  const uid    = sessionStorage.getItem('normalis_uid');
  const rol    = sessionStorage.getItem('normalis_rol');
  const expires= sessionStorage.getItem('normalis_expires');
  const nombre = sessionStorage.getItem('normalis_nombre') || '';
  const diasRestantes = sessionStorage.getItem('normalis_dias_restantes');

  if (!uid) return; // Sin sesión: no hace nada
  if (rol !== 'piloto') return; // Solo aplica a pilotos

  // ── Inyectar CSS ──
  const style = document.createElement('style');
  style.textContent = `
#normalis-pilot-banner{
  position:fixed;top:0;left:0;right:0;z-index:99999;
  background:linear-gradient(90deg,#f59e0b,#d97706);
  color:#fff;font-size:13px;font-weight:700;
  padding:10px 20px;
  display:flex;align-items:center;justify-content:center;gap:10px;
  box-shadow:0 2px 12px rgba(245,158,11,.4);
  animation:npbSlideDown .4s ease;
}
@keyframes npbSlideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}
#normalis-pilot-banner .npb-days{
  background:rgba(0,0,0,.2);border-radius:999px;
  padding:3px 12px;font-size:12px;
}
#normalis-pilot-banner .npb-close{
  position:absolute;right:16px;cursor:pointer;
  font-size:18px;opacity:.7;line-height:1;
}
#normalis-pilot-banner .npb-close:hover{opacity:1}
body.has-pilot-banner .app,
body.has-pilot-banner .sidebar,
body.has-pilot-banner #topbar { padding-top:40px; }
body.has-pilot-banner .sidebar{ top:40px;height:calc(100vh - 40px); }

#normalis-pilot-expired{
  position:fixed;inset:0;z-index:999999;
  background:linear-gradient(135deg,#0c1628,#0f2d55);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:40px;text-align:center;
}
#normalis-pilot-expired .npe-icon{font-size:64px;margin-bottom:16px}
#normalis-pilot-expired h2{font-size:24px;font-weight:900;color:#fff;margin-bottom:8px}
#normalis-pilot-expired p{font-size:14px;color:#94a3b8;max-width:400px;line-height:1.6;margin-bottom:24px}
#normalis-pilot-expired a.npe-btn{
  background:linear-gradient(135deg,#0ea5e9,#3b82f6);
  color:#fff;border-radius:12px;padding:13px 28px;
  text-decoration:none;font-weight:700;font-size:14px;
  box-shadow:0 4px 20px rgba(14,165,233,.3);
  display:inline-block;
}
#normalis-pilot-expired a.npe-back{
  display:inline-block;margin-top:12px;
  background:transparent;border:1px solid rgba(255,255,255,.2);
  color:#94a3b8;border-radius:12px;padding:10px 24px;
  text-decoration:none;font-size:13px;
}
  `;
  document.head.appendChild(style);

  // ── Verificar expiración ──
  const now = new Date();
  if (expires) {
    const expDate = new Date(expires);
    if (expDate < now) {
      // Acceso vencido → overlay bloqueante
      document.addEventListener('DOMContentLoaded', function() {
        const overlay = document.createElement('div');
        overlay.id = 'normalis-pilot-expired';
        overlay.innerHTML =
          '<div class="npe-icon">🔒</div>' +
          '<h2>Acceso Piloto Vencido</h2>' +
          '<p>Tu período de prueba gratuita terminó el <strong>' +
          expDate.toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'}) +
          '</strong>.<br>Para continuar usando NormaLis, contáctanos.</p>' +
          '<a class="npe-btn" href="mailto:hola@normalis.co">Contactar a NormaLis</a><br>' +
          '<a class="npe-back" href="login.html">Volver al inicio</a>';
        document.body.appendChild(overlay);
        sessionStorage.clear();
      });
      return;
    }
  }

  // ── Mostrar banner ──
  document.addEventListener('DOMContentLoaded', function() {
    var banner = document.createElement('div');
    banner.id = 'normalis-pilot-banner';
    var diasTxt = diasRestantes
      ? '<span class="npb-days">⏱ ' + diasRestantes + ' días restantes</span>'
      : '';
    banner.innerHTML =
      '🚀 <strong>Programa Piloto</strong> — Acceso de prueba gratuita ' +
      diasTxt +
      '<span class="npb-close" onclick="this.parentElement.remove();document.body.classList.remove(\'has-pilot-banner\')">×</span>';
    document.body.insertBefore(banner, document.body.firstChild);
    document.body.classList.add('has-pilot-banner');
  });
})();
