/* ═══════════════════════════════════════════════════════════
   NormaLis — normalis-pilot.js  v2.1
   Banner + guard para usuarios del programa piloto.
   Incluir con: <script src="normalis-pilot.js"></script>
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Leer sesión ──────────────────────────────────────────
  var uid        = sessionStorage.getItem('normalis_uid')            || '';
  var rol        = sessionStorage.getItem('normalis_rol')            || '';
  var expiresRaw = sessionStorage.getItem('normalis_expires')        || '';
  var diasRaw    = sessionStorage.getItem('normalis_dias_restantes') || '';

  // Sin sesión o no es piloto → salir sin hacer nada
  if (!uid || rol !== 'piloto') return;

  // ── Parsear expiración de forma segura ──────────────────
  var expDate = null;
  if (expiresRaw) {
    try {
      var parsed = new Date(expiresRaw);
      if (!isNaN(parsed.getTime())) expDate = parsed;
    } catch (_) { /* fecha inválida: ignorar */ }
  }

  // ── Días restantes de forma segura ──────────────────────
  var diasRestantes = null;
  if (diasRaw !== '' && diasRaw !== 'null') {
    var n = parseInt(diasRaw, 10);
    if (!isNaN(n) && n >= 0) diasRestantes = n;
  }

  // ── Inyectar CSS ─────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = ''
    + '#nls-pilot-banner{'
    + '  position:fixed;top:0;left:0;right:0;z-index:99999;'
    + '  background:linear-gradient(90deg,#f59e0b,#d97706);'
    + '  color:#fff;font-size:13px;font-weight:700;'
    + '  padding:10px 44px 10px 20px;'
    + '  display:flex;align-items:center;justify-content:center;gap:10px;'
    + '  box-shadow:0 2px 12px rgba(245,158,11,.4);'
    + '  animation:nlsBannerIn .4s ease;'
    + '  flex-wrap:wrap;text-align:center;'
    + '}'
    + '@keyframes nlsBannerIn{from{transform:translateY(-100%)}to{transform:translateY(0)}}'
    + '#nls-pilot-banner .nls-days{'
    + '  background:rgba(0,0,0,.2);border-radius:999px;'
    + '  padding:3px 12px;font-size:12px;white-space:nowrap;'
    + '}'
    + '#nls-pilot-banner .nls-close{'
    + '  position:absolute;right:14px;top:50%;transform:translateY(-50%);'
    + '  cursor:pointer;font-size:20px;opacity:.7;line-height:1;'
    + '  background:none;border:none;color:#fff;padding:4px;'
    + '}'
    + '#nls-pilot-banner .nls-close:hover{opacity:1;}'
    + 'body.has-pilot-banner .app{padding-top:40px!important;}'
    + 'body.has-pilot-banner .sidebar{top:40px!important;height:calc(100vh - 40px)!important;}'
    + 'body.has-pilot-banner #topbar{top:40px!important;}'
    + '#nls-pilot-expired{'
    + '  position:fixed;inset:0;z-index:999999;'
    + '  background:linear-gradient(135deg,#001A14,#002922);'
    + '  display:flex;flex-direction:column;align-items:center;justify-content:center;'
    + '  padding:40px;text-align:center;'
    + '}'
    + '#nls-pilot-expired .npe-icon{font-size:64px;margin-bottom:16px;}'
    + '#nls-pilot-expired h2{font-size:24px;font-weight:900;color:#e2f4f1;margin-bottom:10px;}'
    + '#nls-pilot-expired p{font-size:14px;color:#4DB6AC;max-width:400px;line-height:1.65;margin-bottom:26px;}'
    + '#nls-pilot-expired .npe-btn{'
    + '  background:linear-gradient(135deg,#00A896,#0ea5e9);'
    + '  color:#fff;border-radius:12px;padding:13px 28px;'
    + '  text-decoration:none;font-weight:700;font-size:14px;'
    + '  box-shadow:0 4px 20px rgba(0,168,150,.28);display:inline-block;'
    + '}'
    + '#nls-pilot-expired .npe-back{'
    + '  display:inline-block;margin-top:12px;'
    + '  background:transparent;border:1px solid rgba(255,255,255,.15);'
    + '  color:#4DB6AC;border-radius:12px;padding:10px 24px;'
    + '  text-decoration:none;font-size:13px;'
    + '}';
  document.head.appendChild(style);

  // ── Verificar si acceso está vencido ─────────────────────
  var isExpired = expDate ? (expDate < new Date()) : false;

  if (isExpired) {
    document.addEventListener('DOMContentLoaded', function () {
      var overlay = document.createElement('div');
      overlay.id = 'nls-pilot-expired';

      var fechaStr = expDate
        ? expDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'fecha desconocida';

      // DOM sin innerHTML de datos del usuario (prevención XSS)
      var icon = document.createElement('div');
      icon.className = 'npe-icon';
      icon.textContent = '🔒';

      var h2 = document.createElement('h2');
      h2.textContent = 'Acceso Piloto Vencido';

      var p = document.createElement('p');
      p.textContent = 'Tu período de prueba terminó el ' + fechaStr
        + '. Para continuar usando NormaLis, contáctanos.';

      var btnContact = document.createElement('a');
      btnContact.className = 'npe-btn';
      btnContact.href = 'mailto:fjfc1984@gmail.com';
      btnContact.textContent = 'Contactar a NormaLis';

      var br = document.createElement('br');

      var btnBack = document.createElement('a');
      btnBack.className = 'npe-back';
      btnBack.href = 'login.html';
      btnBack.textContent = 'Volver al inicio';

      overlay.appendChild(icon);
      overlay.appendChild(h2);
      overlay.appendChild(p);
      overlay.appendChild(btnContact);
      overlay.appendChild(br);
      overlay.appendChild(btnBack);

      document.body.appendChild(overlay);
      sessionStorage.clear();
    });
    return;
  }

  // ── Mostrar banner de días restantes ─────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var banner = document.createElement('div');
    banner.id = 'nls-pilot-banner';
    banner.setAttribute('role', 'status');

    var label = document.createElement('span');
    label.textContent = '🚀 Programa Piloto — Acceso de prueba gratuita';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'nls-close';
    closeBtn.setAttribute('aria-label', 'Cerrar banner');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', function () {
      banner.remove();
      document.body.classList.remove('has-pilot-banner');
    });

    banner.appendChild(label);

    if (diasRestantes !== null) {
      var chip = document.createElement('span');
      chip.className = 'nls-days';
      chip.textContent = '⏱ ' + diasRestantes
        + ' día' + (diasRestantes !== 1 ? 's' : '')
        + ' restante' + (diasRestantes !== 1 ? 's' : '');
      banner.appendChild(chip);
    }

    banner.appendChild(closeBtn);
    document.body.insertBefore(banner, document.body.firstChild);
    document.body.classList.add('has-pilot-banner');
  });

})();
